/**
 * Comprehensive Testing Examples for IoT Integration Template
 * 
 * This file demonstrates how to test all components of the template
 * Run with: pnpm tsx examples/test-setup.ts
 */

import { mastra } from '../src/mastra/index.js';

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
};

const log = {
  success: (msg: string) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg: string) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg: string) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  warn: (msg: string) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
};

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test 1: MQTT Connection
 */
async function testMqttConnection() {
  log.info('Testing MQTT Connection...');
  
  const connectionTool = mastra.getTool('mqtt-connection');
  if (!connectionTool) {
    log.error('MQTT Connection tool not found');
    return false;
  }

  // Test connection
  const result = await connectionTool.execute({
    context: {
      action: 'connect',
      config: {
        // Will use environment variables if not specified
        broker_url: process.env.MQTT_BROKER_URL || 'wss://broker.hivemq.com:8884/mqtt',
      }
    }
  });

  if (result.success) {
    log.success(`Connected to broker: ${result.details?.broker_url}`);
    
    // Test status check
    const statusResult = await connectionTool.execute({
      context: { action: 'status' }
    });
    
    if (statusResult.success) {
      log.success('Connection status verified');
    }
    
    return true;
  } else {
    log.error(`Connection failed: ${result.status}`);
    return false;
  }
}

/**
 * Test 2: Subscribe and Publish
 */
async function testPubSub() {
  log.info('Testing Publish/Subscribe...');
  
  const subscribeTool = mastra.getTool('mqtt-subscribe');
  const publishTool = mastra.getTool('mqtt-publish');
  
  if (!subscribeTool || !publishTool) {
    log.error('Pub/Sub tools not found');
    return false;
  }

  // Subscribe to test topic
  const testTopic = `test/mastra/${Date.now()}`;
  const subResult = await subscribeTool.execute({
    context: {
      action: 'subscribe',
      config: {
        topics: testTopic,
        qos: '1'
      }
    }
  });

  if (!subResult.success) {
    log.error(`Subscribe failed: ${subResult.status}`);
    return false;
  }
  
  log.success(`Subscribed to: ${testTopic}`);

  // Publish test message
  const testMessage = {
    timestamp: new Date().toISOString(),
    test: true,
    value: Math.random() * 100,
    source: 'test-setup'
  };

  const pubResult = await publishTool.execute({
    context: {
      action: 'publish',
      config: {
        topic: testTopic,
        message: testMessage,
        qos: '1'
      }
    }
  });

  if (pubResult.success) {
    log.success(`Published message to: ${testTopic}`);
    log.info(`Message: ${JSON.stringify(testMessage)}`);
  } else {
    log.error(`Publish failed: ${pubResult.status}`);
    return false;
  }

  // Wait for message to be received
  await sleep(1000);

  // List subscriptions
  const listResult = await subscribeTool.execute({
    context: { action: 'list_subscriptions' }
  });
  
  log.info(`Active subscriptions: ${listResult.details?.subscriptions?.length || 0}`);

  // Unsubscribe
  await subscribeTool.execute({
    context: {
      action: 'unsubscribe',
      topic: testTopic
    }
  });
  
  log.success('Cleanup completed');
  return true;
}

/**
 * Test 3: Message Filtering
 */
