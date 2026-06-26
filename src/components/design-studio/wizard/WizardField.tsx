export function WizardInput({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-[13px] text-white/70 mb-1.5">{label}</label>
      <input
        className="w-full h-11 rounded-[10px] px-3 text-sm text-white
          placeholder-white/40 bg-white/10 border border-white/15
          focus:outline-none focus:border-white/40 transition-colors"
        {...props}
      />
    </div>
  );
}

export function WizardSelect({
  label,
  options,
  ...props
}: {
  label: string;
  options: readonly string[] | string[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-[13px] text-white/70 mb-1.5">{label}</label>
      <select
        className="w-full h-11 rounded-[10px] px-3 text-sm text-white
          bg-white/10 border border-white/15 focus:outline-none
          focus:border-white/40 appearance-none transition-colors"
        {...props}
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-[#1e2d45] text-white">
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function WizardToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className="flex items-center justify-between rounded-xl
        border border-white/10 px-4 py-3 cursor-pointer
        hover:bg-white/5 transition-colors"
    >
      <span className="text-sm text-white/80">{label}</span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0
          ${checked ? "bg-[#378ADD]" : "bg-white/20"}`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow
            transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
      </div>
    </label>
  );
}
