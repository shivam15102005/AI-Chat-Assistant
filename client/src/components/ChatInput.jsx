import {
  ArrowUp,
  Loader2,
} from 'lucide-react';

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled,
}) {
  /*
   * Message can be sent only when:
   * - the AI is not currently streaming
   * - the input is not empty
   */
  const canSend =
    !disabled &&
    value.trim().length > 0;

  /*
   * Handle form submission.
   */
  const handleSubmit = (event) => {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    onSend();
  };

  /*
   * Handle keyboard input.
   *
   * Enter = send
   * Shift + Enter = new line
   */
  const handleKeyDown = (event) => {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();

      if (canSend) {
        onSend();
      }
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white/95 p-3 backdrop-blur sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-sm transition focus-within:border-slate-300 focus-within:bg-white focus-within:shadow-md"
      >
        <textarea
          rows={1}
          value={value}
          onChange={(event) => {
            onChange(
              event.target.value
            );
          }}
          onKeyDown={handleKeyDown}
          placeholder="Message AI Chat Assistant..."
          aria-label="Message"
          disabled={disabled}
          className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
        />

        <button
          type="submit"
          disabled={!canSend}
          className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          aria-label={
            disabled
              ? 'Sending message'
              : 'Send message'
          }
        >
          {disabled ? (
            <Loader2
              size={18}
              className="animate-spin"
            />
          ) : (
            <ArrowUp size={19} />
          )}
        </button>
      </form>

      <p className="mx-auto mt-2 max-w-4xl px-1 text-[11px] text-slate-400">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}
