"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Banner from "@/components/Banner";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "register";

function AuthCard({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
            <div className="card w-full max-w-md p-8">{children}</div>
        </div>
    );
}

function LoginForm() {
    const params = useSearchParams();
    const paramMode: Mode = params.get("mode") === "register" ? "register" : "login";
    const [mode, setMode] = useState<Mode>(paramMode);
    const [seenParamMode, setSeenParamMode] = useState<Mode>(paramMode);
    // The navbar's "Sign up" link changes the URL while this page is open
    if (paramMode !== seenParamMode) {
        setSeenParamMode(paramMode);
        setMode(paramMode);
    }
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [orgName, setOrgName] = useState("");
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
        else await register(email, password, { first_name: firstName, last_name: lastName, org_name: orgName });
    };

    const switchMode = (next: Mode) => {
        clearConfirmation();
        setMode(next);
    };

    if (mode === "register" && confirmationSent) {
        return (
            <AuthCard>
                <h1 className="page-title">Check your email</h1>
                <p className="page-lead mb-6">
                    We sent a confirmation link to {email}. Open it to activate your account and your organization
                    {orgName.trim() ? ` "${orgName.trim()}"` : ""}.
                </p>
                <button onClick={() => switchMode("login")} className="btn btn-outline">
                    Back to log in
                </button>
            </AuthCard>
        );
    }

    return (
        <AuthCard>
            <h1 className="page-title">{mode === "login" ? "Log in" : "Create your organization"}</h1>
            <p className="page-lead mb-6">
                {mode === "login"
                    ? "Welcome back."
                    : "You will own this organization and can invite people to it later."}
            </p>
            {error && <Banner variant="error" className="mb-4" message={error} />}
            {confirmationResent ? (
                <Banner
                    variant="success"
                    className="mb-4"
                    message="A new confirmation link is on its way. Check your email."
                />
            ) : (
                needsConfirmation && (
                    <button
                        onClick={() => resendConfirmation(email)}
                        disabled={loading}
                        className="link mb-4 text-sm disabled:opacity-50"
                    >
                        Send me a new confirmation link
                    </button>
                )
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {mode === "register" && (
                    <>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label htmlFor="first-name" className="label">
                                    First name
                                </label>
                                <input
                                    id="first-name"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    required
                                    autoComplete="given-name"
                                    className="field"
                                />
                            </div>
                            <div>
                                <label htmlFor="last-name" className="label">
                                    Last name
                                </label>
                                <input
                                    id="last-name"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    required
                                    autoComplete="family-name"
                                    className="field"
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="org-name" className="label">
                                Organization name
                            </label>
                            <input
                                id="org-name"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                required
                                autoComplete="organization"
                                placeholder="Acme Research"
                                className="field"
                            />
                            <p className="hint mt-1">
                                {"Joining an existing organization? Ask its owner for an invitation instead."}
                            </p>
                        </div>
                    </>
                )}
                <div>
                    <label htmlFor="email" className="label">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="field"
                    />
                </div>
                <div>
                    <label htmlFor="password" className="label">
                        Password
                    </label>
                    <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        className="field"
                    />
                    {mode === "register" && <p className="hint mt-1">At least 6 characters.</p>}
                </div>
                <button type="submit" disabled={loading} className="btn btn-primary mt-2 w-full">
                    {loading ? "..." : mode === "login" ? "Log in" : "Create organization"}
                </button>
            </form>
            <p className="hint mt-5 text-center">
                {mode === "login" ? "New here?" : "Already have an account?"}{" "}
                <button onClick={() => switchMode(mode === "login" ? "register" : "login")} className="link">
                    {mode === "login" ? "Create an organization" : "Log in"}
                </button>
            </p>
            <p className="hint mt-2 text-center">
                <Link href="/" className="link">
                    Back to home
                </Link>
            </p>
        </AuthCard>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<AuthCard>{null}</AuthCard>}>
            <LoginForm />
        </Suspense>
    );
}
