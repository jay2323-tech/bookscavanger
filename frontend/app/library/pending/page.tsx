"use client";

import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type StatusPayload = {
  role: string;
  library: {
    id: string | number;
    name?: string;
    approved: boolean;
    rejected: boolean;
  } | null;
};

async function fetchStatus(token: string): Promise<StatusPayload> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/library/onboarding/status`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error("Failed to check approval status");
  return res.json();
}

export default function PendingApprovalPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [libraryName, setLibraryName] = useState<string | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let isMounted = true;
    let nullLibraryHits = 0;

    const checkApprovalStatus = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (!session?.user) {
          if (isMounted) router.replace("/library/login");
          return;
        }

        const status = await fetchStatus(session.access_token);
        if (!isMounted) return;

        const library = status.library;

        if (!library) {
          nullLibraryHits += 1;
          // Brief grace period after submit before bouncing to onboarding
          if (nullLibraryHits >= 3) {
            clearInterval(interval);
            router.replace("/library/onboarding");
          }
          return;
        }

        nullLibraryHits = 0;
        if (library.name) setLibraryName(library.name);

        if (library.rejected) {
          clearInterval(interval);
          router.replace("/library/rejected");
          return;
        }

        if (library.approved) {
          // Status API self-heals role → librarian; don't stay stuck on pending
          clearInterval(interval);
          window.location.assign("/library/dashboard/librarian");
          return;
        }

        setError(null);
      } catch (err: unknown) {
        console.error("Error checking approval status:", err);
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "An unexpected error occurred. Please try again."
          );
        }
      }
    };

    checkApprovalStatus();
    interval = setInterval(checkApprovalStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-bs-paper text-bs-ink px-4 bs-field">
      {error && (
        <div className="mb-6 p-4 border border-bs-danger/30 bg-bs-danger/5 rounded-lg text-bs-danger text-center max-w-md">
          <p className="font-semibold">Unable to check status</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      )}
      <p className="text-xs uppercase tracking-[0.14em] text-bs-muted mb-2">
        Librarian
      </p>
      <h1
        className="text-3xl font-semibold text-bs-ink mb-4 text-center"
        style={{ fontFamily: "var(--font-display), Georgia, serif" }}
      >
        Approval pending
      </h1>
      <p className="text-bs-muted text-center max-w-md">
        {libraryName ? (
          <>
            <span className="text-bs-ink font-medium">{libraryName}</span> is
            under review.
            <br />
          </>
        ) : (
          <>Your librarian account is under review.
            <br />
          </>
        )}
        You&apos;ll get access once an admin approves it.
      </p>
      <div className="mt-8 flex flex-wrap gap-3 justify-center">
        {error && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-bs-gold text-bs-gold-ink font-semibold rounded-lg"
          >
            Retry
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push("/library/onboarding?edit=1")}
          className="px-4 py-2 border border-bs-line rounded-lg text-sm text-bs-muted hover:text-bs-teal"
        >
          Edit application
        </button>
        <button
          type="button"
          onClick={signOut}
          className="px-4 py-2 border border-bs-line rounded-lg text-sm text-bs-muted hover:text-bs-danger"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
