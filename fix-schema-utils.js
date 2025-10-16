// Fix script for schema-utils compatibility issues
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Schema Utils Compatibility Fix ===');

function findSchemaUtilsModules(dir) {
  const fixes = [];
  const schemaUtilsPaths = [];

  // Use find command to locate all schema-utils directories
  try {
    const result = execSync('find node_modules -type d -name "schema-utils" 2>/dev/null || true', {
      cwd: dir,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    });

    const paths = result.trim().split('\n').filter(p => p);
    console.log(`Found ${paths.length} schema-utils installation(s)`);

    paths.forEach(relativePath => {
      const fullPath = path.join(dir, relativePath);
      console.log(`  - ${relativePath}`);
      schemaUtilsPaths.push(fullPath);
    });
  } catch (error) {
    console.log('Error finding schema-utils modules:', error.message);
    // Fall back to direct path
    const directPath = path.join(dir, 'node_modules', 'schema-utils');
    if (fs.existsSync(directPath)) {
      schemaUtilsPaths.push(directPath);
    }
  }

  schemaUtilsPaths.forEach(schemaUtilsPath => {
    fixSchemaUtilsModule(schemaUtilsPath, fixes);
  });

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
      console.log(`  Checking index.js at: ${indexPath}`);

      // Check if already patched
      if (content.includes('// PATCHED: schema-utils index')) {
        console.log('  Already patched, skipping');
      } else {
        // Add validateOptions alias at the end of the file - use exports.validate which is already defined
        const fixedContent = content + `

// PATCHED: schema-utils index - Add validateOptions alias
exports.validateOptions = exports.validate;
if (!exports.default) {
  exports.default = exports.validate;
}
`;

        fs.writeFileSync(indexPath, fixedContent, 'utf8');
        fixes.push(indexPath);
        console.log('  ✓ Fixed index.js - added validateOptions export');
      }
    } catch (error) {
      console.error('  ✗ Error fixing index.js:', error.message);
    }
  } else {
    console.log(`  ✗ index.js not found at: ${indexPath}`);
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
