import mongoose from 'mongoose';

import Conversation from '../models/Conversation.js';

import {
  createTitle,
} from '../utils/title.js';

import {
  closeSSE,
  sendSSE,
  setupSSE,
} from '../utils/sse.js';

import {
  streamAIResponse,
} from '../services/aiService.js';

const ALLOWED_TONES = new Set([
  'professional',
  'casual',
  'concise',
]);

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(
    id
  );
}

function conversationId(
  conversation
) {
  return conversation._id.toString();
}

function serializeMessage(
  message
) {
  return {
    id: message._id.toString(),

    role: message.role,

    content: message.content,

    tone: message.tone,

    timestamp:
      message.timestamp,
  };
}

function serializeConversation(
  conversation
) {
  return {
    id: conversationId(
      conversation
    ),

    title:
      conversation.title,

    createdAt:
      conversation.createdAt,

    updatedAt:
      conversation.updatedAt,

    messages:
      conversation.messages.map(
        serializeMessage
      ),
  };
}

/*
 * POST /api/conversations
 */

export async function createConversation(
  req,
  res,
  next
) {
  try {
    const conversation =
      await Conversation.create({
        title: 'New Chat',
        messages: [],
      });

    res.status(201).json({
      conversation:
        serializeConversation(
          conversation
        ),
    });
  } catch (error) {
    next(error);
  }
}

/*
 * GET /api/conversations
 */

export async function listConversations(
  req,
  res,
  next
) {
  try {
    const conversations =
      await Conversation.find(
        {},
        {
          title: 1,
          createdAt: 1,
          updatedAt: 1,
          messages: {
            $slice: -1,
          },
        }
      )
        .sort({
          updatedAt: -1,
        })
        .lean();

    const result =
      conversations.map(
        (conversation) => {
          const lastMessage =
            conversation.messages?.[0];

          return {
            id:
              conversation._id.toString(),

            title:
              conversation.title,

            createdAt:
              conversation.createdAt,

            updatedAt:
              conversation.updatedAt,

            messageCount:
              lastMessage ? 1 : 0,

            preview:
              lastMessage?.content ||
              'New conversation',
          };
        }
      );

    /*
     * The UI doesn't actually need the
     * exact total count for rendering, but
     * we can get it cheaply in a separate
     * count query if desired.
     */

    const counts =
      await Conversation.find(
        {},
        {
          _id: 1,
          messages: 1,
        }
      ).lean();

    const countMap =
      new Map(
        counts.map((conversation) => [
          conversation._id.toString(),
          conversation.messages.length,
        ])
      );

    const conversationsWithCounts =
      result.map(
        (conversation) => ({
          ...conversation,

          messageCount:
            countMap.get(
              conversation.id
            ) || 0,
        })
      );

    res.json({
      conversations:
        conversationsWithCounts,
    });
  } catch (error) {
    next(error);
  }
}

/*
 * GET /api/conversations/:id
 */

export async function getConversation(
  req,
  res,
  next
) {
  try {
    const { id } =
      req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        error:
          'Invalid conversation ID.',
      });
    }

    const conversation =
      await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        error:
          'Conversation not found.',
      });
    }

    return res.json({
      conversation:
        serializeConversation(
          conversation
        ),
    });
  } catch (error) {
    next(error);
  }
}

/*
 * DELETE /api/conversations/:id
 */

