// Patch script to fix schema-utils compatibility in fork-ts-checker-webpack-plugin
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules/fork-ts-checker-webpack-plugin/lib/ForkTsCheckerWebpackPlugin.js');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace the problematic line that calls schema_utils_1.default as a function
  // with code that handles both CommonJS and ES module exports
  content = content.replace(
    /schema_utils_1\.default\(ForkTsCheckerWebpackPluginOptions_json_1\.default, options, configuration\);/g,
    `const validate = schema_utils_1.default || schema_utils_1;
        validate(ForkTsCheckerWebpackPluginOptions_json_1.default, options, configuration);`
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched fork-ts-checker-webpack-plugin');
} catch (error) {
  console.error('Failed to patch fork-ts-checker-webpack-plugin:', error.message);
  process.exit(1);
}
