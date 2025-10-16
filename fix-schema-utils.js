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
  const indexPath = path.join(schemaUtilsPath, 'dist', 'index.js');

  // Fix validate.js
  if (fs.existsSync(validatePath)) {
    try {
      let content = fs.readFileSync(validatePath, 'utf8');

      // Check if already patched
      if (!content.includes('// PATCHED: schema-utils compatibility')) {
        // Prepend the compatibility fix
        const fixedContent = `"use strict";
// PATCHED: schema-utils compatibility fix
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;

${content.replace(/"use strict";\s*Object\.defineProperty\(exports, "__esModule", \{ value: true \}\);\s*(exports\.validate = validate;)?/g, '')}

// Ensure the function is exported correctly
if (typeof validate === 'function') {
  module.exports = validate;
  module.exports.default = validate;
  module.exports.validate = validate;
}
`;

        fs.writeFileSync(validatePath, fixedContent, 'utf8');
        fixes.push(validatePath);
        console.log('Fixed validate.js at:', validatePath);
      }
    } catch (error) {
      console.error('Error fixing', validatePath, ':', error.message);
    }
  }

  // Fix index.js
  if (fs.existsSync(indexPath)) {
    try {
      let content = fs.readFileSync(indexPath, 'utf8');

      // Check if already patched
      if (!content.includes('// PATCHED: schema-utils index')) {
        // Ensure proper exports
        const fixedContent = content.replace(
          /exports\.validate = validate_1\.validate;/g,
          `// PATCHED: schema-utils index
exports.validate = validate_1.validate || validate_1.default || validate_1;
exports.default = exports.validate;`
        );

        if (fixedContent !== content) {
          fs.writeFileSync(indexPath, fixedContent, 'utf8');
          fixes.push(indexPath);
          console.log('Fixed index.js at:', indexPath);
        }
      }
    } catch (error) {
      console.error('Error fixing', indexPath, ':', error.message);
    }
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
