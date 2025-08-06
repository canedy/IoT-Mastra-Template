import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

// Import workflows
import { iotMonitoringWorkflow } from './workflows/scheduled-monitoring.js';

// Import agents
import { iotCoordinatorAgent } from './agents/iot-coordinator.js';

// Import scheduling functions
import { initializeScheduledMonitoring } from './workflows/scheduled-monitoring.js';

// Configure storage based on environment
const storageUrl = process.env.DATA_STORE_TYPE === 'file' 
  ? 'file:../mastra-iot.db' 
  : ':memory:';

export const mastra = new Mastra({
  workflows: { 
    iotMonitoringWorkflow
  },
  agents: { 
    iotCoordinatorAgent 
  },
  storage: new LibSQLStore({
    url: storageUrl,
  }),
  logger: new PinoLogger({
    name: 'Mastra-IoT',
    level: 'info',
  }),
});

// Initialize scheduled monitoring if enabled
console.log('🔍 Checking ENABLE_SCHEDULING environment variable...');
console.log(`   ENABLE_SCHEDULING = "${process.env.ENABLE_SCHEDULING}"`);
if (process.env.ENABLE_SCHEDULING === 'true') {
  console.log('🚀 ENABLE_SCHEDULING is true, initializing IoT scheduled monitoring...');
  initializeScheduledMonitoring(mastra);
} else {
  console.log('⏸️  ENABLE_SCHEDULING is not true, skipping scheduled monitoring');
}

