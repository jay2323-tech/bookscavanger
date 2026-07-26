import type { ReactNode } from "react";
import AdminNav from "@/app/components/dashboard/AdminNav";

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bs-field text-bs-ink">
      <AdminNav />
      <div className="flex-1 min-w-0 pb-20 md:pb-0">{children}</div>
    </div>
  );
}
