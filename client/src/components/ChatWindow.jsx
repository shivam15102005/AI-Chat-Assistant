import {
  Menu,
  Plus,
  ShieldCheck,
} from 'lucide-react';

import ChatInput from './ChatInput.jsx';
import ChatMessage from './ChatMessage.jsx';
import EmptyState from './EmptyState.jsx';
import ToneSelector from './ToneSelector.jsx';

export default function ChatWindow({
  conversation,
  messages,
  input,
  setInput,
  tone,
  setTone,
  isStreaming,
  onSend,
  onNewChat,
  onOpenSidebar,
  error,
}) {
  return (
    <main className="flex min-w-0 flex-1 flex-col bg-[#f7f8fb]">

      {/* Header */}

      <header className="flex min-h-[72px] items-center justify-between border-b border-slate-200 bg-white/90 px-3 backdrop-blur sm:px-5">

        <div className="flex min-w-0 items-center gap-3">

          {/* Mobile menu */}

          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
            aria-label="Open conversation history"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">

            <div className="flex items-center gap-2">

              <h1 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
                {conversation?.title ||
                  'AI Chat Assistant'}
              </h1>

              <span className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 sm:inline-flex">
                <ShieldCheck
                  size={11}
                />

                Secure
              </span>
            </div>

            <p className="truncate text-xs text-slate-400">
              Real-time AI chat with persistent history
            </p>
          </div>
        </div>

        {/* Right header controls */}

        <div className="flex items-center gap-2">

          <ToneSelector
            value={tone}
            onChange={setTone}
            disabled={isStreaming}
          />

          <button
            type="button"
            onClick={onNewChat}
            disabled={isStreaming}
            className="hidden items-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex"
          >
            <Plus size={16} />
            New Chat
          </button>
        </div>
      </header>

      {/* Error */}

      {error && (
        <div className="mx-3 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm sm:mx-5">
          {error}
        </div>
      )}

      {/* Messages */}

      <section className="min-h-0 flex-1 overflow-y-auto px-3 py-5 sm:px-5">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">

          {messages.length ? (
            messages.map(
              (message) => (
                <ChatMessage
                  key={
                    message.id ||
                    message._id
                  }
                  message={message}
                />
              )
            )
          ) : (
            <EmptyState
              onExample={setInput}
            />
          )}

        </div>
      </section>

      {/* Input */}

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={onSend}
        disabled={isStreaming}
      />

    </main>
  );
}