"use client";

import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { RoleBadge } from "@/components/Badges";
import Banner from "@/components/Banner";
import Dialog from "@/components/Dialog";
import { useMe } from "@/components/MeProvider";
import PageHeader from "@/components/PageHeader";
import { useOrg } from "@/hooks/useOrg";
import { acceptInvite, declineInvite, renameOrg } from "@/lib/api";
import { displayName } from "@/lib/model";
import type { Group, Invite, Me, Member } from "@/lib/model";
import { canCreateGroup, canManageGroup, canManageRoles, canRenameOrg } from "@/lib/permissions";

type OrgState = ReturnType<typeof useOrg>;

function OrgName({ me, onRenamed }: { me: Me; onRenamed: () => Promise<void> }) {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(me.org.name);
    const [saving, setSaving] = useState(false);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        await renameOrg(name);
        await onRenamed();
        setSaving(false);
        setEditing(false);
    };

    if (!editing) {
        return (
            <PageHeader title={me.org.name}>
                <div className="flex items-center gap-3">
                    <span className="hint">Your role</span>
                    <RoleBadge role={me.role} />
                    {canRenameOrg(me) && (
                        <button onClick={() => setEditing(true)} className="btn btn-ghost btn-sm">
                            Rename
                        </button>
                    )}
                </div>
            </PageHeader>
        );
    }

    return (
        <form onSubmit={save} className="mb-8 flex flex-wrap items-end gap-2">
            <div className="flex-1 sm:max-w-sm">
                <label htmlFor="org-name" className="label">
                    Organization name
                </label>
                <input
                    id="org-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="field"
                    autoFocus
                />
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary">
                Save name
            </button>
            <button type="button" onClick={() => setEditing(false)} className="btn btn-ghost">
                Cancel
            </button>
        </form>
    );
}

function MyInvites({ invites, onChanged }: { invites: Invite[]; onChanged: () => Promise<void> }) {
    const [error, setError] = useState("");
    if (invites.length === 0) return null;

    const accept = async (invite: Invite) => {
        try {
            await acceptInvite(invite.id);
            await onChanged();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not join this organization.");
        }
    };

    return (
        <section className="panel mb-8 p-5">
            <h2 className="section-title">Invitations for you</h2>
            {error && <Banner variant="error" className="mt-3" message={error} />}
            <ul className="rows mt-2">
                {invites.map((invite) => (
                    <li key={invite.id} className="row">
                        <p className="text-sm">
                            {invite.invited_by} invited you to join{" "}
                            <span className="font-medium">{invite.org_name}</span> as a member.
                        </p>
                        <span className="flex gap-2">
                            <button onClick={() => accept(invite)} className="btn btn-primary btn-sm">
                                Join
                            </button>
                            <button
                                onClick={() => declineInvite(invite.id).then(onChanged)}
                                className="btn btn-ghost btn-sm"
                            >
                                Decline
                            </button>
                        </span>
                    </li>
                ))}
            </ul>
            <p className="hint mt-3">Joining moves you to that organization. You keep your account.</p>
        </section>
    );
}

function MemberRow({ member, me, org }: { member: Member; me: Me; org: OrgState }) {
    const [confirming, setConfirming] = useState<"transfer" | "remove" | null>(null);
    const isMe = member.id === me.id;
    const manageable = canManageRoles(me) && !isMe && member.role !== "owner";

    return (
        <li className="row">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">
                    {displayName(member)}
                    {isMe && <span className="hint"> (you)</span>}
                </p>
                <p className="hint truncate">{member.email}</p>
            </div>
            {manageable ? (
                <select
                    value={member.role}
                    onChange={(e) => org.setMemberRole(member.id, e.target.value as "admin" | "member")}
                    aria-label={`Role of ${displayName(member)}`}
                    className="field w-auto py-1 text-xs"
                >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                </select>
            ) : (
                <RoleBadge role={member.role} />
            )}
            {manageable && (
                <span className="flex items-center gap-1">
                    {confirming === "transfer" ? (
                        <>
                            <span className="hint">
                                Make {member.first_name || member.email} the owner? You become an admin.
                            </span>
                            <button
                                onClick={() => org.transferOwnership(member.id).then(() => setConfirming(null))}
                                className="btn btn-primary btn-sm"
                            >
                                Confirm
                            </button>
                            <button onClick={() => setConfirming(null)} className="btn btn-ghost btn-sm">
                                Cancel
                            </button>
                        </>
                    ) : confirming === "remove" ? (
                        <>
                            <span className="hint">Remove from the organization?</span>
                            <button
                                onClick={() => org.removeMember(member.id).then(() => setConfirming(null))}
                                className="btn btn-danger btn-sm"
                            >
                                Remove
                            </button>
                            <button onClick={() => setConfirming(null)} className="btn btn-ghost btn-sm">
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            {member.role === "admin" && (
                                <button onClick={() => setConfirming("transfer")} className="btn btn-ghost btn-sm">
                                    Make owner
                                </button>
                            )}
                            <button onClick={() => setConfirming("remove")} className="btn btn-ghost btn-sm text-muted">
                                Remove
                            </button>
                        </>
                    )}
                </span>
            )}
        </li>
    );
}

