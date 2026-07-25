import Link from "next/link";

export const metadata = {
  title: "For libraries — BookScavenger",
  description:
    "List your library inventory on BookScavenger so readers can find your books.",
};

export default function ForLibrariesPage() {
  return (
    <main className="bs-paper-grid min-h-[calc(100vh-4.5rem)]">
      <div className="relative mx-auto max-w-2xl px-6 md:px-10 py-16 md:py-24 bs-fade-in">
        <p className="text-bs-teal text-sm font-semibold tracking-wide mb-4">
          For libraries
        </p>
        <h1
          className="text-4xl md:text-5xl text-bs-ink mb-6 leading-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Put your shelves on the map.
        </h1>
        <p className="text-bs-muted text-lg leading-relaxed mb-10">
          Join BookScavenger so readers nearby can discover books you already
          have. Upload inventory once, stay discoverable in every search.
        </p>

        <ol className="space-y-8 mb-12">
          {[
            {
              t: "Sign up as a librarian",
              d: "Create an account and submit your library name and location.",
            },
            {
              t: "Wait for approval",
              d: "Our team reviews each library before it goes live.",
            },
            {
              t: "Upload your books",
              d: "Add titles one by one or upload Excel with title, author, and ISBN.",
            },
          ].map((step, i) => (
            <li key={step.t} className="flex gap-5">
              <span
                className="text-bs-teal font-semibold tabular-nums"
                style={{ fontFamily: "var(--font-display), Georgia, serif" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-xl font-semibold text-bs-ink mb-1">
                  {step.t}
                </h2>
                <p className="text-bs-muted">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <Link
          href="/library/signup"
          className="inline-flex bg-bs-gold text-bs-gold-ink px-7 py-3.5 rounded-lg font-semibold hover:brightness-95"
        >
          Register your library
        </Link>
      </div>
    </main>
  );
}
