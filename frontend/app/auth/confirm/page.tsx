"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Banner from "@/components/Banner";
import { useAuth } from "@/hooks/useAuth";

type Status = "verifying" | "invalid";

function Card({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
            <div className="card w-full max-w-md p-8 text-center">{children}</div>
        </div>
    );
}

function InvalidCard() {
    const [email, setEmail] = useState("");
    const { resendConfirmation, confirmationResent, loading, error } = useAuth();

    return (
        <Card>
            <h1 className="page-title">Invalid or expired link</h1>
            <p className="page-lead mb-6">
                This confirmation link has already been used or is no longer valid. Enter your email address and we will
                send a new one.
            </p>
            {error && <Banner variant="error" className="mb-4" message={error} />}
            {confirmationResent ? (
                <Banner
                    variant="success"
                    className="mb-6"
                    message="A new confirmation link is on its way. Check your email."
                />
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
                        className="field"
                    />
                    <button type="submit" disabled={loading} className="btn btn-primary w-full">
                        {loading ? "..." : "Send a new link"}
                    </button>
                </form>
            )}
            <Link href="/login" className="link text-sm">
                Go to log in
            </Link>
        </Card>
    );
}

function ConfirmCard({ status }: { status: Status }) {
    if (status === "invalid") return <InvalidCard />;
    return (
        <Card>
            <h1 className="page-title">Confirming your email</h1>
            <p className="page-lead">Checking your email address...</p>
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
