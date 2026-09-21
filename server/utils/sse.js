export function setupSSE(res) {
  res.status(200);

  res.setHeader(
    'Content-Type',
    'text/event-stream'
  );

  res.setHeader(
    'Cache-Control',
    'no-cache, no-transform'
  );

  res.setHeader(
    'Connection',
    'keep-alive'
  );

  /*
   * Prevent reverse proxies from
   * buffering streamed responses.
   */

  res.setHeader(
    'X-Accel-Buffering',
    'no'
  );

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

export function sendSSE(
  res,
  payload
) {
  if (res.writableEnded) {
    return;
  }

  res.write(
    `data: ${JSON.stringify(payload)}\n\n`
  );
}

export function closeSSE(res) {
  if (!res.writableEnded) {
    res.end();
  }
}