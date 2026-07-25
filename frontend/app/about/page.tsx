import Link from "next/link";

export const metadata = {
  title: "About — BookScavenger",
  description: "What BookScavenger is and why physical book discovery matters.",
};

export default function AboutPage() {
  return (
    <main className="bs-paper-grid min-h-[calc(100vh-4.5rem)]">
      <div className="relative mx-auto max-w-2xl px-6 md:px-10 py-16 md:py-24 bs-fade-in">
        <p className="text-bs-teal text-sm font-semibold tracking-wide mb-4">
          About
        </p>
        <h1
          className="text-4xl md:text-5xl text-bs-ink mb-6 leading-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Making shelves searchable.
        </h1>
        <p className="text-bs-muted text-lg leading-relaxed mb-6">
          BookScavenger is a book discovery platform. You search for a title,
          author, or ISBN — we find which nearby libraries have that book,
          sorted by distance so you can walk in and pick it up.
        </p>
        <p className="text-bs-muted text-lg leading-relaxed mb-6">
          Online catalogs are fragmented. Local shelves are invisible until you
          visit. BookScavenger connects readers to real inventory from libraries
          that choose to share what they hold.
        </p>
        <p className="text-bs-muted text-lg leading-relaxed mb-10">
          The long-term vision is a unified map of physical books — so finding
          a paper copy is as easy as an online search.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/search"
            className="inline-flex justify-center bg-bs-gold text-bs-gold-ink px-6 py-3 rounded-lg font-semibold hover:brightness-95"
          >
            Find a book
          </Link>
          <Link
            href="/for-libraries"
            className="inline-flex justify-center border border-bs-line bg-bs-surface px-6 py-3 rounded-lg text-bs-ink hover:border-bs-teal hover:text-bs-teal"
          >
            For libraries
          </Link>
        </div>
      </div>
    </main>
  );
}
