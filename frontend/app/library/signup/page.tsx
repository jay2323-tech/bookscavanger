"use client";

import RoleSelector from "@/app/components/RoleSelector";
import { supabase } from "@/app/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Role = "customer" | "librarian";

export default function SignupPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const signupCustomer = async () => {
    if (form.password.length < 8)
      throw new Error("Password must be at least 8 characters");

    if (form.password !== form.confirmPassword)
      throw new Error("Passwords do not match");

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          role: "customer",
          name: form.name,
        },
      },
    });

    if (error) throw error;
    router.replace("/library/login");
  };

  const signupLibrarianWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/library/onboarding`,
      },
    });

    if (error) throw error;
  };

  const handleSignup = async () => {
    setError("");
    setLoading(true);

    try {
      if (role === "customer") {
        await signupCustomer();
      } else {
        await signupLibrarianWithGoogle();
      }
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] px-4">
      <div className="w-full max-w-md bg-gray-900 p-8 rounded-xl text-white border border-gray-800">
        <h1 className="text-2xl font-bold text-[#D4AF37] mb-4 text-center">
          Create an Account
        </h1>

        <RoleSelector role={role} setRole={setRole} />

        {role === "customer" && (
          <>
            <input
              placeholder="Full Name"
              className="w-full mb-4 px-4 py-3 rounded bg-gray-800"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <input
              type="email"
              placeholder="Email"
              className="w-full mb-4 px-4 py-3 rounded bg-gray-800"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full mb-4 px-4 py-3 rounded bg-gray-800"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <input
              type="password"
              placeholder="Confirm Password"
              className="w-full mb-4 px-4 py-3 rounded bg-gray-800"
              value={form.confirmPassword}
              onChange={(e) =>
                setForm({ ...form, confirmPassword: e.target.value })
              }
            />
          </>
        )}

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-[#D4AF37] text-black py-3 rounded-lg font-semibold"
        >
          {loading
            ? "Processing..."
            : role === "librarian"
              ? "Continue with Google"
              : "Sign Up"}
        </button>

        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{" "}
          <Link href="/library/login" className="text-[#D4AF37]">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
