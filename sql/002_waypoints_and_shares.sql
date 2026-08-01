-- 이음국세: 경유지 / 공유코드 스키마
-- 001_teams_members.sql 이후에 실행

create table if not exists waypoints (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  visit_date date not null default current_date,
  address text not null,
  lat double precision,
  lng double precision,
  order_index int not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists waypoints_member_date_idx on waypoints(member_id, visit_date);

create table if not exists route_shares (
  share_code text primary key,
  author_member_id uuid not null references members(id) on delete cascade,
  team_id uuid not null references teams(id) on delete cascade,
  visit_date date not null,
  -- 공유 시점의 경유지 스냅샷 (이후 작성자가 목록을 바꿔도 공유코드 내용은 고정)
  waypoints_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists route_shares_team_idx on route_shares(team_id);

alter table waypoints enable row level security;
alter table route_shares enable row level security;
-- 정책 없음: 모든 읽기/쓰기는 서버(service role key)를 통해서만 수행되는 구조.
-- 공유코드 조회 시 "요청자의 team_id == route_shares.team_id" 검증은
-- app/route/actions.ts의 loadSharedRoute()에서 수행합니다.
