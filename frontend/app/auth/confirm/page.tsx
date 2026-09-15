"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

type Status = "verifying" | "invalid";

function ConfirmCard({ status }: { status: Status }) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="card w-full max-w-sm p-8 text-center">
                {status === "verifying" ? (
                    <>
                        <h1 className="text-lg font-semibold mb-1 text-gray-900">Confirming your email</h1>
                        <p className="text-sm text-gray-500">Checking your email address...</p>
                    </>
                ) : (
                    <>
                        <h1 className="text-lg font-semibold mb-1 text-gray-900">Invalid or expired link</h1>
                        <p className="text-sm text-gray-500 mb-6">
                            This confirmation link has already been used or is no longer valid.
                        </p>
                        <Link href="/login" className="text-sm underline text-gray-700 hover:text-gray-900">
                            Go to log in
                        </Link>
                    </>
                )}
            </div>
        </div>
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
