import type { UploadStep } from "@/hooks/useUpload";

type Props = { step: UploadStep; progress: number; chunksCreated: number };

const STEPS: { key: UploadStep; label: string }[] = [
    { key: "uploading", label: "Uploading" },
    { key: "processing", label: "Processing" },
    { key: "indexing", label: "Indexing" },
    { key: "done", label: "Done" },
];

export default function UploadProgress({ step, progress, chunksCreated }: Props) {
    const currentIndex = STEPS.findIndex((s) => s.key === step);
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                {STEPS.map(({ key, label }, i) => {
                    const done = i < currentIndex;
                    const active = i === currentIndex;
                    return (
                        <div key={key} className="flex items-center gap-2">
                            <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors ${done ? "bg-green-500 text-white" : active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-400"}`}
                            >
                                {done ? "✓" : i + 1}
                            </div>
                            <span
                                className={`text-xs ${active ? "font-medium text-gray-900" : done ? "text-green-600" : "text-gray-400"}`}
                            >
                                {label}
                            </span>
                            {i < STEPS.length - 1 && (
                                <div className={`h-px w-6 ${done ? "bg-green-400" : "bg-gray-200"}`} />
                            )}
                        </div>
                    );
                })}
            </div>
            {step === "uploading" && (
                <div className="h-1.5 w-full rounded-full bg-gray-200">
                    <div
                        className="h-1.5 rounded-full bg-gray-900 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
            {step === "done" && (
                <p className="text-sm text-green-700">File uploaded - {chunksCreated} chunks indexed.</p>
            )}
        </div>
    );
}
