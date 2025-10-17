#!/usr/bin/env node
/**
 * Patch webpack loaders to handle schema-utils compatibility
 */

const fs = require('fs');
const path = require('path');

console.log('Patching webpack loaders for schema-utils compatibility...');

function patchFile(filePath, searchPattern, replacement, description) {
  if (!fs.existsSync(filePath)) {
    console.log(`  ⊘ ${description}: File not found`);
    return false;
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8');

    if (content.includes('// PATCHED:')) {
      console.log(`  ✓ ${description}: Already patched`);
      return true;
    }

    // Replace schema-utils imports with a wrapped version
    const originalContent = content;

    // Look for schema-utils imports
    if (content.includes('schema-utils')) {
      content = content.replace(
        /const\s+(\w+)\s*=\s*require\(['"]schema-utils['"]\);?/g,
        `// PATCHED: schema-utils compatibility wrapper
const schemaUtilsModule = require('schema-utils');
const $1 = typeof schemaUtilsModule === 'function'
  ? schemaUtilsModule
  : (schemaUtilsModule.validate || schemaUtilsModule.validateOptions || schemaUtilsModule.default || schemaUtilsModule);`
      );

      content = content.replace(
        /const\s+{\s*validate\s*}\s*=\s*require\(['"]schema-utils['"]\);?/g,
        `// PATCHED: schema-utils compatibility wrapper
const schemaUtilsModule = require('schema-utils');
const validate = typeof schemaUtilsModule === 'function'
  ? schemaUtilsModule
  : (schemaUtilsModule.validate || schemaUtilsModule.validateOptions || schemaUtilsModule.default || schemaUtilsModule);`
      );
    }

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`  ✓ ${description}: Patched`);
      return true;
    } else {
      console.log(`  - ${description}: No changes needed`);
      return false;
    }
  } catch (error) {
    console.error(`  ✗ ${description}: Error -`, error.message);
    return false;
  }
}

function patchWebpackLoaders() {
  const nodeModulesPath = path.join(__dirname, 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    console.log('node_modules not found, skipping');
    return;
  }

  let patchCount = 0;

  // Common webpack loaders that use schema-utils
  const loadersToPath = [
    'css-loader',
    'sass-loader',
    'style-loader',
    'file-loader',
    'url-loader',
    'babel-loader',
    'mini-css-extract-plugin'
  ];

  loadersToPath.forEach(loaderName => {
    const loaderPath = path.join(nodeModulesPath, loaderName);

    if (fs.existsSync(loaderPath)) {
      // Find all .js files in the loader directory
      const files = findJsFiles(loaderPath);
      files.forEach(file => {
        const relativePath = path.relative(__dirname, file);
        if (patchFile(file, '', '', relativePath)) {
          patchCount++;
        }
      });
    }
  });

  console.log(`Patched ${patchCount} webpack loader file(s)`);
}

function findJsFiles(dir, files = []) {
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir);

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (entry !== 'node_modules' && entry !== 'test' && entry !== 'tests' && !entry.startsWith('.')) {
        findJsFiles(fullPath, files);
      }
    } else if (entry.endsWith('.js') && !entry.includes('.min.')) {
      files.push(fullPath);
    }
  }

  return files;
}

patchWebpackLoaders();

console.log('Webpack loader patching complete');
