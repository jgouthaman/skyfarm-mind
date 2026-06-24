interface Props {
  step:          number;
  total:         number;
  projectName?:  string;
  vertical?:     string;
  purpose?:      string;
}

export function WizardProgress({ step, total, projectName, vertical, purpose }: Props) {
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

      <p className="text-xs text-white/40 mt-2">
        Step {step} of {total}
      </p>
    </div>
  );
}
