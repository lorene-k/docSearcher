"use client";

import { useCallback, useEffect, useState } from "react";
import * as api from "@/lib/api";
import type { Group, Invite, Member } from "@/lib/model";

type OrgData = [Member[], Invite[], Group[], Invite[]];

const LOAD_ERROR = "Could not load the organization.";

const fetchOrg = (): Promise<OrgData> =>
    Promise.all([api.getMembers(), api.getInvites(), api.getGroups(), api.getMyInvites()]);

// Everything the organization page shows, with actions that keep the lists current
export function useOrg() {
    const [members, setMembers] = useState<Member[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [groups, setGroups] = useState<Group[]>([]);
    const [myInvites, setMyInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const apply = ([m, i, g, mine]: OrgData) => {
        setMembers(m);
        setInvites(i);
        setGroups(g);
        setMyInvites(mine);
        setError("");
    };

    useEffect(() => {
        let ignore = false;
        fetchOrg()
            .then((data) => {
                if (!ignore) apply(data);
            })
            .catch(() => {
                if (!ignore) setError(LOAD_ERROR);
            })
            .finally(() => {
                if (!ignore) setLoading(false);
            });
        return () => {
            ignore = true;
        };
    }, []);

    const reload = useCallback(
        () =>
            fetchOrg()
                .then(apply)
                .catch(() => setError(LOAD_ERROR)),
        [],
    );

    const run = async <T>(action: () => Promise<T>, apply: (result: T) => void): Promise<boolean> => {
        try {
            apply(await action());
            setError("");
            return true;
        } catch (e) {
            setError(e instanceof Error && e.message ? e.message : "That did not work. Try again.");
            return false;
        }
    };

    return {
        members,
        invites,
        groups,
        myInvites,
        loading,
        error,
        reload,
        setMemberRole: (userId: string, role: "admin" | "member") =>
            run(() => api.setMemberRole(userId, role), setMembers),
        transferOwnership: (userId: string) => run(() => api.transferOwnership(userId), setMembers),
        removeMember: (userId: string) => run(() => api.removeMember(userId), setMembers),
        invite: (email: string) => run(() => api.createInvite(email), setInvites),
        revokeInvite: (inviteId: string) => run(() => api.revokeInvite(inviteId), setInvites),
        createGroup: (name: string) => run(() => api.createGroup(name), setGroups),
        renameGroup: (groupId: string, name: string) => run(() => api.renameGroup(groupId, name), setGroups),
        deleteGroup: (groupId: string) => run(() => api.deleteGroup(groupId), setGroups),
        setGroupMembers: (groupId: string, memberIds: string[]) =>
            run(() => api.setGroupMembers(groupId, memberIds), setGroups),
    };
}
