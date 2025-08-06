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
if (process.env.ENABLE_SCHEDULING === 'true') {
  console.log('🚀 Initializing IoT scheduled monitoring...');
  initializeScheduledMonitoring(mastra);
}

