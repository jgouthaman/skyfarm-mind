type FieldInputProps = {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
};

export function FieldInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
}: FieldInputProps) {
  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider mb-1.5" style={{ color: "var(--mh-dim)" }}>{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
        style={{ background: "var(--mh-panel)", border: "1px solid var(--mh-hairline)", color: "var(--mh-ink)" }}
      />
    </div>
  );
}
