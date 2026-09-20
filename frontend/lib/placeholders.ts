// Local stand-in for the organization, role, group and profile endpoints the backend does not have yet.
// It keeps its state in localStorage so the UI behaves like the finished product in one browser.
// Everything here goes away once TODO-BACKEND.md is done.

import type { Document, Group, Invite, Me, Member, Org, Profile, Role, Visibility } from "@/lib/model";
import { displayName } from "@/lib/model";

const STORE_KEY = "docsearcher:placeholder";
const USED_KEY = "docsearcher:placeholder-used";

type Membership = { org_id: string; role: Role; joined_at: string };
type StoredGroup = Group & { org_id: string };
type StoredInvite = { id: string; org_id: string; email: string; invited_by: string; created_at: string };
type DocumentMeta = {
    org_id: string;
    visibility: Visibility;
    group_id: string | null;
    uploader_id: string;
    created_at: string;
};

type Store = {
    users: Record<string, Profile>; // by email
    orgs: Record<string, Org>;
    memberships: Record<string, Membership>; // by user id
    groups: Record<string, StoredGroup>;
    invites: Record<string, StoredInvite>;
    documents: Record<string, DocumentMeta>; // by filename
};

const emptyStore = (): Store => ({ users: {}, orgs: {}, memberships: {}, groups: {}, invites: {}, documents: {} });

const load = (): Store => {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        return raw ? { ...emptyStore(), ...JSON.parse(raw) } : emptyStore();
    } catch {
        return emptyStore();
    }
};

const save = (store: Store): void => localStorage.setItem(STORE_KEY, JSON.stringify(store));

const mutate = <T>(change: (store: Store) => T): T => {
    const store = load();
    const result = change(store);
    save(store);
    return result;
};

const newId = (): string => Math.random().toString(36).slice(2, 10);
const now = (): string => new Date().toISOString();

// Records that a placeholder answered, so the account page can say so
export const markUsed = (): void => localStorage.setItem(USED_KEY, "1");
export const wasUsed = (): boolean => localStorage.getItem(USED_KEY) === "1";
export const clearAll = (): void => {
    localStorage.removeItem(STORE_KEY);
    localStorage.removeItem(USED_KEY);
};

export type SignupProfile = { first_name: string; last_name: string; org_name: string };

const soloOrgName = (user: Profile): string => `${displayName(user)}'s organization`;

const createSoloOrg = (store: Store, user: Profile, name?: string): void => {
    const org: Org = { id: newId(), name: name?.trim() || soloOrgName(user) };
    store.orgs[org.id] = org;
    store.memberships[user.id] = { org_id: org.id, role: "owner", joined_at: now() };
};

// Every user belongs to exactly one org: a fresh signup owns a one-person org
const ensureUserIn = (store: Store, email: string, profile?: Partial<SignupProfile>): Profile => {
    const existing = store.users[email];
    if (existing) return existing;
    const user: Profile = {
        id: newId(),
        email,
        first_name: profile?.first_name?.trim() ?? "",
        last_name: profile?.last_name?.trim() ?? "",
    };
    store.users[email] = user;
    createSoloOrg(store, user, profile?.org_name);
    return user;
};

export const ensureUser = (email: string, profile?: Partial<SignupProfile>): Profile =>
    mutate((store) => ensureUserIn(store, email, profile));

const userById = (store: Store, userId: string): Profile | undefined =>
    Object.values(store.users).find((u) => u.id === userId);

const current = (store: Store, email: string): { user: Profile; membership: Membership; org: Org } => {
    const user = ensureUserIn(store, email);
    const membership = store.memberships[user.id];
    return { user, membership, org: store.orgs[membership.org_id] };
};

export const getMe = (email: string): Me =>
    mutate((store) => {
        const { user, membership, org } = current(store, email);
        return { ...user, role: membership.role, org };
    });

export const updateProfile = (email: string, changes: Pick<Profile, "first_name" | "last_name">): Me => {
    mutate((store) => {
        const user = store.users[email];
        user.first_name = changes.first_name.trim();
        user.last_name = changes.last_name.trim();
    });
    return getMe(email);
};

export const renameOrg = (email: string, name: string): Org =>
    mutate((store) => {
        const { org } = current(store, email);
        org.name = name.trim();
        return org;
    });

