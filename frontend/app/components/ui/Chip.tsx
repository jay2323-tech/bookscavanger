import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  children: ReactNode;
};

export default function Chip({
  active,
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      type="button"
      className={`rounded-full px-3 py-1.5 text-xs font-medium border transition ${
        active
          ? "bg-bs-teal-soft border-bs-teal text-bs-teal"
          : "bg-bs-surface border-bs-line text-bs-muted hover:border-bs-teal/40 hover:text-bs-ink"
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
