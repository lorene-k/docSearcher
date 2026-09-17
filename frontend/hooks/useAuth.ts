"use client";

import { useState, useCallback, useMemo, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
    login as apiLogin,
    register as apiRegister,
    logout as apiLogout,
    confirmEmail as apiConfirmEmail,
    resendConfirmation as apiResendConfirmation,
    isEmailNotConfirmedError,
    errorCode,
} from "@/lib/api";

const REGISTER_ERRORS: Record<string, string> = {
    email_exists: "This email already has an account. Log in instead.",
    weak_password: "Password must be at least 6 characters.",
    email_invalid: "That email address is not valid.",
    rate_limited: "Too many attempts. Wait a minute and try again.",
    signup_disabled: "New accounts are disabled at the moment.",
};
const REGISTER_FALLBACK = "Could not create the account. Try again in a moment.";

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
    const [needsConfirmation, setNeedsConfirmation] = useState(false);
    const [confirmationResent, setConfirmationResent] = useState(false);

    const login = useCallback(
        async (email: string, password: string) => {
            setLoading(true);
            setError("");
            setNeedsConfirmation(false);
            try {
                await apiLogin(email, password);
                setSessionEmail(email);
                router.push("/chat");
            } catch (err) {
                if (isEmailNotConfirmedError(err)) {
                    setNeedsConfirmation(true);
                    setError("Confirm your email address before logging in.");
                } else {
                    setError("Invalid email or password.");
                }
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
        } catch (err) {
            setError(REGISTER_ERRORS[errorCode(err)] ?? REGISTER_FALLBACK);
        } finally {
            setLoading(false);
        }
    }, []);

    const clearConfirmation = useCallback(() => {
        setConfirmationSent(false);
        setNeedsConfirmation(false);
        setConfirmationResent(false);
    }, []);

    const resendConfirmation = useCallback(async (email: string) => {
        setLoading(true);
        setError("");
        try {
            await apiResendConfirmation(email);
            setConfirmationResent(true);
        } catch {
            setError("Could not send a new link. Try again in a minute.");
        } finally {
            setLoading(false);
        }
    }, []);

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

    return {
        user,
        loading,
        error,
        confirmationSent,
        needsConfirmation,
        confirmationResent,
        login,
        register,
        logout,
        clearConfirmation,
        confirmEmail,
        resendConfirmation,
    };
}
