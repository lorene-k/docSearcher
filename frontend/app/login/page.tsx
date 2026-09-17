"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "register";

export default function LoginPage() {
    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const {
        login,
        register,
        loading,
        error,
        confirmationSent,
        needsConfirmation,
        confirmationResent,
        clearConfirmation,
        resendConfirmation,
    } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === "login") await login(email, password);
        else await register(email, password);
    };

    const switchMode = (next: Mode) => {
        clearConfirmation();
        setMode(next);
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm card p-8">
                <h1 className="mb-1 text-lg font-semibold text-gray-900">
                    {mode === "login" ? "Log in" : "Create an account"}
                </h1>
                <p className="mb-6 text-sm text-gray-500">docSearcher</p>
                {mode === "register" && confirmationSent ? (
                    <>
                        <p className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                            Account created. Check your email to confirm your address before logging in.
                        </p>
                        <button
                            onClick={() => switchMode("login")}
                            className="text-sm text-gray-700 underline hover:text-gray-900"
                        >
                            Back to log in
                        </button>
                    </>
                ) : (
                    <>
                        {error && (
                            <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                                {error}
                            </p>
                        )}
                        {confirmationResent ? (
                            <p className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                                A new confirmation link is on its way. Check your email.
                            </p>
                        ) : (
                            needsConfirmation && (
                                <button
                                    onClick={() => resendConfirmation(email)}
                                    disabled={loading}
                                    className="mb-4 text-sm text-gray-700 underline hover:text-gray-900 disabled:opacity-50"
                                >
                                    Send me a new confirmation link
                                </button>
                            )
                        )}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={6}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-lg bg-gray-900 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                            >
                                {loading ? "..." : mode === "login" ? "Log in" : "Create account"}
                            </button>
                        </form>
                        <p className="mt-4 text-center text-xs text-gray-500">
                            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                            <button
                                onClick={() => switchMode(mode === "login" ? "register" : "login")}
                                className="text-gray-700 underline hover:text-gray-900"
                            >
                                {mode === "login" ? "Sign up" : "Log in"}
                            </button>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
