"use client";

import Link from "next/link";

export default function RejectedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bs-paper text-bs-ink px-4">
      <h1 className="text-3xl font-bold text-bs-danger mb-4 text-center">
        Application Rejected
      </h1>
      <p className="text-bs-muted text-center max-w-md mb-8">
        Your library application was not approved. If you believe this was a
        mistake, contact the BookScavenger team or try signing up again with updated
        details.
      </p>
      <Link
        href="/"
        className="bg-bs-gold text-bs-gold-ink px-6 py-3 rounded-lg font-semibold hover:opacity-90"
      >
        Back to BookScavenger
      </Link>
    </div>
  );
}
