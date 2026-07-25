"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    User,
    BookOpen,
} from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();

    const linkClass = (path: string) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition ${pathname === path
            ? "bg-white/10 text-white"
            : "text-neutral-400 hover:text-white hover:bg-white/5"
        }`;

    return (
        <aside className="w-64 border-r border-white/10 bg-neutral-900 p-6 hidden md:block">
            <h2 className="text-xl font-semibold mb-8">Library Dashboard</h2>

            <nav className="space-y-2">
                <Link href="/library/dashboard" className={linkClass("/library/dashboard")}>
                    <LayoutDashboard size={18} />
                    Overview
                </Link>

                <Link
                    href="/library/dashboard/customer"
                    className={linkClass("/library/dashboard/customer")}
                >
                    <User size={18} />
                    Customer
                </Link>

                <Link
                    href="/library/dashboard/librarian"
                    className={linkClass("/library/dashboard/librarian")}
                >
                    <BookOpen size={18} />
                    Librarian
                </Link>
            </nav>
        </aside>
    );
}
