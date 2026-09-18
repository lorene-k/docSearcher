import * as placeholders from "@/lib/placeholders";

const OWNER = "olive@acme.test";
const PROFILE = { first_name: "Olive", last_name: "Owner", org_name: "Acme" };

describe("placeholder organization", () => {
    beforeEach(() => localStorage.clear());

    it("a signup owns a one-person org with the chosen name", () => {
        placeholders.ensureUser(OWNER, PROFILE);
        const me = placeholders.getMe(OWNER);
        expect(me.role).toBe("owner");
        expect(me.org.name).toBe("Acme");
        expect(placeholders.listMembers(OWNER)).toHaveLength(1);
    });

    it("an invited person joins as a member and can then be promoted, made owner, or removed", () => {
        placeholders.ensureUser(OWNER, PROFILE);
        placeholders.createInvite(OWNER, "max@acme.test");
        placeholders.ensureUser("max@acme.test", { first_name: "Max", last_name: "M", org_name: "Solo" });

        const [invite] = placeholders.listMyInvites("max@acme.test");
        expect(invite.org_name).toBe("Acme");
        expect(placeholders.acceptInvite("max@acme.test", invite.id)).toMatchObject({
            role: "member",
            org: { name: "Acme" },
        });
        expect(placeholders.listInvites(OWNER)).toEqual([]);

        const max = placeholders.listMembers(OWNER).find((m) => m.email === "max@acme.test")!;
        placeholders.setRole(OWNER, max.id, "admin");
        expect(placeholders.getMe("max@acme.test").role).toBe("admin");

        placeholders.transferOwnership(OWNER, max.id);
        expect(placeholders.getMe("max@acme.test").role).toBe("owner");
        expect(placeholders.getMe(OWNER).role).toBe("admin");

        placeholders.removeMember("max@acme.test", placeholders.getMe(OWNER).id);
        expect(placeholders.getMe(OWNER)).toMatchObject({ role: "owner", org: { name: "Olive Owner's organization" } });
    });

    it("an owner with other members must transfer ownership before joining another org", () => {
        placeholders.ensureUser(OWNER, PROFILE);
        placeholders.ensureUser("max@acme.test", { first_name: "Max", last_name: "M", org_name: "Max Co" });
        placeholders.createInvite("max@acme.test", OWNER);
        placeholders.createInvite(OWNER, "third@acme.test");
        placeholders.ensureUser("third@acme.test");
        const [toThird] = placeholders.listMyInvites("third@acme.test");
        placeholders.acceptInvite("third@acme.test", toThird.id);

        const [toOwner] = placeholders.listMyInvites(OWNER);
        expect(() => placeholders.acceptInvite(OWNER, toOwner.id)).toThrow(/Transfer ownership/);
    });

    it("shows each person only the documents visible to them", () => {
        placeholders.ensureUser(OWNER, PROFILE);
        placeholders.createInvite(OWNER, "max@acme.test");
        placeholders.ensureUser("max@acme.test");
        placeholders.acceptInvite("max@acme.test", placeholders.listMyInvites("max@acme.test")[0].id);
        const [group] = placeholders.createGroup(OWNER, "Research");

        placeholders.rememberDocument(OWNER, "secret.pdf", "private", null);
        placeholders.rememberDocument(OWNER, "team.pdf", "group", group.id);
        placeholders.rememberDocument(OWNER, "everyone.pdf", "org", null);
        const all = ["secret.pdf", "team.pdf", "everyone.pdf", "legacy.pdf"];

        expect(placeholders.describeDocuments(OWNER, all).map((d) => d.filename)).toEqual(all);
        expect(placeholders.describeDocuments("max@acme.test", all).map((d) => d.filename)).toEqual([
            "everyone.pdf",
            "legacy.pdf",
        ]);

        const max = placeholders.listMembers(OWNER).find((m) => m.email === "max@acme.test")!;
        placeholders.setGroupMembers(OWNER, group.id, [max.id]);
        expect(placeholders.describeDocuments("max@acme.test", all).map((d) => d.filename)).toEqual([
            "team.pdf",
            "everyone.pdf",
            "legacy.pdf",
        ]);
        expect(placeholders.describeDocuments("max@acme.test", all)[0]).toMatchObject({
            visibility: "group",
            group_name: "Research",
            uploader_name: "Olive Owner",
        });
    });
});
