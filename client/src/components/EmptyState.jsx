import {
  MessageCircle,
  Sparkles,
} from 'lucide-react';

export default function EmptyState({
  onExample,
}) {
  const examples = [
    'Explain React hooks in simple terms.',
    'Help me design a REST API.',
    'Give me three ideas for a study plan.',
  ];

  return (
    <div className="flex h-full items-center justify-center px-5 py-8">

      <div className="w-full max-w-xl text-center">

        {/* Icon */}

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
          <Sparkles size={25} />
        </div>

        {/* Heading */}

        <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          How can I help?
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          Ask a question, brainstorm an
          idea, or work through a
          technical problem. Your
          conversation will stay in your
          history.
        </p>

        {/* Suggestions */}

        <div className="mt-7 grid gap-2 sm:grid-cols-3">
          {examples.map(
            (example) => (
              <button
                key={example}
                type="button"
                onClick={() =>
                  onExample(example)
                }
                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left text-xs leading-5 text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
              >
                <MessageCircle
                  size={14}
                  className="mb-2 text-slate-400"
                />

                {example}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}