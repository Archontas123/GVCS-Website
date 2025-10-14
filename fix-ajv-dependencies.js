// Comprehensive fix script for ajv/ajv-keywords compatibility issues
// This script ensures all ajv-keywords modules use the correct ajv version

const fs = require('fs');
const path = require('path');

function findAndFixAjvKeywords(dir) {
  const fixes = [];

  function walkDir(currentPath) {
    try {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          // Skip if already in an ajv-keywords node_modules to avoid infinite recursion
          if (entry.name === 'node_modules' && currentPath.includes('ajv-keywords')) {
            continue;
          }

          // If this is an ajv-keywords directory, fix it
          if (entry.name === 'ajv-keywords') {
            fixAjvKeywordsModule(fullPath, fixes);
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

function fixAjvKeywordsModule(ajvKeywordsPath, fixes) {
  // Check if this ajv-keywords has the problematic import
  const typeofDefPath = path.join(ajvKeywordsPath, 'dist', 'definitions', 'typeof.js');

  if (!fs.existsSync(typeofDefPath)) {
    return;
  }

  try {
    let content = fs.readFileSync(typeofDefPath, 'utf8');

    // Check if it has the problematic import
    if (content.includes('ajv/dist/compile/codegen')) {
      // Replace the import with a compatible version
      const fixedContent = content.replace(
        /const codegen_1 = require\("ajv\/dist\/compile\/codegen"\);/g,
        `// Patched: ajv v6 doesn't have dist/compile/codegen
const codegen_1 = {
  _: (strings, ...values) => {
    return strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
  },
  str: JSON.stringify,
  nil: null,
  Code: class {
    constructor() { this.code = ''; }
    toString() { return this.code; }
  }
};`
      );

      fs.writeFileSync(typeofDefPath, fixedContent, 'utf8');
      fixes.push(typeofDefPath);
      console.log('Fixed ajv-keywords at:', typeofDefPath);
    }
  } catch (error) {
    console.error('Error fixing', typeofDefPath, ':', error.message);
  }
}

console.log('Scanning for ajv-keywords modules...');
const nodeModulesPath = path.join(__dirname, 'node_modules');

if (!fs.existsSync(nodeModulesPath)) {
  console.log('node_modules not found. This script should run after npm install.');
  process.exit(0);
}

const fixes = findAndFixAjvKeywords(nodeModulesPath);

if (fixes.length > 0) {
  console.log(`Successfully fixed ${fixes.length} ajv-keywords module(s)`);
  fixes.forEach(fix => console.log('  -', fix));
} else {
  console.log('No ajv-keywords modules needed fixing (or already fixed)');
}

console.log('ajv dependency fix completed');
