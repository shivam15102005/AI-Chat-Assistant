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
    // Some endpoints, such as streaming endpoints,
    // do not return normal JSON responses.
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Request failed with status ${response.status}.`
    );
  }

  return data;
}

/* --------------------------------
   Create conversation
--------------------------------- */

export function createConversation() {
  return request('/conversations', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

/* --------------------------------
   Get sidebar conversations
--------------------------------- */

export function listConversations() {
  return request('/conversations');
}

/* --------------------------------
   Get complete conversation
--------------------------------- */

export function getConversation(id) {
  return request(`/conversations/${id}`);
}

/* --------------------------------
   Delete conversation
--------------------------------- */

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
      // Ignore JSON parsing errors.
    }

    throw new Error(
      data?.error ||
        `Request failed with status ${response.status}.`
    );
  }
}

/* --------------------------------
   Stream AI response using SSE
--------------------------------- */

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

  /*
   * Handle HTTP errors before trying
   * to read the stream.
   */
  if (!response.ok) {
    let data = {};

    try {
      data = await response.json();
    } catch {
      // Ignore JSON parsing errors.
    }

    throw new Error(
      data?.error ||
        `Request failed with status ${response.status}.`
    );
  }

  /*
   * Make sure the browser supports
   * streaming responses.
   */
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

  /*
   * Process one complete SSE event.
   */
  const processEvent = (rawEvent) => {
    const lines =
      rawEvent.split('\n');

    const dataLines =
      lines
        .filter((line) =>
          line.startsWith('data:')
        )
        .map((line) =>
          line.slice(5).trim()
        );

    if (!dataLines.length) {
      return;
    }

    let payload;

    try {
      payload =
        JSON.parse(
          dataLines.join('\n')
        );
    } catch {
      throw new Error(
        'Received invalid streaming data from the server.'
      );
    }

    /*
     * Stream started.
     */
    if (payload.type === 'start') {
      onStart?.(payload);
      return;
    }

    /*
     * New AI text chunk.
     */
    if (payload.type === 'delta') {
      onDelta?.(
        payload.delta || ''
      );
      return;
    }

    /*
     * AI response completed.
     */
    if (payload.type === 'done') {
      onDone?.(payload);
      return;
    }

    /*
     * Backend reported an error.
     */
    if (payload.type === 'error') {
      throw new Error(
        payload.error ||
          'Streaming failed.'
      );
    }
  };

  /*
   * Read the SSE stream.
   */
  while (true) {
    const {
      value,
      done,
    } = await reader.read();

    buffer += decoder.decode(
      value || new Uint8Array(),
      {
        stream: !done,
      }
    );

    /*
     * SSE events are separated by
     * two newline characters.
     */
    const events =
      buffer.split('\n\n');

    /*
     * The last part may be incomplete,
     * so keep it in the buffer.
     */
    buffer =
      events.pop() || '';

    /*
     * Process all complete events.
     */
    for (const event of events) {
      if (event.trim()) {
        processEvent(event);
      }
    }

    if (done) {
      break;
    }
  }

  /*
   * Process any remaining event.
   */
  if (buffer.trim()) {
    processEvent(buffer);
  }
}
