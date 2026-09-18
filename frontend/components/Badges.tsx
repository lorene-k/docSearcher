import { ROLE_LABEL, VISIBILITY_LABEL } from "@/lib/model";
import type { Role, Visibility } from "@/lib/model";

// The palette stays the same for every role: the pill only says which role, it does not color-code it
export function RoleBadge({ role }: { role: Role }) {
    return <span className={`pill ${role === "member" ? "pill-neutral" : "pill-soft"}`}>{ROLE_LABEL[role]}</span>;
}

const VISIBILITY_GLYPH: Record<Visibility, string> = { private: "●", group: "◐", org: "○" };

export function VisibilityBadge({ visibility, groupName }: { visibility: Visibility; groupName?: string | null }) {
    return (
        <span className="pill pill-neutral">
            <span aria-hidden="true" className="text-plum">
                {VISIBILITY_GLYPH[visibility]}
            </span>
            {visibility === "group" && groupName ? groupName : VISIBILITY_LABEL[visibility]}
        </span>
    );
}
