import {
  Clock3,
  MessageSquare,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

function groupLabel(dateString) {
  const date =
    new Date(dateString);

  const now =
    new Date();

  const startOfToday =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  const startOfDate =
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

  const days = Math.round(
    (startOfToday -
      startOfDate) /
      86400000
  );

  if (days === 0) {
    return 'Today';
  }

  if (days === 1) {
    return 'Yesterday';
  }

  return 'Earlier';
}

function formatTimestamp(
  dateString
) {
  const date =
    new Date(dateString);

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  ).format(date);
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  mobileOpen,
  onClose,
}) {
  /*
   * Group conversations
   * by Today / Yesterday / Earlier.
   */

  const grouped =
    conversations.reduce(
      (groups, conversation) => {
        const group =
          groupLabel(
            conversation.updatedAt ||
              conversation.createdAt
          );

        groups[group] ||= [];

        groups[group].push(
          conversation
        );

        return groups;
      },
      {}
    );

  const content = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">

      {/* Sidebar header */}

      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <div className="flex items-center gap-2 font-semibold text-white">

            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-950">
              AI
            </span>

            Chat Assistant
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Conversation history
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* New Chat */}

      <div className="px-3 pb-3">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
        >
          <Plus size={17} />

          New Chat
        </button>
      </div>

      {/* History */}

      <div className="flex-1 overflow-y-auto px-2 pb-4">

        {Object.keys(grouped).length === 0 ? (
          <div className="px-3 py-8 text-center text-xs leading-5 text-slate-500">
            No conversations yet.
          </div>
        ) : (
          Object.entries(grouped).map(
            ([group, items]) => (
              <section
                key={group}
                className="mb-4"
              >
                <div className="flex items-center gap-2 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  <Clock3 size={11} />

                  {group}
                </div>

                <div className="space-y-1">
                  {items.map(
                    (conversation) => {
                      const active =
                        conversation.id ===
                        activeId;

                      return (
                        <div
                          key={
                            conversation.id
                          }
                          className="group relative"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onSelect(
                                conversation.id
                              )
                            }
                            className={`w-full rounded-xl px-3 py-3 pr-9 text-left transition ${
                              active
                                ? 'bg-white/10 text-white'
                                : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">

                              <MessageSquare
                                size={15}
                                className="mt-0.5 shrink-0"
                              />

                              <div className="min-w-0">

                                <div className="truncate text-sm font-medium">
                                  {
                                    conversation.title
                                  }
                                </div>

                                <div className="mt-1 truncate text-[11px] text-slate-600 group-hover:text-slate-500">
                                  {
                                    conversation.preview ||
                                    'New conversation'
                                  }
                                </div>

                              </div>
                            </div>

                            <div className="mt-1 pl-6 text-[10px] text-slate-600">
                              {formatTimestamp(
                                conversation.updatedAt ||
                                  conversation.createdAt
                              )}
                            </div>
                          </button>

                          {/* Delete */}

                          <button
                            type="button"
                            onClick={() =>
                              onDelete(
                                conversation.id
                              )
                            }
                            className="absolute right-2 top-2.5 hidden rounded-lg p-1.5 text-slate-600 hover:bg-white/10 hover:text-rose-300 group-hover:block"
                            aria-label={`Delete ${conversation.title}`}
                          >
                            <Trash2
                              size={14}
                            />
                          </button>
                        </div>
                      );
                    }
                  )}
                </div>
              </section>
            )
          )
        )}
      </div>

      {/* Footer */}

      <div className="border-t border-white/5 px-4 py-3 text-[11px] leading-5 text-slate-600">
        Your API key remains on the server.
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}

      <aside className="hidden h-full w-[290px] shrink-0 lg:block">
        {content}
      </aside>

      {/* Mobile */}

      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          mobileOpen
            ? 'pointer-events-auto'
            : 'pointer-events-none'
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className={`absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] transition ${
            mobileOpen
              ? 'opacity-100'
              : 'opacity-0'
          }`}
          aria-label="Close navigation overlay"
        />

        <aside
          className={`absolute left-0 top-0 h-full w-[290px] shadow-2xl transition-transform duration-200 ${
            mobileOpen
              ? 'translate-x-0'
              : '-translate-x-full'
          }`}
        >
          {content}
        </aside>
      </div>
    </>
  );
}