function Members({ me, org }: { me: Me; org: OrgState }) {
    const [email, setEmail] = useState("");

    const invite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (await org.invite(email)) setEmail("");
    };

    return (
        <section className="mb-10">
            <h2 className="section-title">People</h2>
            <p className="hint mb-3">
                {canManageRoles(me)
                    ? "Admins upload and share documents and run groups. Only you can change roles."
                    : "Only the owner can invite people or change roles."}
            </p>
            <ul className="rows card px-4">
                {org.members.map((member) => (
                    <MemberRow key={member.id} member={member} me={me} org={org} />
                ))}
            </ul>

            {canManageRoles(me) && (
                <div className="mt-4">
                    <form onSubmit={invite} className="flex flex-wrap items-end gap-2">
                        <div className="flex-1 sm:max-w-xs">
                            <label htmlFor="invite-email" className="label">
                                Invite by email
                            </label>
                            <input
                                id="invite-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="colleague@example.com"
                                className="field"
                            />
                        </div>
                        <button type="submit" className="btn btn-outline">
                            Send invitation
                        </button>
                    </form>
                    <p className="hint mt-1">They join as a member. You can make them an admin afterwards.</p>
                    {org.invites.length > 0 && (
                        <ul className="rows mt-4">
                            {org.invites.map((invite) => (
                                <li key={invite.id} className="row">
                                    <span className="text-sm">{invite.email}</span>
                                    <span className="flex items-center gap-2">
                                        <span className="pill pill-warning">Invited</span>
                                        <button
                                            onClick={() => org.revokeInvite(invite.id)}
                                            className="btn btn-ghost btn-sm text-muted"
                                        >
                                            Withdraw
                                        </button>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </section>
    );
}

function GroupDialog({ group, me, org, onClose }: { group: Group | null; me: Me; org: OrgState; onClose: () => void }) {
    const [name, setName] = useState("");
    const [selected, setSelected] = useState<string[]>([]);
    const [opened, setOpened] = useState<Group | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);

    // Load the form from the group when a different one is opened
    if (group && group !== opened) {
        setOpened(group);
        setName(group.name);
        setSelected(group.member_ids);
        setConfirmingDelete(false);
    }
    if (!group) return null;

    const candidates = org.members.filter((m) => m.id !== group.admin_id);
    const toggle = (id: string) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim() !== group.name) await org.renameGroup(group.id, name);
        await org.setGroupMembers(group.id, selected);
        onClose();
    };

    const admin = org.members.find((m) => m.id === group.admin_id);

    return (
        <Dialog open={true} title="Group settings" onClose={onClose}>
            <form onSubmit={save} className="flex flex-col gap-4">
                <div>
                    <label htmlFor="group-name" className="label">
                        Name
                    </label>
                    <input
                        id="group-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="field"
                    />
                    <p className="hint mt-1">
                        Run by {admin ? (admin.id === me.id ? "you" : displayName(admin)) : "an admin"}.
                    </p>
                </div>
                <fieldset>
                    <legend className="label">Members</legend>
                    {candidates.length === 0 ? (
                        <p className="hint">Nobody else is in the organization yet.</p>
                    ) : (
                        <ul className="rows card max-h-56 overflow-y-auto px-3">
                            {candidates.map((m) => (
                                <li key={m.id}>
                                    <label className="flex cursor-pointer items-center gap-3 py-2">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(m.id)}
                                            onChange={() => toggle(m.id)}
                                            className="accent-plum"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm">{displayName(m)}</span>
                                            <span className="hint block truncate">{m.email}</span>
                                        </span>
                                        <RoleBadge role={m.role} />
                                    </label>
                                </li>
                            ))}
                        </ul>
                    )}
                </fieldset>
                <div className="flex flex-wrap items-center justify-between gap-2">
                    {confirmingDelete ? (
                        <span className="flex items-center gap-1">
                            <span className="hint">Delete this group?</span>
                            <button
                                type="button"
                                onClick={() => org.deleteGroup(group.id).then(onClose)}
                                className="btn btn-danger btn-sm"
                            >
                                Delete
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmingDelete(false)}
                                className="btn btn-ghost btn-sm"
                            >
                                Keep
                            </button>
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setConfirmingDelete(true)}
                            className="btn btn-ghost btn-sm text-muted"
                        >
                            Delete group
                        </button>
                    )}
                    <span className="flex gap-2">
                        <button type="button" onClick={onClose} className="btn btn-ghost">
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary">
                            Save
                        </button>
                    </span>
                </div>
            </form>
        </Dialog>
    );
}

