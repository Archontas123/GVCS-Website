// Fix webpack plugins that call validateOptions
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Webpack Plugins validateOptions Fix ===');

// Find all webpack plugin files that might use validateOptions
const pluginsToFix = [
  'mini-css-extract-plugin',
  'terser-webpack-plugin',
  'css-minimizer-webpack-plugin',
  'html-webpack-plugin'
];

let totalFixes = 0;

pluginsToFix.forEach(pluginName => {
  const pluginPath = path.join(__dirname, 'node_modules', pluginName);

  if (!fs.existsSync(pluginPath)) {
    console.log(`${pluginName}: not installed, skipping`);
    return;
  }

  console.log(`\nChecking ${pluginName}...`);

  try {
    // Find all .js files in the plugin's dist folder
    const distPath = path.join(pluginPath, 'dist');
    if (!fs.existsSync(distPath)) {
      console.log(`  No dist folder found`);
      return;
    }

    const files = fs.readdirSync(distPath).filter(f => f.endsWith('.js'));

    files.forEach(file => {
      const filePath = path.join(distPath, file);
      let content = fs.readFileSync(filePath, 'utf8');

      // Check if file uses validateOptions from schema-utils
      if (content.includes('validateOptions') && content.includes('schema-utils')) {

        // Check if already patched
        if (content.includes('// PATCHED: validateOptions wrapper')) {
          return;
        }

        // Pattern 1: const { validateOptions } = require('schema-utils');
        const destructurePattern = /const\s*{\s*validateOptions\s*}\s*=\s*require\(['"]schema-utils['"]\);?/g;
        if (destructurePattern.test(content)) {
          content = content.replace(
            destructurePattern,
            `// PATCHED: validateOptions wrapper
const schemaUtils = require('schema-utils');
const validateOptions = schemaUtils.validateOptions || schemaUtils.validate || schemaUtils.default || schemaUtils;`
          );

          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`  ✓ Fixed ${file} (destructure pattern)`);
          totalFixes++;
          return;
        }

        // Pattern 2: validateOptions = require('schema-utils').validateOptions
        const directPattern = /(\w+)\s*=\s*require\(['"]schema-utils['"]\)\.validateOptions;?/g;
        if (directPattern.test(content)) {
          content = content.replace(
            directPattern,
            (match, varName) => {
              return `// PATCHED: validateOptions wrapper
const schemaUtils_temp = require('schema-utils');
${varName} = schemaUtils_temp.validateOptions || schemaUtils_temp.validate || schemaUtils_temp.default || schemaUtils_temp;`;
            }
          );

          fs.writeFileSync(filePath, content, 'utf8');
          console.log(`  ✓ Fixed ${file} (direct pattern)`);
          totalFixes++;
        }
      }
    });

  } catch (error) {
    console.error(`  Error fixing ${pluginName}:`, error.message);
  }
});

console.log(`\n=== Fixed ${totalFixes} webpack plugin file(s) ===`);
