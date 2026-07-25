"use client";

import { supabase } from "@/app/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function PendingApprovalPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isMounted = true;

    const checkApprovalStatus = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        const user = session?.user;

        if (!user) {
          if (isMounted) {
            router.replace("/library/login");
          }
          return;
        }

        const { data: library, error: libraryError } = await supabase
          .from("libraries")
          .select("approved, rejected")
          .eq("supabase_user_id", user.id)
          .maybeSingle();

        if (libraryError) throw libraryError;

        if (!isMounted) return;

        // 🔴 Rejected
        if (library?.rejected) {
          clearInterval(interval);
          await supabase.auth.signOut(); // Ensure this completes before redirect might be safer, but logic here follows request
          if (isMounted) {
            router.replace("/library/rejected");
          }
          return;
        }

        // ✅ Approved → librarian dashboard
        if (library?.approved) {
          clearInterval(interval);
          if (isMounted) {
            router.replace("/library/dashboard/librarian");
          }
          return;
        }
      } catch (err: any) {
        console.error("Error checking approval status:", err);
        if (isMounted) {
          setError(
            err.message || "An unexpected error occurred. Please try again."
          );
        }
      }
    };

    // Run once immediately
    checkApprovalStatus();

    // Poll every 3 seconds
    interval = setInterval(checkApprovalStatus, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F172A] text-white">
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-200 text-center max-w-md">
          <p className="font-semibold">Unable to check status</p>
          <p className="text-sm opacity-90">{error}</p>
        </div>
      )}
      <h1 className="text-3xl font-bold text-[#D4AF37] mb-4">
        ⏳ Approval Pending
      </h1>
      <p className="text-gray-400 text-center max-w-md">
        Your librarian account is under review.
        <br />
        You’ll get access once approved by the admin.
      </p>
      {error && (
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-[#D4AF37] text-black font-semibold rounded hover:bg-[#b5952f] transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
