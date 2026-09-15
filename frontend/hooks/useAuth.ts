"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "@/lib/api";

export type AuthUser = { email: string };

export function useAuth() {
    const router = useRouter();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmationSent, setConfirmationSent] = useState(false);

    useEffect(() => {
        const email = localStorage.getItem("user_email");
        if (email) setUser({ email });
    }, []);

    const saveSession = (email: string) => {
        localStorage.setItem("user_email", email);
        setUser({ email });
    };

    const login = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError("");
        try {
            await apiLogin(email, password);
            saveSession(email);
            router.push("/chat");
        } catch {
            setError("Invalid email or password.");
        } finally {
            setLoading(false);
        }
    }, [router]);

    const register = useCallback(async (email: string, password: string) => {
        setLoading(true);
        setError("");
        setConfirmationSent(false);
        try {
            await apiRegister(email, password);
            setConfirmationSent(true);
        } catch {
            setError("This email is already in use, or something went wrong.");
        } finally {
            setLoading(false);
        }
    }, []);

    const clearConfirmation = useCallback(() => setConfirmationSent(false), []);

    const logout = useCallback(async () => {
        try {
            await apiLogout();
        } catch {
            // best-effort: proceed to clear local session even if the request fails
        } finally {
            localStorage.removeItem("user_email");
            setUser(null);
            router.push("/login");
        }
    }, [router]);

    return { user, loading, error, confirmationSent, login, register, logout, clearConfirmation };
}
