"use client";

import AuthShell from "@/app/components/AuthShell";
import Button from "@/app/components/ui/Button";
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
          clearInterval(interval);
          window.location.assign("/library/dashboard/overview");
          return;
        }

        setError(null);
      } catch (err: unknown) {
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

  return (
    <AuthShell
      eyebrow="Librarian"
      title="Approval pending"
      subtitle={
        libraryName
          ? `${libraryName} is under review. You’ll get access once an admin approves it.`
          : "Your library application is under review. You’ll get access once an admin approves it."
      }
    >
      <div className="flex items-center gap-3 rounded-lg border border-bs-line bg-bs-paper/60 px-4 py-3 mb-6">
        <span className="h-2 w-2 rounded-full bg-bs-gold animate-pulse" />
        <p className="text-sm text-bs-muted">Waiting for admin review…</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-bs-danger/30 bg-bs-danger/5 px-4 py-3 text-sm text-bs-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        {error && (
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={() => router.push("/library/onboarding?edit=1")}
        >
          Edit application
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="flex-1"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/");
          }}
        >
          Sign out
        </Button>
      </div>
    </AuthShell>
  );
}
