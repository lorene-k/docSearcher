"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/components/MeProvider";
import { useAuth } from "@/hooks/useAuth";
import { canUpload } from "@/lib/permissions";
import type { Me } from "@/lib/model";

type NavLink = { href: string; label: string; show?: (me: Me) => boolean };

const LINKS: NavLink[] = [
    { href: "/chat", label: "Chat" },
    { href: "/documents", label: "Documents" },
    { href: "/upload", label: "Upload", show: canUpload },
    { href: "/org", label: "Organization" },
    { href: "/account", label: "Account" },
];

export default function Navbar() {
    const pathname = usePathname();
    const { me } = useMe();
    const { logout } = useAuth();
    const [open, setOpen] = useState(false);
    const [openedOn, setOpenedOn] = useState(pathname);
    // Close the mobile menu when navigating
    if (pathname !== openedOn) {
        setOpenedOn(pathname);
        setOpen(false);
    }

    const links = me ? LINKS.filter((link) => !link.show || link.show(me)) : [];

    const linkClass = (href: string): string =>
        `btn btn-ghost ${pathname === href ? "bg-lilac text-plum-deep" : "text-muted"}`;

    return (
        <header className="border-b border-line bg-white">
            <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-8 lg:px-12">
                <Link
                    href="/"
                    className="rounded-sm text-lg font-medium tracking-tight outline-none focus-visible:ring-2 focus-visible:ring-plum/40"
                >
                    doc<span className="text-plum">Searcher</span>
                </Link>

                {me ? (
                    <>
                        <ul className="hidden items-center gap-1 md:flex">
                            {links.map(({ href, label }) => (
                                <li key={href}>
                                    <Link href={href} className={linkClass(href)}>
                                        {label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <div className="hidden md:block">
                            <button onClick={logout} className="btn btn-outline">
                                Sign out
                            </button>
                        </div>
                        <button
                            onClick={() => setOpen((v) => !v)}
                            aria-expanded={open}
                            aria-label={open ? "Close menu" : "Open menu"}
                            className="btn btn-ghost px-2 md:hidden"
                        >
                            <span aria-hidden="true" className="flex w-5 flex-col gap-1">
                                <span
                                    className={`h-0.5 bg-ink transition-transform ${open ? "translate-y-1.5 rotate-45" : ""}`}
                                />
                                <span className={`h-0.5 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
                                <span
                                    className={`h-0.5 bg-ink transition-transform ${open ? "-translate-y-1.5 -rotate-45" : ""}`}
                                />
                            </span>
                        </button>
                    </>
                ) : (
                    <div className="flex items-center gap-2">
                        <Link href="/login" className="btn btn-ghost">
                            Log in
                        </Link>
                        <Link href="/login?mode=register" className="btn btn-primary">
                            Sign up
                        </Link>
                    </div>
                )}
            </nav>

            {me && open && (
                <div className="border-t border-line bg-lilac px-4 py-3 sm:px-8 md:hidden">
                    <ul className="flex flex-col gap-1">
                        {links.map(({ href, label }) => (
                            <li key={href}>
                                <Link href={href} className={`${linkClass(href)} w-full justify-start`}>
                                    {label}
                                </Link>
                            </li>
                        ))}
                        <li className="pt-2">
                            <button onClick={logout} className="btn btn-outline w-full">
                                Sign out
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </header>
    );
}