function Groups({ me, org }: { me: Me; org: OrgState }) {
    const [name, setName] = useState("");
    const [editing, setEditing] = useState<Group | null>(null);
    const memberById = (id: string) => org.members.find((m) => m.id === id);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        if (await org.createGroup(name)) setName("");
    };

    const visibleGroups = canCreateGroup(me)
        ? org.groups
        : org.groups.filter((g) => g.member_ids.includes(me.id) || g.admin_id === me.id);

    return (
        <section className="mb-10">
            <h2 className="section-title">Groups</h2>
            <p className="hint mb-3">
                {canCreateGroup(me)
                    ? "A group lets you share a document with some people only. Whoever creates a group runs it."
                    : "The groups you belong to. Documents shared with a group are visible on the documents page."}
            </p>
            {visibleGroups.length === 0 ? (
                <p className="hint card px-4 py-6 text-center">
                    {canCreateGroup(me) ? "No groups yet." : "You are not in any group yet."}
                </p>
            ) : (
                <ul className="rows card px-4">
                    {visibleGroups.map((group) => {
                        const admin = memberById(group.admin_id);
                        return (
                            <li key={group.id} className="row">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm text-ink">{group.name}</p>
                                    <p className="hint">
                                        {group.member_ids.length} {group.member_ids.length === 1 ? "member" : "members"}
                                        , run by{" "}
                                        {admin ? (admin.id === me.id ? "you" : displayName(admin)) : "an admin"}
                                    </p>
                                </div>
                                {canManageGroup(me, group) && (
                                    <button onClick={() => setEditing(group)} className="btn btn-ghost btn-sm">
                                        Manage
                                    </button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
            {canCreateGroup(me) && (
                <form onSubmit={create} className="mt-4 flex flex-wrap items-end gap-2">
                    <div className="flex-1 sm:max-w-xs">
                        <label htmlFor="group-name-new" className="label">
                            New group
                        </label>
                        <input
                            id="group-name-new"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Research team"
                            className="field"
                        />
                    </div>
                    <button type="submit" className="btn btn-outline">
                        Create group
                    </button>
                </form>
            )}
            <GroupDialog group={editing} me={me} org={org} onClose={() => setEditing(null)} />
        </section>
    );
}

function OrgPageInner({ me }: { me: Me }) {
    const org = useOrg();
    const { refresh } = useMe();
    const refreshAll = async () => {
        await Promise.all([refresh(), org.reload()]);
    };

    return (
        <div className="page">
            <OrgName me={me} onRenamed={refreshAll} />
            {org.error && <Banner variant="error" className="mb-6" message={org.error} />}
            <MyInvites invites={org.myInvites} onChanged={refreshAll} />
            {org.loading ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 animate-pulse rounded-xl bg-base" />
                    ))}
                </div>
            ) : (
                <>
                    <Members me={me} org={org} />
                    <Groups me={me} org={org} />
                </>
            )}
        </div>
    );
}

export default function OrgPage() {
    const { me } = useMe();
    return <AuthGuard>{me && <OrgPageInner me={me} />}</AuthGuard>;
}
