interface Props {
  role: "librarian" | "customer";
  setRole: (role: "librarian" | "customer") => void;
}

export default function RoleSelector({ role, setRole }: Props) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-bs-line bg-bs-paper p-1">
      {(
        [
          { id: "librarian" as const, label: "Librarian" },
          { id: "customer" as const, label: "Reader" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setRole(opt.id)}
          className={`rounded-md py-2.5 text-sm font-medium transition ${
            role === opt.id
              ? "bg-bs-surface text-bs-teal shadow-sm"
              : "text-bs-muted hover:text-bs-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
