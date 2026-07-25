interface Props {
  role: "librarian" | "customer";
  setRole: (role: "librarian" | "customer") => void;
}

export default function RoleSelector({ role, setRole }: Props) {
  return (
    <div className="relative mb-6 h-10 rounded-full bg-bs-paper border border-bs-line p-[3px]">
      <div
        className={`absolute top-[3px] left-[3px] h-[calc(100%-6px)] w-[calc(50%-3px)] rounded-full bg-bs-teal transition-transform duration-300 ease-out ${
          role === "customer" ? "translate-x-full" : ""
        }`}
      />
      <div className="relative z-10 flex h-full">
        <button
          type="button"
          onClick={() => setRole("librarian")}
          className={`flex-1 text-sm font-medium transition-colors ${
            role === "librarian" ? "text-white" : "text-bs-muted"
          }`}
        >
          Librarian
        </button>
        <button
          type="button"
          onClick={() => setRole("customer")}
          className={`flex-1 text-sm font-medium transition-colors ${
            role === "customer" ? "text-white" : "text-bs-muted"
          }`}
        >
          Reader
        </button>
      </div>
    </div>
  );
}
