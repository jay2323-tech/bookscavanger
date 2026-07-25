import Link from "next/link";

export const metadata = {
  title: "About — BookScavenger",
  description: "What BookScavenger is and why physical book discovery matters.",
};

export default function AboutPage() {
  return (
    <main className="min-h-[calc(100vh-73px)] px-6 md:px-10 py-16 md:py-24">
      <div className="max-w-2xl">
        <p className="text-[#D4AF37] text-sm tracking-wide uppercase mb-4">
          About
        </p>
        <h1
          className="text-4xl md:text-5xl text-[#F8F5F0] mb-6 leading-tight"
          style={{ fontFamily: "var(--font-display), Georgia, serif" }}
        >
          Making shelves searchable.
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-6">
          BookScavenger is a book discovery platform. You search for a title, author,
          or ISBN — we find which nearby libraries have that book, sorted by
          distance so you can walk in and pick it up.
        </p>
        <p className="text-gray-400 text-lg leading-relaxed mb-6">
          Online catalogs are fragmented. Local shelves are invisible until you
          visit. BookScavenger connects readers to real inventory from libraries that
          choose to share what they hold.
        </p>
        <p className="text-gray-400 text-lg leading-relaxed mb-10">
          The long-term vision is a unified map of physical books — libraries
          and bookstores — so finding a paper copy is as easy as an online
          search.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/search"
            className="inline-flex justify-center bg-[#D4AF37] text-black px-6 py-3 rounded-lg font-semibold hover:opacity-90"
          >
            Find a book
          </Link>
          <Link
            href="/for-libraries"
            className="inline-flex justify-center border border-gray-600 px-6 py-3 rounded-lg text-gray-200 hover:border-[#D4AF37] hover:text-[#D4AF37]"
          >
            For libraries
          </Link>
        </div>
      </div>
    </main>
  );
}
