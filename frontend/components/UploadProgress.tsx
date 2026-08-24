import type { UploadStep } from "@/hooks/useUpload";

type Props = { step: UploadStep; progress: number; chunksCreated: number };

const STEPS: { key: UploadStep; label: string }[] = [
    { key: "uploading", label: "Envoi" },
    { key: "processing", label: "Traitement" },
    { key: "indexing", label: "Indexation" },
    { key: "done", label: "Terminé" },
];
const STEP_ORDER: UploadStep[] = ["uploading", "processing", "indexing", "done"];

export default function UploadProgress({ step, progress, chunksCreated }: Props) {
    const currentIndex = STEP_ORDER.indexOf(step);
    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
                {STEPS.map(({ key, label }, i) => {
                    const idx = STEP_ORDER.indexOf(key);
                    const done = idx < currentIndex;
                    const active = idx === currentIndex;
                    return (
                        <div key={key} className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${done ? "bg-green-500 text-white" : active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-400"}`}>
                                {done ? "✓" : i + 1}
                            </div>
                            <span className={`text-xs ${active ? "text-gray-900 font-medium" : done ? "text-green-600" : "text-gray-400"}`}>{label}</span>
                            {i < STEPS.length - 1 && <div className={`h-px w-6 ${done ? "bg-green-400" : "bg-gray-200"}`} />}
                        </div>
                    );
                })}
            </div>
            {step === "uploading" && (
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div className="bg-gray-900 h-1.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
            )}
            {step === "done" && (
                <p className="text-sm text-green-700">Fichier importé · {chunksCreated} fragments indexés.</p>
            )}
        </div>
    );
}
