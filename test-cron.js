import cron from 'node-cron';

console.log('Starting cron test script...');
console.log(`Current time: ${new Date().toISOString()}`);

// Create a simple cron job that runs every minute
const task = cron.schedule('* * * * *', () => {
  const now = new Date();
  console.log('================================');
  console.log(`🎯 CRON JOB TRIGGERED!`);
  console.log(`   Time: ${now.toISOString()}`);
  console.log(`   Local: ${now.toLocaleString()}`);
  console.log(`   Unix: ${now.getTime()}`);
  console.log('================================');
});

// Start the task
task.start();
console.log('✅ Cron job scheduled to run every minute');
console.log('   Waiting for cron to trigger...');

// Keep the script running
process.on('SIGINT', () => {
  console.log('\nStopping cron job...');
  task.stop();
  process.exit();
});