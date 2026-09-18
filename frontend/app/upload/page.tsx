"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { useMe } from "@/components/MeProvider";
import PageHeader from "@/components/PageHeader";
import UploadZone from "@/components/UploadZone";
import { getGroups } from "@/lib/api";
import type { Group, Me, Visibility } from "@/lib/model";
import { canUpload } from "@/lib/permissions";

const CHOICES: { key: Visibility; title: string; text: string }[] = [
    { key: "private", title: "Only me", text: "Nobody else can see it, not even the owner." },
    { key: "group", title: "One group", text: "You and the people in a group you pick." },
    { key: "org", title: "Whole organization", text: "Everyone in the organization." },
];

function UploadPageInner({ me }: { me: Me }) {
    const [visibility, setVisibility] = useState<Visibility>("org");
    const [groups, setGroups] = useState<Group[]>([]);
    const [groupId, setGroupId] = useState("");

    useEffect(() => {
        getGroups()
            .then((g) => {
                setGroups(g);
                setGroupId(g[0]?.id ?? "");
            })
            .catch(() => {});
    }, []);

    if (!canUpload(me)) {
        return (
            <div className="page">
                <PageHeader title="Upload a document" />
                <div className="panel p-6">
                    <p className="text-sm text-ink">Members can read and ask questions, but not upload.</p>
                    <p className="hint mt-1">
                        Ask an admin or the owner of {me.org.name} to add the document, or to make you an admin.
                    </p>
                    <Link href="/documents" className="btn btn-outline mt-5">
                        Back to documents
                    </Link>
                </div>
            </div>
        );
    }

    const groupMissing = visibility === "group" && !groupId;

    return (
        <div className="page">
            <PageHeader title="Upload a document" lead="A PDF of 6 pages at most. Choose who can read it first." />
            <fieldset className="mb-6">
                <legend className="section-title mb-3">Who can read it</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                    {CHOICES.map(({ key, title, text }) => (
                        <label
                            key={key}
                            className={`card flex cursor-pointer items-start gap-3 p-4 transition-colors ${
                                visibility === key ? "border-plum bg-plum-soft" : "hover:border-line"
                            }`}
                        >
                            <input
                                type="radio"
                                name="visibility"
                                value={key}
                                checked={visibility === key}
                                onChange={() => setVisibility(key)}
                                className="mt-1 accent-plum"
                            />
                            <span>
                                <span className="block text-sm font-medium text-ink">{title}</span>
                                <span className="hint">{text}</span>
                            </span>
                        </label>
                    ))}
                </div>
                {visibility === "group" && (
                    <div className="mt-3 sm:max-w-xs">
                        <label htmlFor="group" className="label">
                            Group
                        </label>
                        {groups.length === 0 ? (
                            <p className="hint">
                                No groups yet.{" "}
                                <Link href="/org" className="link">
                                    Create one on the organization page
                                </Link>
                                .
                            </p>
                        ) : (
                            <select
                                id="group"
                                value={groupId}
                                onChange={(e) => setGroupId(e.target.value)}
                                className="field"
                            >
                                {groups.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                )}
            </fieldset>
            <UploadZone
                options={{ visibility, groupId: visibility === "group" ? groupId : null }}
                disabled={groupMissing}
            />
        </div>
    );
}

export default function UploadPage() {
    const { me } = useMe();
    return <AuthGuard>{me && <UploadPageInner me={me} />}</AuthGuard>;
}
