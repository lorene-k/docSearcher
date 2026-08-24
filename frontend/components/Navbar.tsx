"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const links = [
    { href: "/chat", label: "Chat" },
    { href: "/upload", label: "Importer" },
    { href: "/documents", label: "Documents" },
];

export default function Navbar() {
    const pathname = usePathname();
    const { logout } = useAuth();

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
            <span className="font-semibold text-gray-900">docSearcher</span>
            <ul className="flex gap-6 items-center">
                {links.map(({ href, label }) => (
                    <li key={href}>
                        <Link href={href} className={`text-sm transition-colors ${pathname === href ? "text-blue-600 border-b-2 border-blue-600 pb-0.5" : "text-gray-500 hover:text-gray-900"}`}>
                            {label}
                        </Link>
                    </li>
                ))}
                <li>
                    <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                        Déconnexion
                    </button>
                </li>
            </ul>
        </nav>
    );
}
