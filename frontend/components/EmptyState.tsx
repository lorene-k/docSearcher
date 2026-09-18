import Link from "next/link";

type Props = { title: string; description: string; action?: { label: string; href: string } };

export default function EmptyState({ title, description, action }: Props) {
    return (
        <div className="panel px-6 py-10 text-center">
            <p className="text-sm font-medium text-ink">{title}</p>
            <p className="hint mt-1">{description}</p>
            {action && (
                <Link href={action.href} className="btn btn-primary mt-5">
                    {action.label}
                </Link>
            )}
        </div>
    );
}
