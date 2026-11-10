// Configuración dinámica a partir de app.json.
// (Se hace aquí y no en app.json para no chocar con el projectId que añade
// `eas init` en app.json en el PC de la asesora.)
const fs = require('fs');
const path = require('path');

/**
 * Versión instalada (se muestra en Perfil/Ajustes):
 * 1) build-info.json, que escribe crear-apk.ps1 antes de compilar en Expo
 *    (en los servidores de Expo no hay historial de git);
 * 2) si no existe, se consulta git directamente (versión web en este PC).
 */
function buildInfo() {
  const file = path.join(__dirname, 'build-info.json');
  if (fs.existsSync(file)) {
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      // archivo dañado: se intenta con git
    }
  }
  try {
    const { execSync } = require('child_process');
    const git = (args) => execSync(`git ${args}`, { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return { commit: git('rev-parse --short HEAD'), commitDate: git('log -1 --format=%cI') };
  } catch {
    return {};
  }
}

// Versión que se muestra en la app (Perfil, Ajustes y pantalla de acceso) y en Android/iOS.
// Se define aquí y no en app.json para no chocar con el app.json del PC de la asesora.
const APP_VERSION = '1.1';

module.exports = ({ config }) => {
  config.version = APP_VERSION;
  config.extra = { ...config.extra, buildInfo: { ...buildInfo(), builtAt: new Date().toISOString() } };

  // Notificaciones: icono en silueta blanca (Android solo usa la transparencia)
  // y color de la marca para el icono y el nombre de la app.
  config.plugins = (config.plugins ?? []).map((p) => {
    const name = Array.isArray(p) ? p[0] : p;
    if (name !== 'expo-notifications') return p;
    return [
      'expo-notifications',
      { icon: './assets/images/notification-icon.png', color: '#8C7BB8', defaultChannel: 'avisos' },
    ];
  });

  // Audio (ruido blanco): reproducción en segundo plano, sin micrófono
  if (!config.plugins.some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-audio')) {
    config.plugins.push(['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: true }]);
  }

  // Firebase (notificaciones push en Android): si existe google-services.json se usa.
  // Pasos para obtenerlo: README > "Notificaciones push en Android (Firebase)".
  if (fs.existsSync(path.join(__dirname, 'google-services.json'))) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  return config;
};
