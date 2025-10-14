// Script to completely disable fork-ts-checker-webpack-plugin
// This prevents the schema-utils compatibility error
const fs = require('fs');
const path = require('path');

const webpackConfigPath = path.join(__dirname, 'node_modules/react-scripts/config/webpack.config.js');

console.log('=== Disabling fork-ts-checker-webpack-plugin ===');
console.log('Looking for webpack config at:', webpackConfigPath);

try {
  if (!fs.existsSync(webpackConfigPath)) {
    console.log('webpack.config.js not found, skipping');
    process.exit(0);
  }

  console.log('File found, reading content...');
  let content = fs.readFileSync(webpackConfigPath, 'utf8');

  // Check if already patched
  if (content.includes('// DISABLED: fork-ts-checker-webpack-plugin')) {
    console.log('webpack.config.js already patched');
    process.exit(0);
  }

  // Find the fork-ts-checker-webpack-plugin instantiation and comment it out
  // Look for: new ForkTsCheckerWebpackPlugin({
  const lines = content.split('\n');
  let modified = false;
  let inForkTsChecker = false;
  let braceCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Start of ForkTsCheckerWebpackPlugin
    if (line.includes('new ForkTsCheckerWebpackPlugin') || line.includes('new ForkTsCheckerWebpack Plugin')) {
      console.log(`Found ForkTsCheckerWebpackPlugin at line ${i + 1}`);
      lines[i] = '        // DISABLED: fork-ts-checker-webpack-plugin (schema-utils compatibility issue)\n        // ' + line;
      inForkTsChecker = true;
      braceCount = (line.match(/{/g) || []).length - (line.match(/}/g) || []).length;
      modified = true;
      continue;
    }

    // Comment out lines that are part of the ForkTsCheckerWebpackPlugin config
    if (inForkTsChecker) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      lines[i] = '        // ' + line;

      if (braceCount <= 0) {
        inForkTsChecker = false;
        console.log(`Disabled ForkTsCheckerWebpackPlugin until line ${i + 1}`);
      }
    }
  }

  if (!modified) {
    console.log('Warning: ForkTsCheckerWebpackPlugin not found in webpack.config.js');
    console.log('It may have already been removed or the structure changed.');
    process.exit(0);
  }

  content = lines.join('\n');

  console.log('Writing modified webpack config...');
  fs.writeFileSync(webpackConfigPath, content, 'utf8');
  console.log('Successfully disabled fork-ts-checker-webpack-plugin');
  console.log('=== Patch Complete ===');
} catch (error) {
  console.error('Failed to patch webpack.config.js:', error.message);
  console.error('Stack trace:', error.stack);
  console.log('Continuing despite patch failure...');
  process.exit(0);
}
