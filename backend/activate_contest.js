const knex = require('knex');
const config = require('./src/config/database');

const db = knex(config.development);

async function activateContest() {
  try {
    const now = new Date();
    const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours from now

    await db('contests')
      .where('registration_code', 'SPRING24')
      .update({
        is_active: true,
        start_time: now.toISOString(),
        end_time: endTime.toISOString()
      });

    console.log('Contest SPRING24 activated and started successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error activating contest:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

activateContest();