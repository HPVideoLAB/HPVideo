#!/usr/bin/env node

/**
 * SSE Test Script
 *
 * This script tests the SSE endpoint by:
 * 1. Creating a test task
 * 2. Connecting to the SSE stream
 * 3. Listening for events
 *
 * Usage:
 *   node test-sse.js <requestId>
 *
 * Or to create a new task and monitor it:
 *   node test-sse.js --create
 */

const EventSource = require('eventsource');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3008/nest';

async function createTestTask() {
  console.log('Creating test task...');

  const response = await fetch(`${BASE_URL}/large-language-model`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': 'test-wallet-address'
    },
    body: JSON.stringify({
      model: 'commercial-pipeline',
      prompt: 'Test video generation',
      image: 'https://example.com/test-image.jpg',
      voice_id: 'fresh_youth',
      duration: 5,
      enableSmartEnhance: true,
      enableUpscale: '720p',
      txHash: '0x' + Math.random().toString(36).substring(2, 15)
    })
  });

  const result = await response.json();
  console.log('Task created:', result);
  return result.requestId;
}

function connectToSSE(requestId) {
  console.log(`\nConnecting to SSE stream for requestId: ${requestId}`);
  console.log(`URL: ${BASE_URL}/large-language-model/${requestId}/stream\n`);

  const eventSource = new EventSource(
    `${BASE_URL}/large-language-model/${requestId}/stream`
  );

  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    console.log('✅ [CONNECTED]', data);
  });

  eventSource.addEventListener('status', (event) => {
    const data = JSON.parse(event.data);
    console.log('📊 [STATUS UPDATE]', data);
  });

  eventSource.addEventListener('completed', (event) => {
    const data = JSON.parse(event.data);
    console.log('🎉 [COMPLETED]', data);
    console.log('\nTask completed successfully!');
    eventSource.close();
    process.exit(0);
  });

  eventSource.addEventListener('error', (event) => {
    const data = JSON.parse(event.data);
    console.error('❌ [ERROR]', data);
    eventSource.close();
    process.exit(1);
  });

  eventSource.onerror = (err) => {
    console.error('❌ [CONNECTION ERROR]', err);
    eventSource.close();
    process.exit(1);
  };

  // Handle Ctrl+C
  process.on('SIGINT', () => {
    console.log('\n\nClosing SSE connection...');
    eventSource.close();
    process.exit(0);
  });

  console.log('Listening for events... (Press Ctrl+C to exit)\n');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage:');
    console.error('  node test-sse.js <requestId>');
    console.error('  node test-sse.js --create');
    process.exit(1);
  }

  let requestId;

  if (args[0] === '--create') {
    try {
      requestId = await createTestTask();
    } catch (error) {
      console.error('Failed to create task:', error.message);
      process.exit(1);
    }
  } else {
    requestId = args[0];
  }

  connectToSSE(requestId);
}

main().catch(console.error);
