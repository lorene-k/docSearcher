import SourceCard from "@/components/SourceCard";
import type { Source } from "@/lib/api";

type Props = {
    text: string;
    role: "user" | "assistant";
    sources?: Source[];
    isTyping?: boolean;
};

export default function MessageBubble({ text, role, sources, isTyping }: Props) {
    const isUser = role === "user";

    return (
        <div className={`flex animate-fade-slide-in ${isUser ? "justify-end" : "justify-start"}`}>
            <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm ${
                    isUser ? "rounded-br-md bg-plum text-white" : "rounded-bl-md bg-lilac text-ink"
                }`}
            >
                {isTyping ? (
                    <div className="flex h-4 items-center gap-1" aria-label="Thinking">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-plum [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-plum [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-plum [animation-delay:300ms]" />
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap">{text}</p>
                )}
                {sources && sources.length > 0 && (
                    <div className="mt-3 flex flex-col gap-2">
                        <p className="hint">Sources</p>
                        {sources.map((source, i) => (
                            <SourceCard key={source.filename + i} source={source} index={i} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
