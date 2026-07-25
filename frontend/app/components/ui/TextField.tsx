import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export default function TextField({ label, className = "", id, ...rest }: Props) {
  const inputId = id || rest.name;
  return (
    <label className="block text-sm text-bs-muted">
      {label && <span className="mb-1.5 block font-medium text-bs-ink">{label}</span>}
      <input
        id={inputId}
        className={`w-full rounded-lg border border-bs-line bg-bs-surface px-4 py-3 text-bs-ink placeholder:text-bs-muted/70 focus:outline-none focus:ring-2 focus:ring-bs-teal/40 ${className}`}
        {...rest}
      />
    </label>
  );
}
