"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type Status = "verifying" | "invalid";

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-sm card p-8 text-center">{children}</div>
        </div>
    );
}

function InvalidCard() {
    const [email, setEmail] = useState("");
    const { resendConfirmation, confirmationResent, loading, error } = useAuth();

    return (
        <Card>
            <h1 className="mb-1 text-lg font-semibold text-gray-900">Invalid or expired link</h1>
            <p className="mb-6 text-sm text-gray-500">
                This confirmation link has already been used or is no longer valid. Enter your email address and we will
                send a new one.
            </p>
            {error && (
                <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            {confirmationResent ? (
                <p className="mb-6 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                    A new confirmation link is on its way. Check your email.
                </p>
            ) : (
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        resendConfirmation(email);
                    }}
                    className="mb-6 flex flex-col gap-3"
                >
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="you@example.com"
                        aria-label="Email"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-gray-900 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
                    >
                        {loading ? "..." : "Send a new link"}
                    </button>
                </form>
            )}
            <Link href="/login" className="text-sm text-gray-700 underline hover:text-gray-900">
                Go to log in
            </Link>
        </Card>
    );
}

function ConfirmCard({ status }: { status: Status }) {
    if (status === "invalid") return <InvalidCard />;
    return (
        <Card>
            <h1 className="mb-1 text-lg font-semibold text-gray-900">Confirming your email</h1>
            <p className="text-sm text-gray-500">Checking your email address...</p>
        </Card>
    );
}

function ConfirmPageInner() {
    const params = useSearchParams();
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    const { confirmEmail } = useAuth();
    const [status, setStatus] = useState<Status>(tokenHash && type ? "verifying" : "invalid");
    // The token is single-use, so StrictMode's double effect run must not send it twice.
    const started = useRef(false);

    useEffect(() => {
        if (!tokenHash || !type || started.current) return;
        started.current = true;
        confirmEmail(tokenHash, type).then((confirmed) => {
            if (confirmed) {
                // Full navigation so the navbar and guards re-read the new session.
                window.location.replace("/chat?email_confirmed=1");
            } else {
                setStatus("invalid");
            }
        });
    }, [tokenHash, type, confirmEmail]);

    return <ConfirmCard status={status} />;
}

export default function ConfirmPage() {
    return (
        <Suspense fallback={<ConfirmCard status="verifying" />}>
            <ConfirmPageInner />
        </Suspense>
    );
}
