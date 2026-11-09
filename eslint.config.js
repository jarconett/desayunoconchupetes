// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      // Cargamos datos de Supabase dentro de efectos (patrón habitual)
      'react-hooks/set-state-in-effect': 'off',
      // Usamos la hora actual en el render para "lo próximo de hoy", semanas, etc.
      'react-hooks/purity': 'off',
      // Falso positivo con los enums de expo-notifications
      'import/namespace': 'off',
    },
  },
]);