async function testMessageFiltering() {
  log.info('Testing Message Filtering...');
  
  const subscribeTool = mastra.getTool('mqtt-subscribe');
  const publishTool = mastra.getTool('mqtt-publish');
  
  if (!subscribeTool || !publishTool) {
    log.error('Tools not found');
    return false;
  }

  // Subscribe with filter
  const filterTopic = `sensors/+/temperature`;
  const filterResult = await subscribeTool.execute({
    context: {
      action: 'subscribe',
      config: {
        topics: filterTopic,
        filter: {
          unit: 'celsius',
          location: 'lab'
        }
      }
    }
  });

  if (!filterResult.success) {
    log.error(`Filtered subscribe failed: ${filterResult.status}`);
    return false;
  }
  
  log.success('Subscribed with filter: unit=celsius, location=lab');

  // Publish messages - some will match, some won't
  const messages = [
    { temperature: 25, unit: 'celsius', location: 'lab' }, // ✅ Matches
    { temperature: 30, unit: 'fahrenheit', location: 'lab' }, // ❌ Wrong unit
    { temperature: 28, unit: 'celsius', location: 'office' }, // ❌ Wrong location
    { temperature: 22, unit: 'celsius', location: 'lab' }, // ✅ Matches
  ];

  for (let i = 0; i < messages.length; i++) {
    await publishTool.execute({
      context: {
        action: 'publish',
        config: {
          topic: `sensors/device${i}/temperature`,
          message: messages[i]
        }
      }
    });
    log.info(`Published message ${i + 1}: ${JSON.stringify(messages[i])}`);
  }

  log.warn('Check console output for filtered messages (2 should pass, 2 should be filtered)');
  
  await sleep(2000);
  
  // Cleanup
  await subscribeTool.execute({
    context: {
      action: 'unsubscribe',
      topic: filterTopic
    }
  });
  
  return true;
}

/**
 * Test 4: Workflow Execution
 */
async function testWorkflow() {
  log.info('Testing IoT Monitoring Workflow...');
  
  const workflow = mastra.getWorkflow('iotMonitoringWorkflow');
  if (!workflow) {
    log.error('Workflow not found');
    return false;
  }

  try {
    const result = await workflow.execute({
      check_type: 'routine_monitoring',
      output_format: 'summary'
    });

    log.success('Workflow executed successfully');
    log.info(`Summary: ${result.summary}`);
    log.info(`Health Score: Calculated dynamically based on system status`);
    log.info(`Actions: ${result.follow_up_actions?.length || 0} follow-up actions`);
    
    return true;
  } catch (error) {
    log.error(`Workflow failed: ${error}`);
    return false;
  }
}

/**
 * Test 5: Agent Interaction
 */
async function testAgent() {
  log.info('Testing IoT Coordinator Agent...');
  
  const agent = mastra.getAgent('iotCoordinatorAgent');
  if (!agent) {
    log.error('Agent not found');
    return false;
  }

  try {
    const result = await agent.generate([{
      role: 'user',
      content: 'Check the MQTT connection status and list active subscriptions'
    }]);

    log.success('Agent responded successfully');
    log.info(`Response: ${result.text?.substring(0, 200)}...`);
    
    return true;
  } catch (error) {
    log.error(`Agent failed: ${error}`);
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 IoT Integration Template - Comprehensive Test Suite');
  console.log('='.repeat(60) + '\n');

  const tests = [
    { name: 'MQTT Connection', fn: testMqttConnection },
    { name: 'Publish/Subscribe', fn: testPubSub },
    { name: 'Message Filtering', fn: testMessageFiltering },
    { name: 'Workflow Execution', fn: testWorkflow },
    { name: 'Agent Interaction', fn: testAgent },
  ];

  const results: { name: string; passed: boolean }[] = [];

  for (const test of tests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log('-'.repeat(40));
    
    try {
      const passed = await test.fn();
      results.push({ name: test.name, passed });
      
      if (passed) {
        log.success(`${test.name} PASSED\n`);
      } else {
        log.error(`${test.name} FAILED\n`);
      }
    } catch (error) {
      log.error(`${test.name} ERROR: ${error}\n`);
      results.push({ name: test.name, passed: false });
    }
    
    // Small delay between tests
    await sleep(1000);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  results.forEach(r => {
    console.log(`  ${r.passed ? '✅' : '❌'} ${r.name}`);
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  
  if (failed === 0) {
    log.success('\n🎉 All tests passed! Template is ready for submission.\n');
  } else {
    log.warn(`\n⚠️  ${failed} test(s) failed. Please review and fix issues.\n`);
  }

  // Disconnect MQTT
  const connectionTool = mastra.getTool('mqtt-connection');
  if (connectionTool) {
    await connectionTool.execute({ context: { action: 'disconnect' } });
  }

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});