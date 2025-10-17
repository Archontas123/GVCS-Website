#!/usr/bin/env node
/**
 * Setup script to patch Module._load for schema-utils compatibility
 * This wraps schema-utils imports at runtime
 */

const Module = require('module');
const originalLoad = Module._load;

Module._load = function(request, parent) {
  const exports = originalLoad.apply(this, arguments);

  // Intercept schema-utils module loading
  if (request === 'schema-utils') {
    // Create a wrapper that handles all possible usage patterns
    const validate = exports.validate || exports.validateOptions || exports.default || exports;

    if (typeof validate === 'function') {
      // Make it callable as a function
      const wrapper = function(...args) {
        return validate.apply(this, args);
      };

      // Copy all properties
      Object.assign(wrapper, exports);

      // Ensure all export patterns work
      wrapper.validate = validate;
      wrapper.validateOptions = validate;
      wrapper.default = validate;

      return wrapper;
    }
  }

  return exports;
};

console.log('✓ schema-utils compatibility wrapper installed');
