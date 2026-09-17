"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const links = [
    { href: "/chat", label: "Chat" },
    { href: "/upload", label: "Upload" },
    { href: "/documents", label: "Documents" },
];

export default function Navbar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();

    return (
        <nav className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
            <Link href="/" className="font-semibold text-gray-900">
                docSearcher
            </Link>
            <ul className="flex items-center gap-6">
                {links.map(({ href, label }) => (
                    <li key={href}>
                        <Link
                            href={href}
                            className={`text-sm transition-colors ${pathname === href ? "border-b-2 border-blue-600 pb-0.5 text-blue-600" : "text-gray-500 hover:text-gray-900"}`}
                        >
                            {label}
                        </Link>
                    </li>
                ))}
                <li>
                    {user ? (
                        <button
                            onClick={logout}
                            className="text-sm text-gray-400 transition-colors hover:text-gray-700"
                        >
                            Log out
                        </button>
                    ) : (
                        <Link href="/login" className="text-sm text-gray-400 transition-colors hover:text-gray-700">
                            Log in
                        </Link>
                    )}
                </li>
            </ul>
        </nav>
    );
}
