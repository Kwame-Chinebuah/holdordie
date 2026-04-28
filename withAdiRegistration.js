const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withAdiRegistration(config) {
  return withDangerousMod(config, [
    'android',
    (config) => {
      const src = path.join(
        config.modRequest.projectRoot,
        'assets',
        'adi-registration.properties'
      );
      const destDir = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'src',
        'main',
        'assets'
      );
      const dest = path.join(destDir, 'adi-registration.properties');

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        console.log('✓ adi-registration.properties copied successfully');
      } else {
        console.warn('⚠ adi-registration.properties not found at:', src);
      }

      return config;
    },
  ]);
};
