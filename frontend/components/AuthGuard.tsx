"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionEmail } from "@/hooks/useAuth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const email = useSessionEmail();

    useEffect(() => {
        if (email === null) router.replace("/login");
    }, [email, router]);

    if (!email) return null;
    return <>{children}</>;
}
