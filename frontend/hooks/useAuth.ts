"use client";

import { useState, useCallback, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    confirmEmail as apiConfirmEmail,
} from "@/lib/api";

export type AuthUser = { email: string };

const SESSION_KEY = "user_email";
const SESSION_EVENT = "session-change";

// localStorage only fires "storage" for other tabs, so same-tab writes dispatch SESSION_EVENT
const subscribeToSession = (onChange: () => void): (() => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener(SESSION_EVENT, onChange);
    return () => {
        window.removeEventListener("storage", onChange);
        window.removeEventListener(SESSION_EVENT, onChange);
    };
};

const setSessionEmail = (email: string | null): void => {
    if (email) localStorage.setItem(SESSION_KEY, email);
    else localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event(SESSION_EVENT));
};

// Returns undefined until the client has read localStorage (server render and hydration), null when logged out
export const useSessionEmail = (): string | null | undefined =>
    useSyncExternalStore(
        subscribeToSession,
        () => localStorage.getItem(SESSION_KEY),
        () => undefined,
    );

export function useAuth() {
    const router = useRouter();
    const sessionEmail = useSessionEmail();
    const user = useMemo<AuthUser | null>(() => (sessionEmail ? { email: sessionEmail } : null), [sessionEmail]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [confirmationSent, setConfirmationSent] = useState(false);

    const login = useCallback(
        async (email: string, password: string) => {
            setLoading(true);
            setError("");
            try {
                await apiLogin(email, password);
                setSessionEmail(email);
                router.push("/chat");
            } catch {
                setError("Invalid email or password.");
            } finally {
                setLoading(false);
            }
        },
        [router],
    );

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

    const confirmEmail = useCallback(async (tokenHash: string, type: string): Promise<boolean> => {
        try {
            const { email } = await apiConfirmEmail(tokenHash, type);
            setSessionEmail(email);
            return true;
        } catch {
            return false;
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await apiLogout();
        } catch {
            // best-effort: proceed to clear local session even if the request fails
        } finally {
            setSessionEmail(null);
            router.push("/login");
        }
    }, [router]);

    return { user, loading, error, confirmationSent, login, register, logout, clearConfirmation, confirmEmail };
}
