/**
 * Demonstration of the setTimeout limit fix in Pulse
 * 
 * This example shows how Pulse now handles jobs scheduled beyond
 * JavaScript's setTimeout maximum value (2^31 - 1 milliseconds ≈ 24.8 days)
 */

import { Pulse } from '../src';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

async function demonstrateSetTimeoutLimitFix() {
  console.log('🚀 Demonstrating setTimeout limit fix in Pulse\n');

  // Setup in-memory MongoDB
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const mongo = await MongoClient.connect(uri);

  // Create Pulse instance
  const pulse = new Pulse({ mongo: mongo.db() });

  // Define a simple job
  pulse.define('futureJob', async (job) => {
    console.log(`✅ Job executed: ${job.attrs.data?.message}`);
    return 'completed';
  });

  // Constants
  const MAX_TIMEOUT = Math.pow(2, 31) - 1;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const TEN_DAYS_MS = 10 * ONE_DAY_MS;
  const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;
  const ONE_YEAR_MS = 365 * ONE_DAY_MS;

  console.log(`📊 setTimeout limits:`);
  console.log(`   Maximum setTimeout value: ${MAX_TIMEOUT.toLocaleString()} ms (≈ ${(MAX_TIMEOUT / ONE_DAY_MS).toFixed(1)} days)`);
  console.log(`   10 days: ${TEN_DAYS_MS.toLocaleString()} ms (within limit: ${TEN_DAYS_MS < MAX_TIMEOUT})`);
  console.log(`   30 days: ${THIRTY_DAYS_MS.toLocaleString()} ms (within limit: ${THIRTY_DAYS_MS < MAX_TIMEOUT})`);
  console.log(`   1 year: ${ONE_YEAR_MS.toLocaleString()} ms (within limit: ${ONE_YEAR_MS < MAX_TIMEOUT})\n`);

  // Mock setTimeout to track calls
  const originalSetTimeout = global.setTimeout;
  const setTimeoutCalls: number[] = [];
  
  global.setTimeout = ((callback: any, delay: number) => {
    if (typeof delay === 'number') {
      setTimeoutCalls.push(delay);
      console.log(`⏰ setTimeout called with delay: ${delay.toLocaleString()} ms (within limit: ${delay <= MAX_TIMEOUT})`);
    }
    return originalSetTimeout(callback, Math.min(delay, 1000)); // Use short delay for demo
  }) as any;

  try {
    // Start Pulse
    await pulse.start();

    console.log('📅 Scheduling jobs with different future dates:\n');

    // Schedule job 10 days in the future (within setTimeout limit)
    const tenDaysJob = pulse.create('futureJob', { message: 'Job scheduled 10 days ahead' });
    tenDaysJob.schedule(new Date(Date.now() + TEN_DAYS_MS));
    await tenDaysJob.save();
    console.log('✓ Scheduled job 10 days in the future');

    // Schedule job 30 days in the future (exceeds setTimeout limit)
    const thirtyDaysJob = pulse.create('futureJob', { message: 'Job scheduled 30 days ahead' });
    thirtyDaysJob.schedule(new Date(Date.now() + THIRTY_DAYS_MS));
    await thirtyDaysJob.save();
    console.log('✓ Scheduled job 30 days in the future');

    // Schedule job 1 year in the future (far exceeds setTimeout limit)
    const oneYearJob = pulse.create('futureJob', { message: 'Job scheduled 1 year ahead' });
    oneYearJob.schedule(new Date(Date.now() + ONE_YEAR_MS));
    await oneYearJob.save();
    console.log('✓ Scheduled job 1 year in the future');

    // Give Pulse time to process the jobs
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n📈 setTimeout call analysis:');
    console.log(`   Total setTimeout calls: ${setTimeoutCalls.length}`);
    
    const validCalls = setTimeoutCalls.filter(delay => delay <= MAX_TIMEOUT);
    const invalidCalls = setTimeoutCalls.filter(delay => delay > MAX_TIMEOUT);
    
    console.log(`   Calls within limit: ${validCalls.length}`);
    console.log(`   Calls exceeding limit: ${invalidCalls.length}`);
    
    if (invalidCalls.length === 0) {
      console.log('✅ SUCCESS: All setTimeout calls are within the safe limit!');
    } else {
      console.log('❌ ISSUE: Some setTimeout calls exceed the safe limit');
      invalidCalls.forEach(delay => {
        console.log(`      - ${delay.toLocaleString()} ms (${(delay / ONE_DAY_MS).toFixed(1)} days)`);
      });
    }

  } finally {
    // Cleanup
    global.setTimeout = originalSetTimeout;
    await pulse.stop();
    await mongo.close();
    await mongod.stop();
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateSetTimeoutLimitFix()
    .then(() => {
      console.log('\n🎉 Demonstration completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error during demonstration:', error);
      process.exit(1);
    });
}

export { demonstrateSetTimeoutLimitFix };
