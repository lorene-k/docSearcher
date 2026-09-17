import type { Source } from "@/lib/api";

type Props = { source: Source; index: number };

export default function SourceCard({ source, index }: Props) {
    return (
        <div className="card p-3">
            <div className="mb-1 flex items-center justify-between">
                <p className="text-xs font-medium text-gray-500">
                    Source {index + 1} - {source.filename}
                </p>
                {source.relevance && (
                    <span
                        className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${source.relevance === "high" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
                    >
                        {source.relevance === "high" ? "relevant" : "partial"}
                    </span>
                )}
            </div>
            <p className="line-clamp-3 text-xs text-gray-600">{source.chunk_text}</p>
        </div>
    );
}
