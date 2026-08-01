-- 이음국세: 팀 / 팀원 스키마
-- Supabase SQL Editor에서 실행

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams(id) on delete cascade,
  name text not null,
  phone text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists members_team_id_idx on members(team_id);
create index if not exists members_phone_idx on members(phone);

-- RLS 활성화: 클라이언트(anon key)에서는 직접 접근 불가,
-- 모든 쓰기/조회는 서버(서비스 롤 or 서버 액션)를 통해서만 수행
alter table teams enable row level security;
alter table members enable row level security;

-- 정책을 만들지 않으면 기본적으로 anon/authenticated 키로는 아무 것도 조회/수정 불가.
-- 관리자 CRUD와 로그인 조회는 모두 서버 사이드(service role key)에서만 수행하는 구조를 전제로 함.

-- 기존 route_shares(공유코드) 테이블에 팀 기반 접근 제어를 붙이려면
-- author_member_id 컬럼(members.id 참조)이 있는지 확인하고, 없다면 아래처럼 추가:
--
-- alter table route_shares add column if not exists author_member_id uuid references members(id);
--
-- 조회 시 애플리케이션 레벨에서 다음 조건으로 검증:
--   requester.team_id === (select team_id from members where id = route_shares.author_member_id)
