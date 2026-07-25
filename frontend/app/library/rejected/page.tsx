"use client";

import Link from "next/link";

export default function RejectedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white px-4">
      <h1 className="text-3xl font-bold text-red-400 mb-4 text-center">
        Application Rejected
      </h1>
      <p className="text-gray-400 text-center max-w-md mb-8">
        Your library application was not approved. If you believe this was a
        mistake, contact the Lectère team or try signing up again with updated
        details.
      </p>
      <Link
        href="/"
        className="bg-[#D4AF37] text-black px-6 py-3 rounded-lg font-semibold hover:opacity-90"
      >
        Back to Lectère
      </Link>
    </div>
  );
}
