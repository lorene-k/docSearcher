# TODO-BACKEND

The frontend now implements the full organization model from DECISIONS.md (roles, per-document visibility, groups, invitations, profiles). Where the backend has no endpoint yet, the frontend calls the planned one and, on a 404 or 405, answers from a local stand-in in `frontend/lib/placeholders.ts` that keeps its state in the browser. This file lists what the backend needs so that stand-in can be deleted. Every endpoint below sits behind the existing session cookie unless stated otherwise, and every timestamp is `timestamptz` serialized as ISO 8601.

The contract is written from the frontend's point of view: request and response shapes are exactly what `frontend/lib/api.ts` sends and expects, so implementing them as written makes the placeholder layer unnecessary without any frontend change.

## Shared shapes

```
Role       = "owner" | "admin" | "member"
Visibility = "private" | "group" | "org"

Org        { id, name }
Profile    { id, email, first_name, last_name }
Me         Profile + { role, org: Org }
Member     Profile + { role, joined_at }
Group      { id, name, admin_id, member_ids: string[], created_at }
Invite     { id, email, org_name, invited_by (display name), created_at }
Document   { id, filename, visibility, uploader_id, uploader_name, group_id, group_name, created_at }
```

## 1. Schema

One new migration under `backend/supabase/migrations/`, following the existing conventions (`timestamptz`, RLS enabled as defense in depth, `check` constraints for enumerated text columns):

- `orgs (id uuid pk, name text not null, created_at timestamptz)`
- `org_members (user_id uuid pk references public.users on delete cascade, org_id uuid references orgs, role text check (role in ('owner','admin','member')), joined_at timestamptz)`. One row per user: a user belongs to exactly one org. Enforce a single owner per org (partial unique index on `org_id where role = 'owner'`).
- `groups (id uuid pk, org_id uuid references orgs, name text not null, admin_id uuid references public.users, created_at timestamptz)`
- `group_members (group_id uuid references groups on delete cascade, user_id uuid references public.users on delete cascade, primary key (group_id, user_id))`. The group admin is not stored here, `groups.admin_id` is enough.
- `invites (id uuid pk, org_id uuid references orgs on delete cascade, email text not null, invited_by uuid references public.users, created_at timestamptz, unique (org_id, email))`
- `public.users`: add `first_name text not null default ''` and `last_name text not null default ''`. The signup trigger should copy them from `raw_user_meta_data` (see register below).
- `documents`: add `id uuid`, `org_id uuid references orgs`, `uploader_id uuid references public.users`, `visibility text check (visibility in ('private','group','org'))`, `group_id uuid references groups on delete set null`, `created_at timestamptz`. Chunks of one file share these values; a `document_id` on the chunk rows with a separate `documents` header table is the cleaner shape, the frontend does not care which.
- Signup trigger: when a row is inserted into `auth.users`, create the `public.users` row, an org named from the metadata (`org_name`, falling back to "<name>'s organization"), and an `org_members` row with role `owner`.

## 2. Auth and profile

- `POST /auth/register` now receives `first_name`, `last_name` and `org_name` in addition to `email` and `password`. Pass them to Supabase as `options.data` so the signup trigger can read them. The 202 body can stay as it is.
- `GET /auth/me` -> `Me`. Also extend `get_current_user` so every route knows the caller's `org_id` and `role`.
- `PATCH /auth/me` with `{ first_name, last_name }` -> `Me`.
- `POST /auth/password` with `{ current_password, new_password }` -> 204. Verify the current password by signing in with it (Supabase `sign_in_with_password`) before calling `update_user`. Answer 400 with detail `wrong_password` when the current one is wrong.

## 3. Organization

Owner only unless stated. A non-owner gets 403.

- `PATCH /org` `{ name }` -> `Org`
- `GET /org/members` -> `Member[]` (any role)
- `PATCH /org/members/{user_id}` `{ role: "admin" | "member" }` -> `Member[]`. Refuse to change the owner's row.
- `POST /org/transfer` `{ user_id }` -> `Member[]`. The target must be an admin of the same org; they become owner and the caller becomes admin, in one transaction.
- `DELETE /org/members/{user_id}` -> `Member[]`. Cannot remove the owner. The removed person must end up owning a fresh one-person org (every user has exactly one org), and is dropped from every group of the org they left. Their private documents stay theirs; decide what happens to documents they uploaded with wider visibility (the frontend assumes they stay in the org).

## 4. Invitations

- `GET /org/invites` -> `Invite[]` (owner)
- `POST /org/invites` `{ email }` -> `Invite[]` (owner). Send an email with a link to the app; the invitee sees the invitation on the organization page after logging in or registering with that address.
- `DELETE /org/invites/{invite_id}` -> `Invite[]` (owner)
- `GET /invites` -> `Invite[]` addressed to the caller's email (any role)
- `POST /invites/{invite_id}/accept` -> `Me`. Moves the caller to the inviting org as `member`, deletes their previous one-person org. Refuse with 409 and detail `transfer_ownership_first` when the caller owns an org that has other members. Delete the invite.
- `DELETE /invites/{invite_id}` -> 204, declines (only the invitee may).

## 5. Groups

- `GET /org/groups` -> `Group[]` (any role; members may receive all groups of the org, the frontend only shows them theirs)
- `POST /org/groups` `{ name }` -> `Group[]` (admin or owner; the caller becomes `admin_id`)
- `PATCH /org/groups/{group_id}` `{ name }` -> `Group[]` (the group's admin or the owner)
- `DELETE /org/groups/{group_id}` -> `Group[]` (same). Documents shared with the group fall back to `private`, or decide otherwise and update the frontend hint.
- `PUT /org/groups/{group_id}/members` `{ member_ids }` -> `Group[]` (same). Replaces the member list; the admin is never in it.

## 6. Documents

- `POST /upload` now receives two extra form fields, `visibility` and optional `group_id`. Enforce: members get 403; `group` requires a `group_id` of the caller's org; a member of that group or its admin only. Store `org_id`, `uploader_id`, `visibility`, `group_id`, `created_at`. Return the created `Document` (the frontend stops remembering visibility locally as soon as the response carries a `visibility` field).
- `GET /documents` -> `Document[]`, filtered to what the caller may read: their own uploads, documents of groups they belong to or run, and org-wide documents of their org. Today it returns bare filenames; the frontend accepts both shapes.
- `DELETE /documents/{id}`: private -> uploader only; group -> the group's admin or the owner; org -> any admin or the owner. Members get 403. The frontend currently passes the filename as the id; switch it to the real id once documents have one (`frontend/lib/api.ts`, `deleteDocument`).
- `PATCH /documents/{id}` `{ visibility, group_id }` -> `Document`. Only widening is allowed (private -> group -> org), by someone allowed to delete it and who is not a member.
- `POST /chat` and the vector search must only retrieve chunks the caller may read, with the same rule as `GET /documents`. Pass the caller's id, org and group ids to `match_documents` or filter after the fact.

## 7. Frontend cleanup once this is done

- Delete `frontend/lib/placeholders.ts`, its test, and the `withPlaceholder` wrapper plus the `placeholders.*` calls in `frontend/lib/api.ts`.
- Remove the "Preview mode" panel from `frontend/app/account/page.tsx` (it exists only to preview roles without a second account).
- Remove the `SignupProfile` re-export in `frontend/lib/api.ts` (it lives in the placeholder module today).
- Update `DECISIONS.md` and `CLAUDE.md` (endpoint list) accordingly.