export async function deleteConversation(
  req,
  res,
  next
) {
  try {
    const { id } =
      req.params;

    if (!isValidId(id)) {
      return res.status(400).json({
        error:
          'Invalid conversation ID.',
      });
    }

    const result =
      await Conversation.findByIdAndDelete(
        id
      );

    if (!result) {
      return res.status(404).json({
        error:
          'Conversation not found.',
      });
    }

    return res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/*
 * POST /api/conversations/:id/messages
 *
 * This endpoint streams the AI response
 * through Server-Sent Events.
 */

export async function sendMessage(
  req,
  res,
  next
) {
  const {
    id,
  } = req.params;

  let conversation;

  try {
    if (!isValidId(id)) {
      return res.status(400).json({
        error:
          'Invalid conversation ID.',
      });
    }

    /*
     * Validate request body.
     */

    const content =
      typeof req.body?.content ===
      'string'
        ? req.body.content.trim()
        : '';

    const tone =
      typeof req.body?.tone ===
      'string'
        ? req.body.tone
        : 'professional';

    if (!content) {
      return res.status(400).json({
        error:
          'Message cannot be empty.',
      });
    }

    if (content.length > 20000) {
      return res.status(400).json({
        error:
          'Message is too long. Maximum length is 20,000 characters.',
      });
    }

    if (
      !ALLOWED_TONES.has(tone)
    ) {
      return res.status(400).json({
        error:
          'Invalid tone. Choose professional, casual, or concise.',
      });
    }

    /*
     * Get conversation.
     */

    conversation =
      await Conversation.findById(id);

    if (!conversation) {
      return res.status(404).json({
        error:
          'Conversation not found.',
      });
    }

    /*
     * Check that the user isn't trying
     * to send an unsupported body.
     */

    const userMessage = {
      role: 'user',
      content,
      tone,
      timestamp: new Date(),
    };

    /*
     * Add user message immediately.
     *
     * This satisfies the requirement that
     * every user prompt gets persisted.
     */

    conversation.messages.push(
      userMessage
    );

    /*
     * Generate title from first user
     * message.
     */

    if (
      conversation.messages.filter(
        (message) =>
          message.role === 'user'
      ).length === 1
    ) {
      conversation.title =
        createTitle(content);
    }

    await conversation.save();

    /*
     * Set up SSE.
     */

    setupSSE(res);

    /*
     * Send initial event.
     */

    sendSSE(res, {
      type: 'start',

      conversation: {
        id:
          conversationId(
            conversation
          ),

        title:
          conversation.title,
      },

      title:
        conversation.title,
    });

    /*
     * Abort OpenAI if the browser
     * disconnects.
     */

    const controller =
      new AbortController();

    let streamFinished = false;

    res.on('close', () => {
      if (!streamFinished) {
        controller.abort();
      }
    });

    /*
     * Snapshot conversation context
     * before OpenAI starts.
     */

    const messagesForAI =
      conversation.messages.map(
        (message) => ({
          role: message.role,

          content:
            message.content,
        })
      );

    let assistantContent = '';

    try {
      const result =
        await streamAIResponse({
          messages:
            messagesForAI,

          tone,

          signal:
            controller.signal,

          onDelta(delta) {
            assistantContent +=
              delta;

            sendSSE(res, {
              type: 'delta',
              delta,
            });
          },
        });

      /*
       * Use the complete generated
       * response returned by the service.
       */

      assistantContent =
        result.content;

      /*
       * IMPORTANT:
       * Save the complete response once.
       *
       * We do NOT create a MongoDB
       * record for every streaming chunk.
       */

      conversation.messages.push({
        role: 'assistant',

        content:
          assistantContent,

        timestamp: new Date(),
      });

      await conversation.save();

      streamFinished = true;

      const savedMessage =
        conversation.messages[
          conversation.messages.length -
            1
        ];

      sendSSE(res, {
        type: 'done',

        message:
          serializeMessage(
            savedMessage
          ),

        conversation: {
          id:
            conversationId(
              conversation
            ),

          title:
            conversation.title,

          updatedAt:
            conversation.updatedAt,
        },
      });

      closeSSE(res);
    } catch (error) {
      /*
       * If the browser disconnected,
       * there is no point trying to send
       * another SSE event.
       */

      if (
        controller.signal.aborted ||
        res.destroyed
      ) {
        return;
      }

      console.error(
        'Streaming request failed:',
        error.message
      );

      sendSSE(res, {
        type: 'error',

        error:
          error.message ||
          'AI response failed.',
      });

      closeSSE(res);
    }

    return undefined;
  } catch (error) {
    next(error);
  }
}