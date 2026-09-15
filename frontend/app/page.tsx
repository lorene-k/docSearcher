import Link from "next/link";

export default function Home() {
    return (
        <div className="page-container flex flex-col items-center text-center gap-6 pt-20">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-3">docSearcher</h1>
                <p className="text-gray-500 text-base max-w-md">
                    Ask questions about your internal documents in plain language. Upload PDFs, ask questions, and get answers with sources.
                </p>
            </div>
            <div className="flex gap-3">
                <Link href="/chat" className="px-5 py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
                    Get started
                </Link>
                <Link href="/upload" className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
                    Upload a document
                </Link>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-lg">
                {[
                    { title: "3-tier RAG", desc: "High, low, and no-match similarity" },
                    { title: "Gemini Flash", desc: "Fast generation with Groq fallback" },
                    { title: "History", desc: "Conversations saved per user" },
                ].map(({ title, desc }) => (
                    <div key={title} className="card p-4 text-left">
                        <p className="text-xs font-semibold text-gray-800 mb-1">{title}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
