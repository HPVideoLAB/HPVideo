# Frontend SSE Integration Guide

## Overview

The backend now supports Server-Sent Events (SSE) for real-time task status updates. This eliminates the need for frontend polling and provides instant notifications when tasks complete.

## API Endpoints

### 1. Create Task (Existing)
```
POST /nest/large-language-model
```

**Request Body:**
```json
{
  "model": "commercial-pipeline",
  "prompt": "Product promotional video",
  "image": "https://example.com/image.jpg",
  "voice_id": "fresh_youth",
  "duration": 5,
  "enableSmartEnhance": true,
  "enableUpscale": "720p",
  "txHash": "0x..."
}
```

**Response:**
```json
{
  "requestId": "abc123",
  "status": "processing",
  "message": "Task created successfully"
}
```

### 2. SSE Stream (New)
```
GET /nest/large-language-model/:requestId/stream
```

**Response:** Server-Sent Events stream

## Frontend Implementation

### React Example

```typescript
import { useEffect, useState } from 'react';

interface TaskStatus {
  status: 'processing' | 'completed' | 'failed';
  stage?: string;
  outputUrl?: string;
  message?: string;
  error?: string;
}

function useTaskSSE(requestId: string) {
  const [taskStatus, setTaskStatus] = useState<TaskStatus>({
    status: 'processing'
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;

    const eventSource = new EventSource(
      `http://localhost:3008/nest/large-language-model/${requestId}/stream`
    );

    // Connection established
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE connected:', data);
      setTaskStatus(prev => ({ ...prev, ...data }));
    });

    // Status update (e.g., moving from generation to upscaling)
    eventSource.addEventListener('status', (event) => {
      const data = JSON.parse(event.data);
      console.log('Status update:', data);
      setTaskStatus(prev => ({ ...prev, ...data }));
    });

    // Task completed successfully
    eventSource.addEventListener('completed', (event) => {
      const data = JSON.parse(event.data);
      console.log('Task completed:', data);
      setTaskStatus({
        status: 'completed',
        outputUrl: data.outputUrl,
        message: data.message
      });
      eventSource.close();
    });

    // Task failed
    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      console.log('Task error:', data);
      setError(data.message || 'Task failed');
      setTaskStatus({ status: 'failed' });
      eventSource.close();
    });

    // Handle connection errors
    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setError('Connection lost');
      eventSource.close();
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [requestId]);

  return { taskStatus, error };
}

// Usage in component
function VideoGenerator() {
  const [requestId, setRequestId] = useState<string | null>(null);
  const { taskStatus, error } = useTaskSSE(requestId);

  const handleSubmit = async (formData) => {
    const response = await fetch('http://localhost:3008/nest/large-language-model', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wallet-address': 'your-wallet-address'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    setRequestId(result.requestId);
  };

  return (
    <div>
      {taskStatus.status === 'processing' && (
        <div>
          <p>Processing... {taskStatus.stage}</p>
          <p>{taskStatus.message}</p>
        </div>
      )}

      {taskStatus.status === 'completed' && (
        <div>
          <p>Video ready!</p>
          <video src={taskStatus.outputUrl} controls />
        </div>
      )}

      {error && <p>Error: {error}</p>}
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
function connectToTaskStream(requestId) {
  const eventSource = new EventSource(
    `http://localhost:3008/nest/large-language-model/${requestId}/stream`
  );

  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    console.log('Connected:', data);
    updateUI({ status: 'connected', message: 'Listening for updates...' });
  });

  eventSource.addEventListener('status', (event) => {
    const data = JSON.parse(event.data);
    console.log('Status update:', data);
    updateUI({
      status: 'processing',
      stage: data.stage,
      message: data.message
    });
  });

  eventSource.addEventListener('completed', (event) => {
    const data = JSON.parse(event.data);
    console.log('Completed:', data);
    updateUI({
      status: 'completed',
      videoUrl: data.outputUrl,
      message: data.message
    });
    eventSource.close();
  });

  eventSource.addEventListener('error', (event) => {
    const data = JSON.parse(event.data);
    console.error('Error:', data);
    updateUI({
      status: 'error',
      message: data.message
    });
    eventSource.close();
  });

  eventSource.onerror = (err) => {
    console.error('Connection error:', err);
    eventSource.close();
  };

  return eventSource;
}

// Usage
async function createAndMonitorTask(formData) {
  // 1. Create task
  const response = await fetch('http://localhost:3008/nest/large-language-model', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': 'your-wallet-address'
    },
    body: JSON.stringify(formData)
  });

  const { requestId } = await response.json();

  // 2. Connect to SSE stream
  const eventSource = connectToTaskStream(requestId);

  // 3. Return cleanup function
  return () => eventSource.close();
}
```

### Vue 3 Example

```vue
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface TaskStatus {
  status: 'processing' | 'completed' | 'failed';
  stage?: string;
  outputUrl?: string;
  message?: string;
}

const props = defineProps<{
  requestId: string;
}>();

const taskStatus = ref<TaskStatus>({ status: 'processing' });
const error = ref<string | null>(null);
let eventSource: EventSource | null = null;

