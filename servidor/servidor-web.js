// Servidor web mínimo (sin dependencias) para alojar la app en este PC.
// Sirve la carpeta dist/ generada con `npx expo export --platform web`
// y devuelve index.html para cualquier ruta de la app (SPA).
//
// Uso: node servidor/servidor-web.js [puerto]

const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const os = require('os');

const PUERTO = Number(process.argv[2] || process.env.PUERTO || 8080);
const RAIZ = path.resolve(__dirname, '..', 'dist');
const INDEX = path.join(RAIZ, 'index.html');

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};
const COMPRIMIBLES = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt', '.map', '.webmanifest']);

if (!fs.existsSync(INDEX)) {
  console.error(`No existe ${INDEX}. Genera la web primero: npx expo export --platform web`);
  process.exit(1);
}

function enviar(req, res, archivo, estado = 200) {
  const ext = path.extname(archivo).toLowerCase();
  const esIndex = archivo === INDEX;
  const cabeceras = {
    'Content-Type': TIPOS[ext] || 'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // index.html siempre fresco; el resto lleva hash en el nombre y se puede cachear
    'Cache-Control': esIndex ? 'no-cache' : 'public, max-age=604800',
  };
  const gzip = COMPRIMIBLES.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
  if (gzip) {
    cabeceras['Content-Encoding'] = 'gzip';
    cabeceras['Vary'] = 'Accept-Encoding';
  }
  res.writeHead(estado, cabeceras);
  if (req.method === 'HEAD') return res.end();
  const flujo = fs.createReadStream(archivo);
  flujo.on('error', () => res.destroy());
  (gzip ? flujo.pipe(zlib.createGzip()) : flujo).pipe(res);
}

const servidor = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const archivo = path.resolve(RAIZ, '.' + ruta);
  // Evitar salir de la carpeta dist/
  if (archivo !== RAIZ && !archivo.startsWith(RAIZ + path.sep)) {
    res.writeHead(403);
    return res.end();
  }
  fs.stat(archivo, (err, st) => {
    if (!err && st.isFile()) return enviar(req, res, archivo);
    // Recurso con extensión inexistente -> 404; cualquier otra ruta -> la app
    if (path.extname(ruta)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('No encontrado');
    }
    enviar(req, res, INDEX);
  });
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`El puerto ${PUERTO} ya está en uso. ¿Hay otra ventana de la app abierta?`);
  } else {
    console.error(e);
  }
  process.exit(1);
});

servidor.listen(PUERTO, '0.0.0.0', () => {
  console.log(`App servida en http://localhost:${PUERTO}`);
  for (const lista of Object.values(os.networkInterfaces())) {
    for (const i of lista || []) {
      if (i.family === 'IPv4' && !i.internal) console.log(`  En tu red local: http://${i.address}:${PUERTO}`);
    }
  }
});
