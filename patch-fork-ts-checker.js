// Patch script to fix schema-utils compatibility in fork-ts-checker-webpack-plugin
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules/fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPlugin.js');

try {
  if (!fs.existsSync(filePath)) {
    console.log('fork-ts-checker-webpack-plugin not found, skipping patch');
    process.exit(0);
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if already patched
  if (content.includes('// PATCHED')) {
    console.log('fork-ts-checker-webpack-plugin already patched');
    process.exit(0);
  }

  // Find the line where validate is called and replace it
  // The issue is that schema_utils_1.default is being called as validate()
  // but in schema-utils v3, the validate function is a named export
  const replaced = content.replace(
    /(\s+)validate\(ForkTsCheckerWebpackPluginOptions_json_1\.default, options, configuration\);/g,
    `$1// PATCHED: Fix for schema-utils v3 compatibility
$1const validateFn = (typeof validate === 'function') ? validate :
$1  (schema_utils_1.validate || schema_utils_1.default?.validate || schema_utils_1.default);
$1if (typeof validateFn === 'function') {
$1  validateFn(ForkTsCheckerWebpackPluginOptions_json_1.default, options, configuration);
$1}`
  );

  if (content === replaced) {
    console.log('Warning: Pattern not found in fork-ts-checker-webpack-plugin. File may have changed.');
    // Don't exit with error, just skip
    process.exit(0);
  }

  fs.writeFileSync(filePath, replaced, 'utf8');
  console.log('Successfully patched fork-ts-checker-webpack-plugin');
} catch (error) {
  console.error('Failed to patch fork-ts-checker-webpack-plugin:', error.message);
  // Don't fail the build if patching fails
  console.log('Continuing despite patch failure...');
  process.exit(0);
}
