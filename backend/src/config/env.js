/**
 * @fileoverview Centralized environment loader for the backend.
 * Ensures that every backend entry point consumes the same .env file
 * so that generated tokens and configuration remain consistent.
 */

const path = require('path');
const dotenv = require('dotenv');

/**
 * Resolve the environment file location. Allows overriding via ENV_FILE_PATH
 * to support alternate deploy configurations while keeping a single source
 * of truth for local development.
 */
const resolvedEnvPath = process.env.ENV_FILE_PATH
  ? path.resolve(process.env.ENV_FILE_PATH)
  : path.resolve(__dirname, '../../.env');

/**
 * Load environment variables from the resolved path when the file is present.
 * Ignore missing-file errors so production deployments can rely purely on
 * process environment variables without shipping an .env file.
 */
let result;
try {
  result = dotenv.config({ path: resolvedEnvPath });
} catch (error) {
  // Surface unexpected errors immediately
  throw error;
}

if (result.error && result.error.code !== 'ENOENT') {
  throw result.error;
}

module.exports = {
  envPath: resolvedEnvPath,
};
