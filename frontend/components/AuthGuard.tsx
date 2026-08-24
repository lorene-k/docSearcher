"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const email = localStorage.getItem("user_email");
        if (!email) {
            router.replace("/login");
        } else {
            setChecked(true);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!checked) return null;
    return <>{children}</>;
}
