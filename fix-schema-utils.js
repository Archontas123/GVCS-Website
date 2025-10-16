// Fix script for schema-utils compatibility issues
const fs = require('fs');
const path = require('path');

console.log('=== Schema Utils Compatibility Fix ===');

function findSchemaUtilsModules(dir) {
  const fixes = [];

  function walkDir(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          if (entry.name === 'schema-utils') {
            fixSchemaUtilsModule(fullPath, fixes);
          } else if (entry.name === 'node_modules' || !currentPath.includes('node_modules')) {
            walkDir(fullPath);
          }
        }
      }
    } catch (error) {
      // Silently skip directories we can't read
    }
  }

  walkDir(dir);
  return fixes;
}

function fixSchemaUtilsModule(schemaUtilsPath, fixes) {
  const validatePath = path.join(schemaUtilsPath, 'dist', 'validate.js');

  if (!fs.existsSync(validatePath)) {
    return;
  }

  try {
    let content = fs.readFileSync(validatePath, 'utf8');

    // Check if already patched
    if (content.includes('// PATCHED: schema-utils compatibility')) {
      return;
    }

    // Fix the export issue
    if (content.includes('schema_utils_1.default') || content.includes('exports.default')) {
      const fixedContent = `// PATCHED: schema-utils compatibility fix
${content}

// Ensure both named and default exports work
if (typeof exports.default === 'function') {
  module.exports = exports.default;
  module.exports.default = exports.default;
  module.exports.validate = exports.default;
}
`;

      fs.writeFileSync(validatePath, fixedContent, 'utf8');
      fixes.push(validatePath);
      console.log('Fixed schema-utils at:', validatePath);
    }
  } catch (error) {
    console.error('Error fixing', validatePath, ':', error.message);
  }
}

const nodeModulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('node_modules not found. This script should run after npm install.');
  process.exit(0);
}

const fixes = findSchemaUtilsModules(nodeModulesPath);

if (fixes.length > 0) {
  console.log(`Successfully fixed ${fixes.length} schema-utils module(s)`);
  fixes.forEach(fix => console.log('  -', fix));
} else {
  console.log('No schema-utils modules needed fixing (or already fixed)');
}

console.log('=== Schema Utils Fix Complete ===');
