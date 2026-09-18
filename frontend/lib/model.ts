// Shapes shared by the API client, the placeholder layer and the pages

export type Role = "owner" | "admin" | "member";
export type Visibility = "private" | "group" | "org";

export type Org = { id: string; name: string };

export type Profile = { id: string; email: string; first_name: string; last_name: string };

export type Me = Profile & { role: Role; org: Org };

export type Member = Profile & { role: Role; joined_at: string };

export type Group = { id: string; name: string; admin_id: string; member_ids: string[]; created_at: string };

export type Invite = { id: string; email: string; org_name: string; invited_by: string; created_at: string };

export type Document = {
    id: string;
    filename: string;
    visibility: Visibility;
    uploader_id: string | null;
    uploader_name: string | null;
    group_id: string | null;
    group_name: string | null;
    created_at: string | null;
};

export type Conversation = { id: string; user_id: string; created_at: string };

export type Message = {
    id: string;
    conversation_id: string;
    role: "user" | "assistant";
    text: string;
    sources: { filename: string; chunk_text: string; relevance?: "high" | "low" }[];
    created_at: string;
};

export const ROLES: Role[] = ["owner", "admin", "member"];

export const ROLE_LABEL: Record<Role, string> = { owner: "Owner", admin: "Admin", member: "Member" };

export const VISIBILITY_LABEL: Record<Visibility, string> = {
    private: "Only me",
    group: "One group",
    org: "Whole organization",
};

export const displayName = (person: Pick<Profile, "first_name" | "last_name" | "email">): string =>
    [person.first_name, person.last_name].filter(Boolean).join(" ") || person.email;
