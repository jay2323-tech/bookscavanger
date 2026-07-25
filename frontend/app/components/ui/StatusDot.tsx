type Props = {
  tone?: "ok" | "danger" | "teal" | "muted";
  label: string;
};

const tones = {
  ok: "bg-bs-ok/10 text-bs-ok",
  danger: "bg-bs-danger/10 text-bs-danger",
  teal: "bg-bs-teal-soft text-bs-teal",
  muted: "bg-bs-paper text-bs-muted border border-bs-line",
};

export default function StatusDot({ tone = "muted", label }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          tone === "ok"
            ? "bg-bs-ok"
            : tone === "danger"
              ? "bg-bs-danger"
              : tone === "teal"
                ? "bg-bs-teal"
                : "bg-bs-muted"
        }`}
      />
      {label}
    </span>
  );
}
