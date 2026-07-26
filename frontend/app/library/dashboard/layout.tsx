import { ReactNode } from "react";
import Sidebar from "@/app/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bs-field text-bs-ink">
      <Sidebar />
      <main className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 py-6 md:py-8">
        {children}
      </main>
    </div>
  );
}
