import ReactMarkdown from 'react-markdown';

import {
  Bot,
  User,
} from 'lucide-react';

function formatTime(timestamp) {
  if (!timestamp) {
    return '';
  }

  const date =
    new Date(timestamp);

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  ).format(date);
}

export default function ChatMessage({
  message,
}) {
  const isUser =
    message.role === 'user';

  return (
    <div
      className={`flex w-full gap-3 ${
        isUser
          ? 'justify-end'
          : 'justify-start'
      }`}
    >

      {/* AI icon */}

      {!isUser && (
        <div
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm"
          aria-hidden="true"
        >
          <Bot size={16} />
        </div>
      )}

      <div
        className={`${
          isUser
            ? 'items-end'
            : 'items-start'
        } flex max-w-[88%] flex-col md:max-w-[78%]`}
      >

        {/* Message bubble */}

        <div
          className={
            isUser
              ? 'rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white shadow-sm'
              : 'rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 shadow-sm'
          }
        >

          {isUser ? (
            <p className="whitespace-pre-wrap break-words">
              {message.content}
            </p>
          ) : (
            <div className="markdown-content text-sm leading-6">

              <ReactMarkdown>
                {
                  message.content ||
                  'Thinking…'
                }
              </ReactMarkdown>

              {/* Streaming cursor */}

              {message.streaming && (
                <span
                  className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-full bg-slate-400 align-[-2px]"
                  aria-label="Streaming"
                />
              )}

            </div>
          )}

        </div>

        {/* Message metadata */}

        <div className="mt-1 flex items-center gap-2 px-1 text-[11px] text-slate-400">

          {isUser ? (
            <User
              size={11}
              aria-hidden="true"
            />
          ) : (
            <Bot
              size={11}
              aria-hidden="true"
            />
          )}

          <span>
            {isUser
              ? 'You'
              : 'AI'}
          </span>

          {message.timestamp && (
            <span>
              ·{' '}
              {formatTime(
                message.timestamp
              )}
            </span>
          )}
        </div>
      </div>

      {/* User icon */}

      {isUser && (
        <div
          className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700"
          aria-hidden="true"
        >
          <User size={16} />
        </div>
      )}
    </div>
  );
}