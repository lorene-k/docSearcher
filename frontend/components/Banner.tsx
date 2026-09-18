type Variant = "success" | "error" | "info";

const styles: Record<Variant, { wrapper: string; button: string }> = {
    success: { wrapper: "bg-success-soft text-success", button: "text-success" },
    error: { wrapper: "bg-danger-soft text-danger", button: "text-danger" },
    info: { wrapper: "bg-base text-plum-deep", button: "text-plum-deep" },
};

type Props = {
    variant: Variant;
    message: string;
    action?: { label: string; onClick: () => void };
    className?: string;
};

export default function Banner({ variant, message, action, className = "" }: Props) {
    return (
        <div
            role={variant === "error" ? "alert" : "status"}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${styles[variant].wrapper} ${className}`}
        >
            <span>{message}</span>
            {action && (
                <button
                    onClick={action.onClick}
                    className={`text-xs underline underline-offset-2 ${styles[variant].button}`}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
