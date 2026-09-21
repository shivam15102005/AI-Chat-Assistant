const API_BASE =
  import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(
    `${API_BASE}${path}`,
    {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },

      ...options,
    }
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    // Streaming endpoints don't use normal JSON parsing.
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

/* Create conversation */

export function createConversation() {
  return request('/conversations', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/* Get sidebar conversations */

export function listConversations() {
  return request('/conversations');
}

/* Get complete conversation */

export function getConversation(id) {
  return request(`/conversations/${id}`);
}

/* Delete conversation */

export async function deleteConversation(id) {
  const response = await fetch(
    `${API_BASE}/conversations/${id}`,
    {
      method: 'DELETE',
    }
  );

  if (!response.ok) {
    let data = {};

    try {
      data = await response.json();
    } catch {
      // Ignore JSON parsing error.
    }

    throw new Error(
      data?.error ||
        `Request failed with status ${response.status}.`
    );
  }
}

/*
 * Stream AI response using SSE.
 *
 * The backend sends events such as:
 *
 * start
 * delta
 * done
 * error
 */

export async function streamMessage({
  conversationId,
  content,
  tone,
  onStart,
  onDelta,
  onDone,
}) {
  const response = await fetch(
    `${API_BASE}/conversations/${conversationId}/messages`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },

      body: JSON.stringify({
        content,
        tone,
      }),
    }
  );

  if (!response.ok) {
    let data = {};

    try {
      data = await response.json();
    } catch {
      // Ignore parsing failure.
    }

    throw new Error(
      data?.error ||
        `Request failed with status ${response.status}.`
    );
  }

  if (!response.body) {
    throw new Error(
      'Streaming is not supported by this browser.'
    );
  }

  const reader =
    response.body.getReader();

  const decoder =
    new TextDecoder();

  let buffer = '';

  const processEvent = (rawEvent) => {
    const lines = rawEvent.split('\n');

    const dataLines = lines
      .filter((line) =>
        line.startsWith('data:')
      )
      .map((line) =>
        line.slice(5).trim()
      );

    if (!dataLines.length) {
      return;
    }

    const payload =
      JSON.parse(dataLines.join('\n'));

    if (payload.type === 'start') {
      onStart?.(payload);
    }

    if (payload.type === 'delta') {
      onDelta?.(payload.delta);
    }

    if (payload.type === 'done') {
      onDone?.(payload);
    }

    if (payload.type === 'error') {
      throw new Error(
        payload.error || 'Streaming failed.'
      );
    }
  };

  while (true) {
    const { value, done } =
      await reader.read();

    buffer += decoder.decode(
      value || new Uint8Array(),
      {
        stream: !done,
      }
    );

    const events =
      buffer.split('\n\n');

    buffer =
      events.pop() || '';

    for (const event of events) {
      if (event.trim()) {
        processEvent(event);
      }
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim()) {
    processEvent(buffer);
  }
}