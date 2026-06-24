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
      <label className="block text-[11px] uppercase tracking-wider text-white/50 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1a2035] rounded-lg px-3.5 py-2.5 text-sm text-white outline-none focus:border-[#378ADD]/60"
        style={{ border: "0.5px solid rgba(255,255,255,0.1)" }}
      />
    </div>
  );
}
