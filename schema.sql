-- Run this whole script in Supabase Dashboard -> SQL Editor.
create table if not exists public.profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique,
 start_date date not null default current_date,
 xp integer not null default 0 check (xp >= 0),
 completed_days integer[] not null default '{}',
 completed_dates date[] not null default '{}',
 side_dates date[] not null default '{}',
 created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "Public can view profiles" on public.profiles;
create policy "Public can view profiles" on public.profiles for select to anon, authenticated using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile" on public.profiles for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
declare wanted text;
begin
 wanted := coalesce(new.raw_user_meta_data->>'username','Sage_'||substr(new.id::text,1,6));
 if length(wanted)<3 or length(wanted)>20 or wanted !~ '^[A-Za-z0-9_]+$' then wanted:='Sage_'||substr(new.id::text,1,6); end if;
 begin
  insert into public.profiles(user_id,username) values(new.id,wanted);
 exception when unique_violation then
  insert into public.profiles(user_id,username) values(new.id,'Sage_'||substr(new.id::text,1,8));
 end;
 return new;
end; $$;

drop trigger if exists on_auth_user_created_sage100 on auth.users;
create trigger on_auth_user_created_sage100 after insert on auth.users for each row execute procedure public.create_profile_for_new_user();

create or replace function public.level_from_xp(p_xp integer) returns integer
language plpgsql immutable as $$
declare v_level integer:=1; v_remaining integer:=greatest(p_xp,0);
begin
 while v_remaining >= v_level*100 loop v_remaining:=v_remaining-v_level*100;v_level:=v_level+1;exit when v_level>1000;end loop;
 return v_level;
end; $$;

create or replace function public.complete_today() returns jsonb
language plpgsql security invoker set search_path=public as $$
declare uid uuid:=auth.uid(); p public.profiles; day_num integer; quest_xp integer; after_level integer; today_date date:=current_date;
begin
 if uid is null then return jsonb_build_object('ok',false,'message','You must be logged in.'); end if;
 select * into p from public.profiles where user_id=uid for update;
 if not found then return jsonb_build_object('ok',false,'message','Profile not found.'); end if;
 day_num:=greatest(1,least(100,(today_date-p.start_date)+1));
 quest_xp:=case day_num when 1 then 10 when 2 then 15 when 3 then 20 when 4 then 10 when 5 then 15 when 6 then 10 when 7 then 15 when 8 then 20 when 9 then 10 else 15 end;
 if day_num=any(p.completed_days) then return jsonb_build_object('ok',false,'message','Today is already complete.'); end if;
 update public.profiles set completed_days=array_append(completed_days,day_num),completed_dates=array_append(completed_dates,today_date),xp=xp+quest_xp where user_id=uid returning * into p;
 after_level:=public.level_from_xp(p.xp);
 return jsonb_build_object('ok',true,'xp_awarded',quest_xp,'level',after_level,'profile',to_jsonb(p));
end; $$;

create or replace function public.complete_side_today() returns jsonb
language plpgsql security invoker set search_path=public as $$
declare uid uuid:=auth.uid(); p public.profiles; today_date date:=current_date;
begin
 if uid is null then return jsonb_build_object('ok',false,'message','You must be logged in.'); end if;
 select * into p from public.profiles where user_id=uid for update;
 if not found then return jsonb_build_object('ok',false,'message','Profile not found.'); end if;
 if today_date=any(p.side_dates) then return jsonb_build_object('ok',false,'message','Side quest already complete.'); end if;
 update public.profiles set side_dates=array_append(side_dates,today_date),xp=xp+5 where user_id=uid returning * into p;
 return jsonb_build_object('ok',true,'xp_awarded',5,'profile',to_jsonb(p));
end; $$;

grant execute on function public.complete_today() to authenticated;
grant execute on function public.complete_side_today() to authenticated;
grant execute on function public.level_from_xp(integer) to authenticated;
