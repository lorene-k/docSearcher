import type { Document, Group, Me } from "@/lib/model";
import { canDeleteDocument, canPromoteDocument, canUpload, nextVisibilities } from "@/lib/permissions";

const org = { id: "o1", name: "Acme" };
const owner: Me = { id: "owner", email: "o@acme.test", first_name: "Olive", last_name: "O", role: "owner", org };
const admin: Me = { id: "admin", email: "a@acme.test", first_name: "Ann", last_name: "A", role: "admin", org };
const other: Me = { ...admin, id: "admin2", email: "b@acme.test" };
const member: Me = { id: "member", email: "m@acme.test", first_name: "Max", last_name: "M", role: "member", org };

const group: Group = { id: "g1", name: "Research", admin_id: admin.id, member_ids: [member.id], created_at: "" };

const doc = (uploader: Me, visibility: Document["visibility"], groupId: string | null = null): Document => ({
    id: "d",
    filename: "d.pdf",
    visibility,
    uploader_id: uploader.id,
    uploader_name: null,
    group_id: groupId,
    group_name: null,
    created_at: null,
});

describe("write power by role", () => {
    it("members cannot upload, admins and owners can", () => {
        expect(canUpload(member)).toBe(false);
        expect(canUpload(admin)).toBe(true);
        expect(canUpload(owner)).toBe(true);
    });
});

describe("delete rights follow visibility", () => {
    it("a private document is only deletable by its uploader, whatever the role", () => {
        const privateDoc = doc(admin, "private");
        expect(canDeleteDocument(admin, privateDoc, [group])).toBe(true);
        expect(canDeleteDocument(owner, privateDoc, [group])).toBe(false);
        expect(canDeleteDocument(other, privateDoc, [group])).toBe(false);
    });

    it("a group document is deletable by the group's admin or the owner", () => {
        const groupDoc = doc(other, "group", group.id);
        expect(canDeleteDocument(admin, groupDoc, [group])).toBe(true);
        expect(canDeleteDocument(owner, groupDoc, [group])).toBe(true);
        expect(canDeleteDocument(other, groupDoc, [group])).toBe(false);
        expect(canDeleteDocument(member, groupDoc, [group])).toBe(false);
    });

    it("an org document is deletable by any admin or the owner, never a member", () => {
        const orgDoc = doc(owner, "org");
        expect(canDeleteDocument(other, orgDoc, [])).toBe(true);
        expect(canDeleteDocument(owner, orgDoc, [])).toBe(true);
        expect(canDeleteDocument(member, orgDoc, [])).toBe(false);
    });
});

describe("visibility only widens", () => {
    it("offers the wider levels only", () => {
        expect(nextVisibilities(doc(admin, "private"))).toEqual(["group", "org"]);
        expect(nextVisibilities(doc(admin, "group", group.id))).toEqual(["org"]);
        expect(nextVisibilities(doc(admin, "org"))).toEqual([]);
    });

    it("members never promote, and nobody promotes an org-wide document", () => {
        expect(canPromoteDocument(member, doc(member, "private"), [])).toBe(false);
        expect(canPromoteDocument(admin, doc(admin, "private"), [])).toBe(true);
        expect(canPromoteDocument(owner, doc(owner, "org"), [])).toBe(false);
    });
});
