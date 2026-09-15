-- App-side user records. Supabase Auth owns accounts and passwords in auth.users;
-- public.users mirrors the id and email so app tables can reference a user.
-- Rows are created and kept in sync by triggers on auth.users, never by the app.

create table public.users (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null,
    created_at timestamptz not null default now()
);

create function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.users (id, email) values (new.id, new.email);
    return new;
end;
$$;

create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_auth_user();

create function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    update public.users set email = new.email where id = new.id;
    return new;
end;
$$;

create trigger on_auth_user_email_changed
    after update of email on auth.users
    for each row
    when (old.email is distinct from new.email)
    execute function public.handle_auth_user_email_change();

-- Same defense-in-depth model as conversations/messages: the backend's
-- service-role client bypasses RLS, direct clients can only read their own row.
alter table public.users enable row level security;

create policy "own user row" on public.users
    for select using (auth.uid() = id);
