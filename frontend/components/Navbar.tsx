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
    const { user, logout } = useAuth();

    return (
        <nav className="bg-white border-b border-gray-200 shadow-sm px-6 py-4 flex items-center justify-between">
            <Link href="/" className="font-semibold text-gray-900">docSearcher</Link>
            <ul className="flex gap-6 items-center">
                {links.map(({ href, label }) => (
                    <li key={href}>
                        <Link href={href} className={`text-sm transition-colors ${pathname === href ? "text-blue-600 border-b-2 border-blue-600 pb-0.5" : "text-gray-500 hover:text-gray-900"}`}>
                            {label}
                        </Link>
                    </li>
                ))}
                <li>
                    {user ? (
                        <button onClick={logout} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                            Déconnexion
                        </button>
                    ) : (
                        <Link href="/login" className="text-sm text-gray-400 hover:text-gray-700 transition-colors">
                            Connexion
                        </Link>
                    )}
                </li>
            </ul>
        </nav>
    );
}
