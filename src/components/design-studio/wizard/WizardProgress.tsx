interface Props {
  step:          number;
  total:         number;
  projectName?:  string;
  vertical?:     string;
  purpose?:      string;
  onStartOver:   () => void;
}

export function WizardProgress({ step, total, projectName, vertical, purpose, onStartOver }: Props) {
  return (
    <div>
      {step > 1 && projectName && (
        <p className="text-sm text-white/60 mb-3 truncate">
          {projectName} · {vertical} · {purpose}
        </p>
      )}

      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < step ? "bg-[#378ADD]" : "bg-white/20"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-white/40">
          Step {step} of {total}
        </p>
        <button
          type="button"
          onClick={onStartOver}
          className="text-xs text-white/30 hover:text-white/60 underline underline-offset-2 transition-colors"
        >
          Start over
        </button>
      </div>
    </div>
  );
}
