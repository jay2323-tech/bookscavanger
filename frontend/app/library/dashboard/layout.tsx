import { ReactNode } from "react";
import Sidebar from "@/app/components/dashboard/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4.5rem)] bg-bs-paper text-bs-ink">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 md:p-8 pb-24 md:pb-8">{children}</main>
    </div>
  );
}
