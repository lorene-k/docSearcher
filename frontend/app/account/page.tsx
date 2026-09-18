"use client";

import { useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import { RoleBadge } from "@/components/Badges";
import Banner from "@/components/Banner";
import { useMe } from "@/components/MeProvider";
import PageHeader from "@/components/PageHeader";
import { changePassword, previewRole, updateProfile } from "@/lib/api";
import { ROLES, ROLE_LABEL } from "@/lib/model";
import type { Me, Role } from "@/lib/model";
import * as placeholders from "@/lib/placeholders";

function ProfileForm({ me }: { me: Me }) {
    const { setMe } = useMe();
    const [firstName, setFirstName] = useState(me.first_name);
    const [lastName, setLastName] = useState(me.last_name);
    const [status, setStatus] = useState<{ variant: "success" | "error"; message: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            setMe(await updateProfile({ first_name: firstName, last_name: lastName }));
            setStatus({ variant: "success", message: "Name saved." });
        } catch {
            setStatus({ variant: "error", message: "Could not save your name." });
        }
        setSaving(false);
    };

    return (
        <section className="mb-10">
            <h2 className="section-title mb-3">Your name</h2>
            <form onSubmit={save} className="card flex flex-col gap-4 p-5">
                {status && <Banner variant={status.variant} message={status.message} />}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="first-name" className="label">
                            First name
                        </label>
                        <input
                            id="first-name"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            className="field"
                        />
                    </div>
                    <div>
                        <label htmlFor="last-name" className="label">
                            Last name
                        </label>
                        <input
                            id="last-name"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            className="field"
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="email" className="label">
                        Email
                    </label>
                    <input id="email" value={me.email} disabled className="field" />
                    <p className="hint mt-1">Your email is your login and cannot be changed here.</p>
                </div>
                <div>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                        Save name
                    </button>
                </div>
            </form>
        </section>
    );
}

function PasswordForm() {
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [again, setAgain] = useState("");
    const [status, setStatus] = useState<{ variant: "success" | "error"; message: string } | null>(null);
    const [saving, setSaving] = useState(false);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (next !== again) {
            setStatus({ variant: "error", message: "The new passwords do not match." });
            return;
        }
        setSaving(true);
        try {
            await changePassword(current, next);
            setStatus({ variant: "success", message: "Password changed." });
            setCurrent("");
            setNext("");
            setAgain("");
        } catch {
            setStatus({ variant: "error", message: "Could not change the password. Check the current one." });
        }
        setSaving(false);
    };

    return (
        <section className="mb-10">
            <h2 className="section-title mb-3">Password</h2>
            <form onSubmit={save} className="card flex flex-col gap-4 p-5">
                {status && <Banner variant={status.variant} message={status.message} />}
                <div>
                    <label htmlFor="current-password" className="label">
                        Current password
                    </label>
                    <input
                        id="current-password"
                        type="password"
                        value={current}
                        onChange={(e) => setCurrent(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="field"
                    />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label htmlFor="new-password" className="label">
                            New password
                        </label>
                        <input
                            id="new-password"
                            type="password"
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            className="field"
                        />
                    </div>
                    <div>
                        <label htmlFor="new-password-again" className="label">
                            Repeat new password
                        </label>
                        <input
                            id="new-password-again"
                            type="password"
                            value={again}
                            onChange={(e) => setAgain(e.target.value)}
                            required
                            minLength={6}
                            autoComplete="new-password"
                            className="field"
                        />
                    </div>
                </div>
                <div>
                    <button type="submit" disabled={saving} className="btn btn-primary">
                        Change password
                    </button>
                </div>
            </form>
        </section>
    );
}

const ROLE_SUMMARY: Record<Role, string[]> = {
    owner: [
        "Read every document shared with you, and ask questions about them",
        "Upload documents and choose who can read them",
        "Create groups and manage any group's members",
        "Invite people, change roles, and hand ownership to an admin",
    ],
    admin: [
        "Read every document shared with you, and ask questions about them",
        "Upload documents and choose who can read them",
        "Create groups and manage the groups you created",
    ],
    member: [
        "Read documents shared with your groups or the whole organization",
        "Ask questions about them in the chat",
    ],
};

function RoleSummary({ me }: { me: Me }) {
    return (
        <section className="panel mb-10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="section-title">
                        {ROLE_LABEL[me.role]} of {me.org.name}
                    </h2>
                    <p className="hint">What you can do here</p>
                </div>
                <RoleBadge role={me.role} />
            </div>
            <ul className="mt-3 flex flex-col gap-1 text-sm text-ink">
                {ROLE_SUMMARY[me.role].map((line) => (
                    <li key={line} className="flex gap-2">
                        <span aria-hidden="true" className="text-plum">
                            —
                        </span>
                        {line}
                    </li>
                ))}
            </ul>
            <Link href="/org" className="btn btn-outline mt-5">
                {me.role === "member" ? "See your organization" : "Manage the organization"}
            </Link>
        </section>
    );
}

// Shown only while the backend answers from local placeholders, so you can preview every role
function PlaceholderPanel({ me }: { me: Me }) {
    const { setMe } = useMe();
    // Rendered client-side only (behind AuthGuard), so localStorage can be read for the initial state
    const [visible] = useState(() => placeholders.wasUsed());
    if (!visible) return null;

    return (
        <section className="mb-10 rounded-2xl border border-dashed border-warning/60 p-5">
            <h2 className="section-title">Preview mode</h2>
            <p className="hint mt-1">
                Organization, roles and groups are stored in this browser until the backend provides them. Preview the
                app as another role, or start over.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
                {ROLES.map((role) => (
                    <button
                        key={role}
                        onClick={() => setMe(previewRole(role))}
                        aria-pressed={me.role === role}
                        className={`btn btn-sm ${me.role === role ? "btn-primary" : "btn-outline"}`}
                    >
                        {ROLE_LABEL[role]}
                    </button>
                ))}
                <button
                    onClick={() => {
                        placeholders.clearAll();
                        window.location.reload();
                    }}
                    className="btn btn-ghost btn-sm text-muted"
                >
                    Reset local data
                </button>
            </div>
        </section>
    );
}

function AccountPageInner({ me }: { me: Me }) {
    return (
        <div className="page">
            <PageHeader title="Account" lead={me.email} />
            <RoleSummary me={me} />
            <ProfileForm me={me} />
            <PasswordForm />
            <PlaceholderPanel me={me} />
        </div>
    );
}

export default function AccountPage() {
    const { me } = useMe();
    return <AuthGuard>{me && <AccountPageInner me={me} />}</AuthGuard>;
}
