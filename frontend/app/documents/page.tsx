"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import MeGate from "@/components/MeGate";
import { VisibilityBadge } from "@/components/Badges";
import Banner from "@/components/Banner";
import Dialog from "@/components/Dialog";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import Toast from "@/components/Toast";
import { useDocuments } from "@/hooks/useDocuments";
import { getGroups } from "@/lib/api";
import { VISIBILITY_LABEL } from "@/lib/model";
import type { Document, Group, Me, Visibility } from "@/lib/model";
import { canDeleteDocument, canPromoteDocument, canUpload, nextVisibilities } from "@/lib/permissions";

type Filter = "all" | Visibility;

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "private", label: "Only me" },
    { key: "group", label: "Groups" },
    { key: "org", label: "Whole organization" },
];

const formatDate = (iso: string | null): string =>
    iso ? new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "";

function ShareDialog({
    document,
    groups,
    onClose,
    onShare,
}: {
    document: Document | null;
    groups: Group[];
    onClose: () => void;
    onShare: (visibility: Visibility, groupId: string | null) => Promise<void>;
}) {
    const choices = document ? nextVisibilities(document) : [];
    const [visibility, setVisibility] = useState<Visibility>("org");
    const [groupId, setGroupId] = useState("");
    const [saving, setSaving] = useState(false);
    const [opened, setOpened] = useState<Document | null>(null);

    // Start from a fresh choice for each document opened
    if (document !== opened) {
        setOpened(document);
        setVisibility(choices.includes("group") && groups.length > 0 ? "group" : "org");
        setGroupId(groups[0]?.id ?? "");
    }

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        await onShare(visibility, visibility === "group" ? groupId : null);
        setSaving(false);
    };

    return (
        <Dialog open={document !== null} title="Share more widely" onClose={onClose}>
            <p className="hint mb-4">
                {document?.filename} is visible to {document ? VISIBILITY_LABEL[document.visibility].toLowerCase() : ""}
                . Sharing cannot be undone.
            </p>
            <form onSubmit={submit} className="flex flex-col gap-3">
                {choices.includes("group") && (
                    <label
                        className={`card flex cursor-pointer items-start gap-3 p-3 ${groups.length === 0 ? "opacity-50" : ""}`}
                    >
                        <input
                            type="radio"
                            name="visibility"
                            checked={visibility === "group"}
                            disabled={groups.length === 0}
                            onChange={() => setVisibility("group")}
                            className="mt-1 accent-plum"
                        />
                        <span className="flex-1">
                            <span className="block text-sm font-medium">One group</span>
                            {groups.length === 0 ? (
                                <span className="hint">No groups yet.</span>
                            ) : (
                                <select
                                    value={groupId}
                                    onChange={(e) => setGroupId(e.target.value)}
                                    aria-label="Group"
                                    className="field mt-2"
                                >
                                    {groups.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </span>
                    </label>
                )}
                <label className="card flex cursor-pointer items-start gap-3 p-3">
                    <input
                        type="radio"
                        name="visibility"
                        checked={visibility === "org"}
                        onChange={() => setVisibility("org")}
                        className="mt-1 accent-plum"
                    />
                    <span>
                        <span className="block text-sm font-medium">Whole organization</span>
                        <span className="hint">Everyone in the organization can read it.</span>
                    </span>
                </label>
                <div className="mt-2 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="btn btn-ghost">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving || (visibility === "group" && !groupId)}
                        className="btn btn-primary"
                    >
                        Share
                    </button>
                </div>
            </form>
        </Dialog>
    );
}

function DocumentRow({
    document,
    me,
    groups,
    onShare,
    onDelete,
}: {
    document: Document;
    me: Me;
    groups: Group[];
    onShare: () => void;
    onDelete: () => void;
}) {
    const [confirming, setConfirming] = useState(false);
    const mine = document.uploader_id === me.id;

    return (
        <li className="row">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{document.filename}</p>
                <p className="hint mt-0.5">
                    {mine ? "You" : (document.uploader_name ?? "Unknown uploader")}
                    {document.created_at ? `, ${formatDate(document.created_at)}` : ""}
                </p>
            </div>
            <VisibilityBadge visibility={document.visibility} groupName={document.group_name} />
            <div className="flex items-center gap-1">
                {canPromoteDocument(me, document, groups) && (
                    <button onClick={onShare} className="btn btn-ghost btn-sm">
                        Share wider
                    </button>
                )}
                {canDeleteDocument(me, document, groups) &&
                    (confirming ? (
                        <span className="flex items-center gap-1">
                            <span className="hint">Delete?</span>
                            <button onClick={onDelete} className="btn btn-danger btn-sm">
                                Yes
                            </button>
                            <button onClick={() => setConfirming(false)} className="btn btn-ghost btn-sm">
                                No
                            </button>
                        </span>
                    ) : (
                        <button onClick={() => setConfirming(true)} className="btn btn-ghost btn-sm text-muted">
                            Delete
                        </button>
                    ))}
            </div>
        </li>
    );
}

function DocumentsPageInner({ me }: { me: Me }) {
    const { documents, loading, error, remove, share } = useDocuments();
    const [groups, setGroups] = useState<Group[]>([]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<Filter>("all");
    const [sharing, setSharing] = useState<Document | null>(null);
    const [toast, setToast] = useState<{ message: string; variant: "success" | "error" } | null>(null);

    useEffect(() => {
        getGroups()
            .then(setGroups)
            .catch(() => {});
    }, []);

    const filtered = documents.filter(
        (d) => (filter === "all" || d.visibility === filter) && d.filename.toLowerCase().includes(search.toLowerCase()),
    );

    const handleDelete = async (document: Document) => {
        try {
            await remove(document);
            setToast({ message: `Deleted "${document.filename}".`, variant: "success" });
        } catch {
            // remove() already reports the failure through the error banner
        }
    };

    const handleShare = async (visibility: Visibility, groupId: string | null) => {
        if (!sharing) return;
        try {
            await share(sharing, visibility, groupId);
            setToast({ message: `Shared "${sharing.filename}".`, variant: "success" });
        } catch {
            setToast({ message: "Could not change who sees this document.", variant: "error" });
        }
        setSharing(null);
    };

    const lead = canUpload(me)
        ? "Documents you uploaded, and those shared with your groups or the whole organization."
        : "Documents shared with your groups or the whole organization.";

    return (
        <div className="page">
            <PageHeader title="Documents" lead={lead}>
                {canUpload(me) && (
                    <Link href="/upload" className="btn btn-primary">
                        Upload a PDF
                    </Link>
                )}
            </PageHeader>

            {documents.length > 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by file name"
                        aria-label="Search documents"
                        className="field sm:max-w-xs"
                    />
                    <div className="flex flex-wrap gap-1" role="group" aria-label="Filter by visibility">
                        {FILTERS.map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => setFilter(key)}
                                aria-pressed={filter === key}
                                className={`btn btn-sm ${filter === key ? "btn-primary" : "btn-ghost text-muted"}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {error && <Banner variant="error" className="mb-4" message={error} />}

            {loading && (
                <ul className="rows">
                    {[1, 2, 3].map((i) => (
                        <li key={i} className="row">
                            <div className="h-5 w-2/3 animate-pulse rounded bg-base" />
                        </li>
                    ))}
                </ul>
            )}

            {!loading && documents.length === 0 && (
                <EmptyState
                    title="No documents yet"
                    description={
                        canUpload(me)
                            ? "Upload a PDF and choose who in the organization can read it."
                            : "Nothing has been shared with you yet. An admin can upload and share documents."
                    }
                    action={canUpload(me) ? { label: "Upload a PDF", href: "/upload" } : undefined}
                />
            )}

            {!loading && documents.length > 0 && filtered.length === 0 && <p className="hint">No documents match.</p>}

            {!loading && filtered.length > 0 && (
                <ul className="rows card px-4">
                    {filtered.map((document) => (
                        <DocumentRow
                            key={document.id}
                            document={document}
                            me={me}
                            groups={groups}
                            onShare={() => setSharing(document)}
                            onDelete={() => handleDelete(document)}
                        />
                    ))}
                </ul>
            )}

            <ShareDialog document={sharing} groups={groups} onClose={() => setSharing(null)} onShare={handleShare} />
            {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}
        </div>
    );
}

export default function DocumentsPage() {
    return (
        <AuthGuard>
            <MeGate>{(me) => <DocumentsPageInner me={me} />}</MeGate>
        </AuthGuard>
    );
}