// Placeholder only: lets you preview the app as another role without a second account
export const setOwnRole = (email: string, role: Role): Me => {
    mutate((store) => {
        current(store, email).membership.role = role;
    });
    return getMe(email);
};

// ── members ──────────────────────────────────────────────────────────────────

const orgMembers = (store: Store, orgId: string): Member[] =>
    Object.entries(store.memberships)
        .filter(([, m]) => m.org_id === orgId)
        .flatMap(([userId, m]) => {
            const user = userById(store, userId);
            return user ? [{ ...user, role: m.role, joined_at: m.joined_at }] : [];
        })
        .sort((a, b) => a.joined_at.localeCompare(b.joined_at));

export const listMembers = (email: string): Member[] =>
    mutate((store) => orgMembers(store, current(store, email).org.id));

export const setRole = (email: string, userId: string, role: Exclude<Role, "owner">): Member[] =>
    mutate((store) => {
        const { org } = current(store, email);
        const membership = store.memberships[userId];
        if (membership?.org_id === org.id && membership.role !== "owner") membership.role = role;
        return orgMembers(store, org.id);
    });

export const transferOwnership = (email: string, userId: string): Member[] =>
    mutate((store) => {
        const { membership: mine, org } = current(store, email);
        const target = store.memberships[userId];
        if (target?.org_id === org.id && target.role === "admin") {
            target.role = "owner";
            mine.role = "admin";
        }
        return orgMembers(store, org.id);
    });

export const removeMember = (email: string, userId: string): Member[] =>
    mutate((store) => {
        const { org } = current(store, email);
        const target = store.memberships[userId];
        const user = userById(store, userId);
        if (target?.org_id === org.id && target.role !== "owner" && user) {
            createSoloOrg(store, user);
            for (const group of Object.values(store.groups)) {
                group.member_ids = group.member_ids.filter((id) => id !== userId);
            }
        }
        return orgMembers(store, org.id);
    });

// ── invitations ──────────────────────────────────────────────────────────────

const toInvite = (store: Store, invite: StoredInvite): Invite => {
    const inviter = userById(store, invite.invited_by);
    return {
        id: invite.id,
        email: invite.email,
        org_name: store.orgs[invite.org_id]?.name ?? "",
        invited_by: inviter ? displayName(inviter) : "",
        created_at: invite.created_at,
    };
};

const orgInvites = (store: Store, orgId: string): Invite[] =>
    Object.values(store.invites)
        .filter((i) => i.org_id === orgId)
        .map((i) => toInvite(store, i));

export const listInvites = (email: string): Invite[] =>
    mutate((store) => orgInvites(store, current(store, email).org.id));

export const createInvite = (email: string, invitee: string): Invite[] =>
    mutate((store) => {
        const { user, org } = current(store, email);
        const address = invitee.trim().toLowerCase();
        const alreadyInvited = Object.values(store.invites).some((i) => i.org_id === org.id && i.email === address);
        if (!alreadyInvited) {
            const invite: StoredInvite = {
                id: newId(),
                org_id: org.id,
                email: address,
                invited_by: user.id,
                created_at: now(),
            };
            store.invites[invite.id] = invite;
        }
        return orgInvites(store, org.id);
    });

export const revokeInvite = (email: string, inviteId: string): Invite[] =>
    mutate((store) => {
        const { org } = current(store, email);
        if (store.invites[inviteId]?.org_id === org.id) delete store.invites[inviteId];
        return orgInvites(store, org.id);
    });

export const listMyInvites = (email: string): Invite[] => {
    const store = load();
    return Object.values(store.invites)
        .filter((i) => i.email === email.toLowerCase())
        .map((i) => toInvite(store, i));
};

export const acceptInvite = (email: string, inviteId: string): Me => {
    mutate((store) => {
        const invite = store.invites[inviteId];
        if (!invite || invite.email !== email.toLowerCase()) return;
        const { user, membership, org } = current(store, email);
        const others = orgMembers(store, org.id).filter((m) => m.id !== user.id);
        if (membership.role === "owner" && others.length > 0) {
            throw new Error("Transfer ownership of your current organization before joining another one.");
        }
        if (others.length === 0) delete store.orgs[org.id];
        store.memberships[user.id] = { org_id: invite.org_id, role: "member", joined_at: now() };
        delete store.invites[inviteId];
    });
    return getMe(email);
};

