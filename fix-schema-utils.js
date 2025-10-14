// Fix schema-utils compatibility issue
// The problem: webpack loaders are trying to use schema-utils with incompatible exports

const fs = require('fs');
const path = require('path');

console.log('=== Fixing schema-utils compatibility issues ===');

// Find all webpack loaders that use schema-utils
const nodeModulesPath = path.join(__dirname, 'node_modules');

function findAndFixSchemaUtils(dir, depth = 0) {
  if (depth > 10) return; // Prevent infinite recursion

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Look for schema-utils directories
        if (entry.name === 'schema-utils') {
          fixSchemaUtilsPackage(fullPath);
        } else if (entry.name === 'node_modules' || depth === 0) {
          findAndFixSchemaUtils(fullPath, depth + 1);
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
}

function fixSchemaUtilsPackage(schemaUtilsPath) {
  console.log('Found schema-utils at:', schemaUtilsPath);

  // Fix the main export file
  const distPath = path.join(schemaUtilsPath, 'dist');
  const indexPath = path.join(distPath, 'index.js');

  if (!fs.existsSync(indexPath)) {
    console.log('  No dist/index.js found, skipping');
    return;
  }

  try {
    let content = fs.readFileSync(indexPath, 'utf8');

    // Check if it needs fixing
    if (content.includes('// PATCHED FOR COMPATIBILITY')) {
      console.log('  Already patched');
      return;
    }

    // Add compatibility layer at the end
    const patch = `

// PATCHED FOR COMPATIBILITY
// Ensure both default and named exports work
if (typeof module !== 'undefined' && module.exports) {
  const validate = module.exports.validate || module.exports;
  module.exports = validate;
  module.exports.validate = validate;
  module.exports.default = validate;
}
`;

    content += patch;
    fs.writeFileSync(indexPath, content, 'utf8');
    console.log('  Successfully patched schema-utils');
  } catch (error) {
    console.error('  Error patching schema-utils:', error.message);
  }
}

if (!fs.existsSync(nodeModulesPath)) {
  console.log('node_modules not found. Run this after npm install.');
  process.exit(0);
}

findAndFixSchemaUtils(nodeModulesPath);
console.log('=== schema-utils fix completed ===');
