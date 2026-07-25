import Link from "next/link";

export const metadata = {
  title: "For libraries — Lectère",
  description: "List your library inventory on Lectère so readers can find your books.",
};

export default function ForLibrariesPage() {
  return (
    <main className="min-h-[calc(100vh-73px)] px-6 md:px-10 py-16 md:py-24">
      <div className="max-w-2xl">
        <p className="text-[#D4AF37] text-sm tracking-wide uppercase mb-4">
          For libraries
        </p>
        <h1
          className="text-4xl md:text-5xl text-[#F8F5F0] mb-6 leading-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Put your shelves on the map.
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-10">
          Join Lectère so readers nearby can discover books you already have.
          Upload inventory once, stay discoverable in every search.
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
              d: "Add titles one by one or upload an Excel sheet with title, author, and ISBN.",
            },
          ].map((step, i) => (
            <li key={step.t} className="flex gap-5">
              <span className="text-[#D4AF37] font-semibold tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2 className="text-xl font-semibold mb-1">{step.t}</h2>
                <p className="text-gray-400">{step.d}</p>
              </div>
            </li>
          ))}
        </ol>

        <Link
          href="/library/signup"
          className="inline-flex bg-[#D4AF37] text-black px-7 py-3.5 rounded-lg font-semibold hover:opacity-90"
        >
          Register your library
        </Link>
      </div>
    </main>
  );
}
