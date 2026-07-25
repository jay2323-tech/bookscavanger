import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "teal";

const styles: Record<Variant, string> = {
  primary:
    "bg-bs-gold text-bs-gold-ink hover:brightness-95 font-semibold shadow-sm",
  secondary:
    "bg-bs-surface text-bs-ink border border-bs-line hover:border-bs-teal/40",
  ghost: "bg-transparent text-bs-ink hover:bg-bs-surface/80",
  danger: "bg-transparent text-bs-danger border border-bs-danger/30 hover:bg-red-50",
  teal: "bg-bs-teal text-white hover:brightness-110 font-semibold",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition disabled:opacity-50 ${styles[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
