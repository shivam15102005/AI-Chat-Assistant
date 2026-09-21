import OpenAI from 'openai';

import { env } from '../config/env.js';

/*
 * OpenAI client.
 *
 * The API key is read only on the backend.
 * Never expose this key to the frontend.
 */
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/*
 * Tone instructions.
 */
const TONE_INSTRUCTIONS = {
  professional:
    'Respond in a professional, clear, and formal tone.',

  casual:
    'Respond in a friendly, conversational, and casual tone.',

  concise:
    'Respond briefly and directly. Avoid unnecessary explanation.',
};

export function getToneInstruction(tone) {
  return (
    TONE_INSTRUCTIONS[tone] ||
    TONE_INSTRUCTIONS.professional
  );
}

/*
 * Convert MongoDB messages into the format
 * accepted by the Responses API.
 */
function toOpenAIInput(messages) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
}

/*
 * Convert OpenAI/API errors into user-safe
 * messages.
 *
 * Detailed diagnostic information remains
 * in the backend terminal only.
 */
function getSafeAIError(error) {
  const status = error?.status;

  if (status === 400) {
    return (
      error?.message ||
      'The AI request was invalid. Check the model and request configuration.'
    );
  }

  if (status === 401) {
    return (
      'OpenAI authentication failed. Check that your API key is valid.'
    );
  }

  if (status === 403) {
    return (
      'OpenAI access was denied for this API key or project.'
    );
  }

  if (status === 404) {
    return (
      'The requested OpenAI model or API resource was not found. Check OPENAI_MODEL.'
    );
  }

  if (status === 408) {
    return (
      'The OpenAI request timed out. Please try again.'
    );
  }

  if (status === 409) {
    return (
      'The OpenAI request could not be completed because of a conflict. Please try again.'
    );
  }

  if (status === 429) {
    return (
      'OpenAI rate limit or quota exceeded. Check your API usage and billing.'
    );
  }

  if (status >= 500 && status <= 599) {
    return (
      'OpenAI is temporarily unavailable. Please try again.'
    );
  }

  if (
    error?.name === 'AbortError' ||
    error?.name === 'APIUserAbortError'
  ) {
    return 'The AI response was interrupted.';
  }

  return (
    error?.message ||
    'The AI service failed to generate a response.'
  );
}

/*
 * Extract useful diagnostics without ever
 * printing the API key.
 */
function getErrorDetails(error) {
  return {
    name: error?.name,
    status: error?.status,
    code: error?.code,
    type: error?.type,
    message: error?.message,

    requestId:
      error?.request_id ||
      error?.requestId,

    apiError:
      error?.error
        ? {
            message: error.error.message,
            type: error.error.type,
            code: error.error.code,
          }
        : undefined,
  };
}

/*
 * Stream a response from OpenAI.
 *
 * onDelta(delta) is called whenever new text
 * arrives so the Express controller can forward
 * it immediately to the browser through SSE.
 */
export async function streamAIResponse({
  messages,
  tone,
  signal,
  onDelta,
}) {
  const instruction =
    getToneInstruction(tone);

  /*
   * Keep a reasonable context size.
   *
   * MongoDB keeps the complete conversation.
   * Only the latest messages are sent to
   * the model to control request size.
   */
  const contextMessages =
    messages.slice(-40);

  const input =
    toOpenAIInput(contextMessages);

  let accumulated = '';

  let receivedTerminalEvent = false;

  try {
    /*
     * Create the real OpenAI streaming request.
     */
    const stream =
      await openai.responses.create(
        {
          model:
            env.OPENAI_MODEL,

          instructions:
            instruction,

          input,

          stream: true,
        },
        {
          signal,
        }
      );

    /*
     * Read the stream event by event.
     */
    for await (const event of stream) {
      /*
       * Text chunk.
       */
      if (
        event.type ===
        'response.output_text.delta'
      ) {
        const delta =
          event.delta || '';

        if (delta) {
          accumulated += delta;

          onDelta(delta);
        }
      }

      /*
       * Successful terminal event.
       */
      else if (
        event.type ===
        'response.completed'
      ) {
        receivedTerminalEvent = true;

        /*
         * The API has completed successfully.
         */
        if (
          event.response?.status &&
          event.response.status !==
            'completed'
        ) {
          throw new Error(
            `OpenAI response ended with status: ${event.response.status}`
          );
        }
      }

      /*
       * Model/API failed while streaming.
       */
      else if (
        event.type ===
        'response.failed'
      ) {
        receivedTerminalEvent = true;

        const responseError =
          event.response?.error;

        const error =
          new Error(
            responseError?.message ||
              'OpenAI response failed.'
          );

        error.status = 502;

        error.type =
          responseError?.type;

        error.code =
          responseError?.code;

        throw error;
      }

      /*
       * Response was incomplete.
       */
      else if (
        event.type ===
        'response.incomplete'
      ) {
        receivedTerminalEvent = true;

        const reason =
          event.response
            ?.incomplete_details
            ?.reason ||
          'unknown';

        const error =
          new Error(
            `OpenAI response was incomplete: ${reason}`
          );

        error.status = 502;

        throw error;
      }

      /*
       * Explicit error event.
       */
      else if (
        event.type === 'error'
      ) {
        receivedTerminalEvent = true;

        const error =
          new Error(
            event.message ||
              event.error?.message ||
              'OpenAI returned a streaming error.'
          );

        error.status =
          event.status || 502;

        error.code =
          event.code ||
          event.error?.code;

        error.type =
          event.type;

        throw error;
      }
    }

    /*
     * A raw stream can reach EOF without the
     * response actually completing.
     *
     * Do not save a partial response.
     */
    if (!receivedTerminalEvent) {
      const error =
        new Error(
          'OpenAI stream ended before a completion event was received.'
        );

      error.status = 502;

      throw error;
    }

    /*
     * Never accept an empty answer.
     */
    if (!accumulated.trim()) {
      const error =
        new Error(
          'OpenAI returned an empty response.'
        );

      error.status = 502;

      throw error;
    }

    return {
      content: accumulated,
    };
  } catch (error) {
    /*
     * Abort is expected if the browser
     * disconnects during streaming.
     */
    if (
      error?.name ===
        'AbortError' ||
      error?.name ===
        'APIUserAbortError' ||
      signal?.aborted
    ) {
      console.log(
        'OpenAI stream aborted by client.'
      );

      const abortError =
        new Error(
          'The AI response was interrupted.'
        );

      abortError.status = 499;

      abortError.name =
        'APIUserAbortError';

      throw abortError;
    }

    /*
     * Detailed server-side diagnostic.
     *
     * IMPORTANT:
     * This does not print the API key.
     */
    console.error(
      'OpenAI request failed:',
      getErrorDetails(error)
    );

    const safeMessage =
      getSafeAIError(error);

    const wrapped =
      new Error(safeMessage);

    wrapped.status =
      Number.isInteger(
        error?.status
      )
        ? error.status
        : 502;

    wrapped.code =
      error?.code;

    wrapped.type =
      error?.type;

    wrapped.cause =
      error;

    throw wrapped;
  }
}