import type { UploadStep } from "@/hooks/useUpload";

type Props = { step: UploadStep; progress: number; chunksCreated: number };

const STEPS: { key: UploadStep; label: string }[] = [
    { key: "uploading", label: "Uploading" },
    { key: "processing", label: "Reading" },
    { key: "indexing", label: "Indexing" },
    { key: "done", label: "Ready" },
];

export default function UploadProgress({ step, progress, chunksCreated }: Props) {
    const currentIndex = STEPS.findIndex((s) => s.key === step);
    return (
        <div className="flex flex-col gap-4">
            <ol className="flex flex-wrap items-center gap-2">
                {STEPS.map(({ key, label }, i) => {
                    const done = i < currentIndex;
                    const active = i === currentIndex;
                    return (
                        <li key={key} className="flex items-center gap-2">
                            <span
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                                    done
                                        ? "bg-plum text-white"
                                        : active
                                          ? "bg-plum-deep text-white"
                                          : "bg-lilac text-muted"
                                }`}
                            >
                                {done ? "✓" : i + 1}
                            </span>
                            <span
                                className={`text-xs ${active ? "font-medium text-ink" : done ? "text-plum" : "text-muted"}`}
                            >
                                {label}
                            </span>
                            {i < STEPS.length - 1 && <span className={`h-px w-6 ${done ? "bg-plum" : "bg-line"}`} />}
                        </li>
                    );
                })}
            </ol>
            {step === "uploading" && (
                <div className="h-1.5 w-full rounded-full bg-lilac">
                    <div
                        className="h-1.5 rounded-full bg-plum transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
            {step === "done" && <p className="text-sm text-success">Ready. {chunksCreated} passages indexed.</p>}
        </div>
    );
}
