import { render, screen } from "@testing-library/react";
import OrgPage from "@/app/org/page";
import type { Me } from "@/lib/model";

jest.mock("@/components/AuthGuard", () => ({
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

let mockMe: Me;
jest.mock("@/components/MeProvider", () => ({
    useMe: () => ({ me: mockMe, loading: false, refresh: jest.fn(), setMe: jest.fn() }),
}));

const org = { id: "o1", name: "Acme" };
const members = [
    { id: "u1", email: "olive@acme.test", first_name: "Olive", last_name: "O", role: "owner" as const, joined_at: "1" },
    { id: "u2", email: "max@acme.test", first_name: "Max", last_name: "M", role: "member" as const, joined_at: "2" },
];
const groups = [{ id: "g1", name: "Research", admin_id: "u1", member_ids: ["u2"], created_at: "1" }];

jest.mock("@/hooks/useOrg", () => ({
    useOrg: () => ({
        members,
        invites: [],
        groups,
        myInvites: [],
        loading: false,
        error: "",
        reload: jest.fn(),
        setMemberRole: jest.fn(),
        transferOwnership: jest.fn(),
        removeMember: jest.fn(),
        invite: jest.fn(),
        revokeInvite: jest.fn(),
        createGroup: jest.fn(),
        renameGroup: jest.fn(),
        deleteGroup: jest.fn(),
        setGroupMembers: jest.fn(),
    }),
}));

describe("OrgPage", () => {
    it("lets the owner rename, invite, change roles and manage groups", () => {
        mockMe = { ...members[0], role: "owner", org };

        render(<OrgPage />);

        expect(screen.getByRole("button", { name: "Rename" })).toBeTruthy();
        expect(screen.getByLabelText("Invite by email")).toBeTruthy();
        expect(screen.getByLabelText("Role of Max M")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Manage" })).toBeTruthy();
        expect(screen.getByLabelText("New group")).toBeTruthy();
    });

    it("shows a member the people and their groups without any management action", () => {
        mockMe = { ...members[1], role: "member", org };

        render(<OrgPage />);

        expect(screen.getByText("Olive O")).toBeTruthy();
        expect(screen.getByText("Research")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Rename" })).toBeNull();
        expect(screen.queryByLabelText("Invite by email")).toBeNull();
        expect(screen.queryByRole("combobox")).toBeNull();
        expect(screen.queryByRole("button", { name: "Manage" })).toBeNull();
        expect(screen.queryByLabelText("New group")).toBeNull();
    });
});
