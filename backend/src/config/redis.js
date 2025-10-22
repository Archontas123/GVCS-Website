/**
 * Redis Client Configuration
 * Provides a singleton Redis client instance with automatic connection handling
 */

const Redis = require('ioredis');

let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    };

    redisClient = new Redis(redisConfig);

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });
  }

  return redisClient;
}

module.exports = getRedisClient();
