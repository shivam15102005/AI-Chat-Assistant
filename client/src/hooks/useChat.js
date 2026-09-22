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

function makeLocalUserMessage(content, tone) {
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

  /*
   * Always keep the latest active conversation ID
   * available synchronously.
   */
  const activeIdRef =
    useRef(null);

  /*
   * Update BOTH the React state and the ref
   * immediately.
   */
  const setActiveConversation =
    useCallback((id) => {
      activeIdRef.current = id;
      setActiveConversationId(id);
    }, []);

  /*
   * Refresh the sidebar conversation list.
   */
  const refreshConversations =
    useCallback(async () => {
      const data =
        await listConversations();

      const items =
        data.conversations || [];

      setConversations(items);

      return items;
    }, []);

  /*
   * Open an existing conversation.
   */
  const loadConversation =
    useCallback(
      async (id) => {
        if (!id) {
          return;
        }

        setError('');

        /*
         * Update the active conversation immediately.
         */
        setActiveConversation(id);

        /*
         * Clear old conversation UI immediately.
         */
        setMessages([]);
        setInput('');
        setMobileSidebarOpen(false);

        try {
          const data =
            await getConversation(id);

          /*
           * If the user switched to another
           * conversation while this request
           * was running, ignore this response.
           */
          if (
            activeIdRef.current !== id
          ) {
            return;
          }

          setMessages(
            data.conversation?.messages || []
          );
        } catch (err) {
          if (
            activeIdRef.current === id
          ) {
            setError(
              err?.message ||
                'Failed to load conversation.'
            );
          }
        }
      },
      [setActiveConversation]
    );

  /*
   * Create a fresh conversation.
   */
  const startNewChat =
    useCallback(async () => {
      /*
       * Don't create another chat while
       * an AI response is being streamed.
       */
      if (isStreaming) {
        return;
      }

      setError('');

      try {
        const data =
          await createConversation();

        const conversation =
          data.conversation;

        /*
         * IMPORTANT:
         * Update the ref immediately.
         * This fixes the stale conversation ID
         * problem after clicking New Chat.
         */
        setActiveConversation(
          conversation._id
        );

        /*
         * Add the new conversation
         * to the top of the sidebar.
         */
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
              item.id !==
              conversation._id
          ),
        ]);

        /*
         * Reset chat UI.
         */
        setMessages([]);
        setInput('');
        setError('');
        setMobileSidebarOpen(false);
      } catch (err) {
        setError(
          err?.message ||
            'Failed to create a new conversation.'
        );
      }
    }, [
      isStreaming,
      setActiveConversation,
    ]);

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

          /*
           * If the deleted conversation was active,
           * open another conversation or create a new one.
           */
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
          setError(
            err?.message ||
              'Failed to delete conversation.'
          );
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

      /*
       * Always read the most recent conversation
       * directly from the ref.
       */
      const conversationId =
        activeIdRef.current;

      /*
       * Prevent invalid or duplicate sends.
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
       * Add the user message immediately.
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
           * Backend has started the stream.
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
                        id:
                          event.message.id,
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
                      id:
                        event.conversation.id,

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
         * Remove incomplete assistant message.
         */
        setMessages((current) =>
          current.filter(
            (message) =>
              message.id !==
              streamingId
          )
        );

        setError(
          err?.message ||
            'Failed to send message.'
        );

        /*
         * Refresh sidebar in case the backend
         * already changed the conversation.
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
            /*
             * Update the ref immediately.
             */
            setActiveConversation(
              items[0].id
            );

            setMessages(
              conversationData
                .conversation?.messages ||
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
            const newId =
              created.conversation._id;

            /*
             * Update the ref immediately.
             */
            setActiveConversation(
              newId
            );

            setMessages([]);

            setConversations([
              {
                id: newId,

                title:
                  created.conversation
                    .title,

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
          setError(
            err?.message ||
              'Failed to initialize chat.'
          );
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
  }, [setActiveConversation]);

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
