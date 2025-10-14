// Patch script to fix schema-utils compatibility in fork-ts-checker-webpack-plugin
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules/fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPlugin.js');

console.log('=== Fork-TS-Checker Patch Script ===');
console.log('Looking for file at:', filePath);

try {
  if (!fs.existsSync(filePath)) {
    console.log('fork-ts-checker-webpack-plugin not found, skipping patch');
    process.exit(0);
  }

  console.log('File found, reading content...');
  let content = fs.readFileSync(filePath, 'utf8');
  console.log('File size:', content.length, 'bytes');

  // Check if already patched
  if (content.includes('// PATCHED:')) {
    console.log('fork-ts-checker-webpack-plugin already patched');
    process.exit(0);
  }

  // Debug: Show lines around the problematic area
  const lines = content.split('\n');
  console.log('Total lines in file:', lines.length);

  // Find and show the problematic lines
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('schema_utils_1') && lines[i].includes('ForkTsCheckerWebpackPluginOptions_json_1')) {
      console.log(`Found problematic line at ${i + 1}:`, lines[i].trim());
    }
  }

  let replaced = content;
  let patchCount = 0;

  // Pattern 1: Direct call to schema_utils_1.default() - line 31 and 34 from error
  // This pattern matches: schema_utils_1.default(schema, options/this.options, config);
  if (replaced.includes('schema_utils_1.default(ForkTsCheckerWebpackPluginOptions_json_1.default')) {
    console.log('Applying Pattern 1: Direct schema_utils_1.default() call');
    const before = replaced;

    // Replace both variants: with 'options' and with 'this.options'
    replaced = replaced.replace(
      /schema_utils_1\.default\(ForkTsCheckerWebpackPluginOptions_json_1\.default, (options|this\.options), configuration\);/g,
      (match, optionsVar) => {
        patchCount++;
        return `// PATCHED: Fix for schema-utils v3 compatibility
        (function() {
            const validateFn = schema_utils_1.validate ||
                             (schema_utils_1.default && schema_utils_1.default.validate) ||
                             schema_utils_1.default;
            if (typeof validateFn === 'function') {
                validateFn(ForkTsCheckerWebpackPluginOptions_json_1.default, ${optionsVar}, configuration);
            } else {
                console.warn('schema-utils validate function not found, skipping validation');
            }
        })();`;
      }
    );

    if (before !== replaced) {
      console.log(`Pattern 1 applied successfully (${patchCount} replacement(s))`);
    }
  }

  // Pattern 2: Call to validate() function - line 32 from previous error
  if (replaced.includes('validate(ForkTsCheckerWebpackPluginOptions_json_1.default')) {
    console.log('Applying Pattern 2: validate() function call');
    const before = replaced;
    replaced = replaced.replace(
      /(\s+)validate\(ForkTsCheckerWebpackPluginOptions_json_1\.default, options, configuration\);/g,
      `$1// PATCHED: Fix for schema-utils v3 compatibility
$1const validateFn = (typeof validate === 'function') ? validate :
$1  (schema_utils_1.validate || (schema_utils_1.default && schema_utils_1.default.validate) || schema_utils_1.default);
$1if (typeof validateFn === 'function') {
$1  validateFn(ForkTsCheckerWebpackPluginOptions_json_1.default, options, configuration);
$1} else {
$1  console.warn('schema-utils validate function not found, skipping validation');
$1}`
    );
    if (before !== replaced) {
      patchCount++;
      console.log('Pattern 2 applied successfully');
    }
  }

  if (patchCount === 0) {
    console.log('Warning: No matching patterns found in fork-ts-checker-webpack-plugin.');
    console.log('File may have already been fixed or has a different structure.');
    console.log('Dumping first 50 lines for debugging:');
    console.log(lines.slice(0, 50).map((l, i) => `${i + 1}: ${l}`).join('\n'));
    process.exit(0);
  }

  console.log('Writing patched content back to file...');
  fs.writeFileSync(filePath, replaced, 'utf8');
  console.log(`Successfully patched fork-ts-checker-webpack-plugin (${patchCount} location(s))`);
  console.log('=== Patch Complete ===');
} catch (error) {
  console.error('Failed to patch fork-ts-checker-webpack-plugin:', error.message);
  console.error('Stack trace:', error.stack);
  // Don't fail the build if patching fails
  console.log('Continuing despite patch failure...');
  process.exit(0);
}
