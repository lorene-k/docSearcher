import Link from "next/link";

export default function Home() {
    return (
        <div className="page-container flex flex-col items-center gap-6 pt-20 text-center">
            <div>
                <h1 className="mb-3 text-3xl font-bold text-gray-900">docSearcher</h1>
                <p className="max-w-md text-base text-gray-500">
                    Ask questions about your internal documents in plain language. Upload PDFs, ask questions, and get
                    answers with sources.
                </p>
            </div>
            <div className="flex gap-3">
                <Link
                    href="/chat"
                    className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm text-white transition-colors hover:bg-gray-700"
                >
                    Get started
                </Link>
                <Link
                    href="/upload"
                    className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                >
                    Upload a document
                </Link>
            </div>
            <div className="mt-4 grid w-full max-w-lg grid-cols-3 gap-4">
                {[
                    { title: "3-tier RAG", desc: "High, low, and no-match similarity" },
                    { title: "Gemini Flash", desc: "Fast generation with Groq fallback" },
                    { title: "History", desc: "Conversations saved per user" },
                ].map(({ title, desc }) => (
                    <div key={title} className="card p-4 text-left">
                        <p className="mb-1 text-xs font-semibold text-gray-800">{title}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
