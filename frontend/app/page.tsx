"use client";

import Link from "next/link";
import { useMe } from "@/components/MeProvider";

const POINTS = [
    { title: "Answers with sources", text: "Every answer cites the passages it came from, so you can check it." },
    {
        title: "One organization, clear roles",
        text: "Owners manage people, admins manage documents, members read and ask.",
    },
    {
        title: "Share as widely as you mean to",
        text: "Keep a document to yourself, open it to one group, or to everyone.",
    },
];

export default function Home() {
    const { me } = useMe();

    return (
        <div className="page flex flex-col gap-14 pt-16">
            <section className="max-w-3xl">
                <h1 className="text-4xl font-medium tracking-tight text-ink sm:text-5xl">
                    Ask your team&apos;s documents a question.
                </h1>
                <p className="mt-4 max-w-lg text-sm text-muted">
                    Upload PDFs, decide who in your organization can see them, and get answers that point back to the
                    exact passage.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    {me ? (
                        <>
                            <Link href="/chat" className="btn btn-primary">
                                Open the chat
                            </Link>
                            <Link href="/documents" className="btn btn-outline">
                                Browse documents
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link href="/login?mode=register" className="btn btn-primary">
                                Create an organization
                            </Link>
                            <Link href="/login" className="btn btn-outline">
                                Log in
                            </Link>
                        </>
                    )}
                </div>
            </section>
            <section className="grid gap-4 sm:grid-cols-3">
                {POINTS.map(({ title, text }) => (
                    <div key={title} className="panel p-5">
                        <p className="text-sm font-medium text-ink">{title}</p>
                        <p className="hint mt-1">{text}</p>
                    </div>
                ))}
            </section>
        </div>
    );
}
