import type { Source } from "@/lib/api";

type Props = { source: Source; index: number };

export default function SourceCard({ source, index }: Props) {
    return (
        <div className="rounded-lg border border-line bg-surface p-3">
            <div className="mb-1 flex items-center justify-between gap-2">
                <p className="truncate text-xs font-medium text-ink">
                    Source {index + 1} - {source.filename}
                </p>
                {source.relevance && (
                    <span className={`pill ${source.relevance === "high" ? "pill-success" : "pill-warning"}`}>
                        {source.relevance === "high" ? "relevant" : "partial"}
                    </span>
                )}
            </div>
            <p className="line-clamp-3 text-xs text-muted">{source.chunk_text}</p>
        </div>
    );
}
