// The access rules from DECISIONS.md, as pure functions so pages and tests share one source
// Role controls write power inside the org; visibility controls who can read a document

import type { Document, Group, Me } from "@/lib/model";

export const canUpload = (me: Me): boolean => me.role !== "member";

export const canCreateGroup = (me: Me): boolean => me.role !== "member";

export const canManageRoles = (me: Me): boolean => me.role === "owner";

export const canRenameOrg = (me: Me): boolean => me.role === "owner";

export const canManageGroup = (me: Me, group: Group): boolean => me.role === "owner" || group.admin_id === me.id;

export const canDeleteDocument = (me: Me, document: Document, groups: Group[]): boolean => {
    switch (document.visibility) {
        case "private":
            return document.uploader_id === me.id;
        case "group": {
            const group = groups.find((g) => g.id === document.group_id);
            return me.role === "owner" || (group !== undefined && group.admin_id === me.id);
        }
        case "org":
            return me.role !== "member";
    }
};

// Visibility only ever widens: private -> group -> org
export const nextVisibilities = (document: Document): Document["visibility"][] => {
    if (document.visibility === "private") return ["group", "org"];
    if (document.visibility === "group") return ["org"];
    return [];
};

export const canPromoteDocument = (me: Me, document: Document, groups: Group[]): boolean =>
    me.role !== "member" && nextVisibilities(document).length > 0 && canDeleteDocument(me, document, groups);