onMounted(() => {
  eventSource = new EventSource(
    `http://localhost:3008/nest/large-language-model/${props.requestId}/stream`
  );

  eventSource.addEventListener('connected', (event) => {
    const data = JSON.parse(event.data);
    taskStatus.value = { ...taskStatus.value, ...data };
  });

  eventSource.addEventListener('status', (event) => {
    const data = JSON.parse(event.data);
    taskStatus.value = { ...taskStatus.value, ...data };
  });

  eventSource.addEventListener('completed', (event) => {
    const data = JSON.parse(event.data);
    taskStatus.value = {
      status: 'completed',
      outputUrl: data.outputUrl,
      message: data.message
    };
    eventSource?.close();
  });

  eventSource.addEventListener('error', (event) => {
    const data = JSON.parse(event.data);
    error.value = data.message;
    taskStatus.value = { status: 'failed' };
    eventSource?.close();
  });
});

onUnmounted(() => {
  eventSource?.close();
});
</script>

<template>
  <div>
    <div v-if="taskStatus.status === 'processing'">
      <p>Processing... {{ taskStatus.stage }}</p>
      <p>{{ taskStatus.message }}</p>
    </div>

    <div v-else-if="taskStatus.status === 'completed'">
      <p>Video ready!</p>
      <video :src="taskStatus.outputUrl" controls />
    </div>

    <div v-else-if="error">
      <p>Error: {{ error }}</p>
    </div>
  </div>
</template>
```

## SSE Event Types

### 1. `connected`
Sent immediately when SSE connection is established.

```json
{
  "requestId": "abc123",
  "status": "processing"
}
```

### 2. `status`
Sent when task progresses to a new stage (e.g., from generation to upscaling).

```json
{
  "status": "processing",
  "stage": "upscaling",
  "message": "Video generation completed, starting upscaling",
  "requestId": "abc123"
}
```

### 3. `completed`
Sent when task completes successfully.

```json
{
  "status": "completed",
  "outputUrl": "https://example.com/video.mp4",
  "requestId": "abc123",
  "message": "Video generation completed successfully"
}
```

### 4. `error`
Sent when task fails.

```json
{
  "message": "Generation failed: timeout",
  "requestId": "abc123"
}
```

## Benefits Over Polling

| Feature | Polling | SSE |
|---------|---------|-----|
| **Latency** | 2-30 seconds | < 100ms |
| **Server Load** | High (constant requests) | Low (single connection) |
| **Network Traffic** | High (repeated HTTP overhead) | Low (single connection) |
| **Real-time** | No | Yes |
| **Battery Usage** | High | Low |
| **Scalability** | Poor | Good |

## Error Handling

### Connection Lost
If the SSE connection is lost, the browser will automatically attempt to reconnect. You can handle this:

```javascript
eventSource.onerror = (err) => {
  console.error('Connection lost, retrying...');
  // Optionally show a "reconnecting" message to user
};
```

### Task Not Found
If the requestId doesn't exist, the server will send an error event and close the connection:

```javascript
eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  if (data.message === 'Task not found') {
    // Handle invalid requestId
  }
});
```

### Already Completed Tasks
If you connect to a task that's already completed, the server will immediately send the final status and close the connection:

```javascript
// No need for special handling - just listen for 'completed' event
eventSource.addEventListener('completed', (event) => {
  const data = JSON.parse(event.data);
  // Display result immediately
});
```

## Migration from Polling

### Before (Polling)
```javascript
async function pollTaskStatus(requestId) {
  const interval = setInterval(async () => {
    const response = await fetch(`/nest/large-language-model/${requestId}`);
    const data = await response.json();

    if (data.status === 'completed' || data.status === 'failed') {
      clearInterval(interval);
      handleResult(data);
    }
  }, 2000); // Poll every 2 seconds
}
```

### After (SSE)
```javascript
function streamTaskStatus(requestId) {
  const eventSource = new EventSource(
    `/nest/large-language-model/${requestId}/stream`
  );

  eventSource.addEventListener('completed', (event) => {
    const data = JSON.parse(event.data);
    handleResult(data);
    eventSource.close();
  });
}
```

## Browser Compatibility

SSE is supported in all modern browsers:
- Chrome/Edge: ✅
- Firefox: ✅
- Safari: ✅
- Opera: ✅
- IE: ❌ (use polyfill or fallback to polling)

For IE support, use a polyfill like [event-source-polyfill](https://www.npmjs.com/package/event-source-polyfill).

## Testing

### Using curl
```bash
curl -N http://localhost:3008/nest/large-language-model/YOUR_REQUEST_ID/stream
```

### Using Browser DevTools
1. Open Network tab
2. Filter by "EventStream"
3. Click on the SSE connection
4. View real-time events in the "EventStream" tab

## Notes

- SSE connections are automatically closed when tasks complete or fail
- The server sends heartbeat messages every 30 seconds to keep connections alive
- Multiple clients can connect to the same requestId simultaneously
- Connections are automatically cleaned up when clients disconnect
