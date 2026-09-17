type Variant = "success" | "error";

const styles: Record<Variant, { wrapper: string; button: string }> = {
    success: {
        wrapper: "text-green-700 bg-green-50 border-green-200",
        button: "text-green-600 hover:text-green-800",
    },
    error: {
        wrapper: "text-red-700 bg-red-50 border-red-200",
        button: "text-red-600 hover:text-red-800",
    },
};

type Props = {
    variant: Variant;
    message: string;
    action?: { label: string; onClick: () => void };
};

export default function Banner({ variant, message, action }: Props) {
    return (
        <div
            className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${styles[variant].wrapper}`}
        >
            <span>{message}</span>
            {action && (
                <button onClick={action.onClick} className={`ml-2 text-xs underline ${styles[variant].button}`}>
                    {action.label}
                </button>
            )}
        </div>
    );
}
