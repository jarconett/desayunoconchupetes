// Configuración dinámica a partir de app.json.
// (Se hace aquí y no en app.json para no chocar con el projectId que añade
// `eas init` en app.json en el PC de la asesora.)
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
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

  // Firebase (notificaciones push en Android): si existe google-services.json se usa.
  // Pasos para obtenerlo: README > "Notificaciones push en Android (Firebase)".
  if (fs.existsSync(path.join(__dirname, 'google-services.json'))) {
    config.android = { ...config.android, googleServicesFile: './google-services.json' };
  }
  return config;
};