export const declineInvite = (email: string, inviteId: string): void =>
    mutate((store) => {
        if (store.invites[inviteId]?.email === email.toLowerCase()) delete store.invites[inviteId];
    });

// ── groups ───────────────────────────────────────────────────────────────────

const orgGroups = (store: Store, orgId: string): Group[] =>
    Object.values(store.groups)
        .filter((g) => g.org_id === orgId)
        .map(({ id, name, admin_id, member_ids, created_at }) => ({ id, name, admin_id, member_ids, created_at }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));

export const listGroups = (email: string): Group[] => mutate((store) => orgGroups(store, current(store, email).org.id));

export const createGroup = (email: string, name: string): Group[] =>
    mutate((store) => {
        const { user, org } = current(store, email);
        const group: StoredGroup = {
            id: newId(),
            org_id: org.id,
            name: name.trim(),
            admin_id: user.id,
            member_ids: [],
            created_at: now(),
        };
        store.groups[group.id] = group;
        return orgGroups(store, org.id);
    });

export const renameGroup = (email: string, groupId: string, name: string): Group[] =>
    mutate((store) => {
        const { org } = current(store, email);
        if (store.groups[groupId]?.org_id === org.id) store.groups[groupId].name = name.trim();
        return orgGroups(store, org.id);
    });

export const deleteGroup = (email: string, groupId: string): Group[] =>
    mutate((store) => {
        const { org } = current(store, email);
        if (store.groups[groupId]?.org_id === org.id) {
            delete store.groups[groupId];
            for (const meta of Object.values(store.documents)) {
                // Losing its group would leave the row reading "One group" with no name,
                // so it falls back to private, which is what the backend is told to do too
                if (meta.group_id === groupId) {
                    meta.group_id = null;
                    meta.visibility = "private";
                }
            }
        }
        return orgGroups(store, org.id);
    });

export const setGroupMembers = (email: string, groupId: string, memberIds: string[]): Group[] =>
    mutate((store) => {
        const { org } = current(store, email);
        const group = store.groups[groupId];
        if (group?.org_id === org.id) group.member_ids = memberIds.filter((id) => id !== group.admin_id);
        return orgGroups(store, org.id);
    });

// ── documents ────────────────────────────────────────────────────────────────

export const rememberDocument = (
    email: string,
    filename: string,
    visibility: Visibility,
    groupId: string | null,
): void =>
    mutate((store) => {
        const { user, org } = current(store, email);
        store.documents[filename] = {
            org_id: org.id,
            visibility,
            group_id: visibility === "group" ? groupId : null,
            uploader_id: user.id,
            created_at: now(),
        };
    });

export const forgetDocument = (filename: string): void =>
    mutate((store) => {
        delete store.documents[filename];
    });

export const setDocumentVisibility = (
    email: string,
    filename: string,
    visibility: Visibility,
    groupId: string | null,
): void =>
    mutate((store) => {
        const meta = store.documents[filename];
        if (!meta) return;
        meta.visibility = visibility;
        meta.group_id = visibility === "group" ? groupId : null;
    });

// The backend only knows filenames today; visibility comes from what this browser remembered at upload time.
// Files uploaded before that (or from another browser) count as shared with the whole organization.
export const describeDocuments = (email: string, filenames: string[]): Document[] =>
    mutate((store) => describeIn(store, email, filenames));

const describeIn = (store: Store, email: string, filenames: string[]): Document[] => {
    const { user, org } = current(store, email);
    const myGroupIds = new Set(
        orgGroups(store, org.id)
            .filter((g) => g.admin_id === user.id || g.member_ids.includes(user.id))
            .map((g) => g.id),
    );
    return filenames.flatMap((filename) => {
        const meta = store.documents[filename];
        const uploader = meta ? userById(store, meta.uploader_id) : undefined;
        const document: Document = {
            id: filename,
            filename,
            visibility: meta?.visibility ?? "org",
            uploader_id: meta?.uploader_id ?? null,
            uploader_name: uploader ? displayName(uploader) : null,
            group_id: meta?.group_id ?? null,
            group_name: meta?.group_id ? (store.groups[meta.group_id]?.name ?? null) : null,
            created_at: meta?.created_at ?? null,
        };
        const mine = document.uploader_id === user.id;
        const visible =
            mine ||
            document.visibility === "org" ||
            (document.visibility === "group" && document.group_id !== null && myGroupIds.has(document.group_id));
        return visible ? [document] : [];
    });
};
