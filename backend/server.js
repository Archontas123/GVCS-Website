#!/usr/bin/env node

/**
 * @fileoverview Main entry point for the Programming Contest Platform API server.
 * This file serves as a simple bootstrap that delegates all server initialization
 * and configuration to the main server implementation in the src/ directory.
 * 
 * @module server
 * @requires ./src/server
 * @author Programming Contest Platform Team
 * @version 1.5.0
 */

/**
 * Bootstrap the server by requiring the main server implementation.
 * All server configuration, middleware setup, routing, and initialization
 * is handled in the src/server.js file.
 */
require('./src/server');