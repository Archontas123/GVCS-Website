#!/usr/bin/env node
/**
 * Post-install fix for schema-utils validateOptions compatibility
 * This fixes the "validateOptions is not a function" error in webpack
 */

const fs = require('fs');
const path = require('path');

console.log('Running post-install compatibility fixes...');

function walkDirectory(dir, callback) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (file === 'schema-utils') {
        const indexPath = path.join(filePath, 'dist', 'index.js');
        if (fs.existsSync(indexPath)) {
          callback(indexPath);
        }
      } else if (file !== '.bin' && !file.startsWith('.')) {
        walkDirectory(filePath, callback);
      }
    }
  }
}

function findAndPatchAllSchemaUtils() {
  const nodeModulesPath = path.join(__dirname, 'node_modules');

  if (!fs.existsSync(nodeModulesPath)) {
    console.log('node_modules not found, skipping patches');
    return;
  }

  let patchCount = 0;

  walkDirectory(nodeModulesPath, (indexPath) => {
    try {
      let content = fs.readFileSync(indexPath, 'utf8');

      if (content.includes('// PATCHED: validateOptions alias')) {
        console.log(`✓ Already patched: ${path.relative(__dirname, indexPath)}`);
        return;
      }

      const patch = `
// PATCHED: validateOptions alias for webpack compatibility
if (typeof exports.validate === 'function') {
  exports.validateOptions = exports.validate;
}
`;
      content += patch;
      fs.writeFileSync(indexPath, content, 'utf8');
      console.log(`✓ Patched: ${path.relative(__dirname, indexPath)}`);
      patchCount++;
    } catch (error) {
      console.error(`✗ Failed to patch ${indexPath}:`, error.message);
    }
  });

  if (patchCount === 0) {
    console.log('No schema-utils modules found or all already patched');
  } else {
    console.log(`✓ Successfully patched ${patchCount} schema-utils module(s)`);
  }
}

// Run all patches
findAndPatchAllSchemaUtils();

console.log('Post-install fixes complete');
