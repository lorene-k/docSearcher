"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "register";

export default function LoginPage() {
    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login, register, loading, error, confirmationSent, clearConfirmation } = useAuth();

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
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="card w-full max-w-sm p-8">
                <h1 className="text-lg font-semibold mb-1 text-gray-900">
                    {mode === "login" ? "Log in" : "Create an account"}
                </h1>
                <p className="text-sm text-gray-500 mb-6">docSearcher</p>
                {mode === "register" && confirmationSent ? (
                    <>
                        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
                            Account created. Check your email to confirm your address before logging in.
                        </p>
                        <button onClick={() => switchMode("login")} className="text-sm underline text-gray-700 hover:text-gray-900">
                            Back to log in
                        </button>
                    </>
                ) : (
                    <>
                        {error && (
                            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-4">{error}</p>
                        )}
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
                                {loading ? "..." : mode === "login" ? "Log in" : "Create account"}
                            </button>
                        </form>
                        <p className="text-xs text-center text-gray-500 mt-4">
                            {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                            <button onClick={() => switchMode(mode === "login" ? "register" : "login")} className="underline text-gray-700 hover:text-gray-900">
                                {mode === "login" ? "Sign up" : "Log in"}
                            </button>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
