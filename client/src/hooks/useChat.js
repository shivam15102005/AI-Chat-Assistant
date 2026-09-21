import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  streamMessage,
} from '../services/api';

const DEFAULT_TONE = 'professional';

function makeLocalUserMessage(
  content,
  tone
) {
  return {
    id: `local-user-${Date.now()}`,
    role: 'user',
    content,
    tone,
    timestamp: new Date().toISOString(),
  };
}

export function useChat() {
  const [conversations, setConversations] =
    useState([]);

  const [
    activeConversationId,
    setActiveConversationId,
  ] = useState(null);

  const [messages, setMessages] =
    useState([]);

  const [input, setInput] =
    useState('');

  const [tone, setTone] =
    useState(DEFAULT_TONE);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isStreaming, setIsStreaming] =
    useState(false);

  const [error, setError] =
    useState('');

  const [
    mobileSidebarOpen,
    setMobileSidebarOpen,
  ] = useState(false);

  const activeIdRef =
    useRef(null);

  useEffect(() => {
    activeIdRef.current =
      activeConversationId;
  }, [activeConversationId]);

  /*
   * Refresh sidebar conversation list.
   */

  const refreshConversations =
    useCallback(async () => {
      const data =
        await listConversations();

      setConversations(
        data.conversations || []
      );

      return (
        data.conversations || []
      );
    }, []);

  /*
   * Open an existing conversation.
   */

  const loadConversation =
    useCallback(async (id) => {
      setError('');

      setActiveConversationId(id);

      setMobileSidebarOpen(false);

      try {
        const data =
          await getConversation(id);

        setMessages(
          data.conversation.messages ||
            []
        );
      } catch (err) {
        setError(err.message);
      }
    }, []);

  /*
   * Create a fresh conversation.
   */

  const startNewChat =
    useCallback(async () => {
      if (isStreaming) {
        return;
      }

      setError('');

      try {
        const data =
          await createConversation();

        const conversation =
          data.conversation;

        setConversations((current) => [
          {
            id: conversation._id,
            title: conversation.title,
            createdAt:
              conversation.createdAt,
            updatedAt:
              conversation.updatedAt,
            messageCount: 0,
            preview:
              'New conversation',
          },

          ...current.filter(
            (item) =>
              item.id !== conversation._id
          ),
        ]);

        setActiveConversationId(
          conversation._id
        );

        setMessages([]);

        setInput('');

        setMobileSidebarOpen(false);
      } catch (err) {
        setError(err.message);
      }
    }, [isStreaming]);

  /*
   * Delete conversation.
   */

  const deleteChat =
    useCallback(
      async (id) => {
        if (isStreaming) {
          return;
        }

        try {
          await deleteConversation(id);

          const remaining =
            conversations.filter(
              (conversation) =>
                conversation.id !== id
            );

          setConversations(remaining);

          if (
            activeConversationId === id
          ) {
            if (remaining[0]) {
              await loadConversation(
                remaining[0].id
              );
            } else {
              await startNewChat();
            }
          }
        } catch (err) {
          setError(err.message);
        }
      },
      [
        activeConversationId,
        conversations,
        isStreaming,
        loadConversation,
        startNewChat,
      ]
    );

  /*
   * Send message + receive SSE stream.
   */

  const sendMessage =
    useCallback(async () => {
      const content =
        input.trim();

      const conversationId =
        activeIdRef.current;

      /*
       * Prevent empty or duplicate sends.
       */

      if (
        !content ||
        !conversationId ||
        isStreaming
      ) {
        return;
      }

      setError('');

      setInput('');

      /*
       * Add user message immediately.
       */

      const localUserMessage =
        makeLocalUserMessage(
          content,
          tone
        );

      setMessages((current) => [
        ...current,
        localUserMessage,
      ]);

      setIsStreaming(true);

      /*
       * Temporary assistant message.
       */

      const streamingId =
        `stream-${Date.now()}`;

      setMessages((current) => [
        ...current,

        {
          id: streamingId,
          role: 'assistant',
          content: '',
          timestamp:
            new Date().toISOString(),
          streaming: true,
        },
      ]);

      try {
        await streamMessage({
          conversationId,
          content,
          tone,

          /*
           * Backend starts the stream.
           */

          onStart: (event) => {
            if (event.title) {
              setConversations(
                (current) =>
                  current.map(
                    (conversation) =>
                      conversation.id ===
                      conversationId
                        ? {
                            ...conversation,
                            title:
                              event.title,
                          }
                        : conversation
                  )
              );
            }
          },

          /*
           * Append every incoming AI chunk.
           */

          onDelta: (delta) => {
            setMessages((current) =>
              current.map(
                (message) =>
                  message.id ===
                  streamingId
                    ? {
                        ...message,
                        content:
                          message.content +
                          delta,
                      }
                    : message
              )
            );
          },

          /*
           * Stream completed.
           */

          onDone: (event) => {
            setMessages((current) =>
              current.map(
                (message) =>
                  message.id ===
                  streamingId
                    ? {
                        ...message,
                        ...event.message,
                        streaming: false,
                        id: event.message.id,
                      }
                    : message
              )
            );

            if (event.conversation) {
              setConversations(
                (current) => {
                  const existing =
                    current.find(
                      (item) =>
                        item.id ===
                        conversationId
                    );

                  return [
                    {
                      id: event
                        .conversation.id,

                      title:
                        event.conversation
                          .title,

                      updatedAt:
                        event.conversation
                          .updatedAt,

                      messageCount:
                        existing
                          ?.messageCount
                          ? existing.messageCount +
                            2
                          : 2,

                      preview:
                        event.message.content.slice(
                          0,
                          90
                        ),
                    },

                    ...current.filter(
                      (item) =>
                        item.id !==
                        conversationId
                    ),
                  ];
                }
              );
            }
          },
        });
      } catch (err) {
        /*
         * Remove incomplete AI message.
         */

        setMessages((current) =>
          current.filter(
            (message) =>
              message.id !==
              streamingId
          )
        );

        setError(err.message);

        /*
         * Refresh sidebar in case
         * backend state changed.
         */

        await refreshConversations().catch(
          () => undefined
        );
      } finally {
        setIsStreaming(false);
      }
    }, [
      input,
      isStreaming,
      refreshConversations,
      tone,
    ]);

  /*
   * Prevent duplicate initialization
   * under React StrictMode.
   */

  const initializedRef =
    useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return undefined;
    }

    initializedRef.current = true;

    let cancelled = false;

    async function initialize() {
      try {
        /*
         * Load existing conversations.
         */

        const data =
          await listConversations();

        if (cancelled) {
          return;
        }

        const items =
          data.conversations || [];

        setConversations(items);

        /*
         * Open newest conversation.
         */

        if (items[0]) {
          const conversationData =
            await getConversation(
              items[0].id
            );

          if (!cancelled) {
            setActiveConversationId(
              items[0].id
            );

            setMessages(
              conversationData
                .conversation.messages ||
                []
            );
          }
        }

        /*
         * No conversation exists.
         * Create an empty one.
         */

        else {
          const created =
            await createConversation();

          if (!cancelled) {
            setActiveConversationId(
              created.conversation._id
            );

            setMessages([]);

            setConversations([
              {
                id:
                  created.conversation._id,

                title:
                  created.conversation.title,

                createdAt:
                  created.conversation
                    .createdAt,

                updatedAt:
                  created.conversation
                    .updatedAt,

                messageCount: 0,

                preview:
                  'New conversation',
              },
            ]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    conversations,

    activeConversationId,

    messages,

    input,
    setInput,

    tone,
    setTone,

    isLoading,

    isStreaming,

    error,
    setError,

    mobileSidebarOpen,
    setMobileSidebarOpen,

    loadConversation,

    startNewChat,

    deleteChat,

    sendMessage,
  };
}