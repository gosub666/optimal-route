-- 이음국세 v3: 로그인/팀 기능 제거, 최단경로 계산 기능만 유지
-- 기존 members/teams/route_shares/waypoints를 정리하고 새 스키마로 교체합니다.
-- ⚠️ 기존 데이터가 있다면 모두 삭제되니, 필요하면 먼저 백업하세요.

drop table if exists route_shares;
drop table if exists waypoints;
drop table if exists members;
drop table if exists teams;

create table waypoints (
  id uuid primary key default gen_random_uuid(),
  visit_date date not null default current_date,
  address text not null,
  lat double precision,
  lng double precision,
  appointment_time time,        -- 약속시간 (없으면 null)
  is_mail boolean not null default false,  -- 우편물 여부 (최후순위)
  label_no int not null,        -- 입력한 순번(표시용, 방문순서와 다를 수 있음)
  order_index int not null default 0,  -- 계산된 방문 순서
  completed boolean not null default false,
  visit_result text check (visit_result in ('completed', 'absent', 'refused')),
  created_at timestamptz not null default now()
);

create index waypoints_visit_date_idx on waypoints(visit_date);

-- 출발지 기본값 기억용 (로그인이 없으므로 단일 설정으로 관리)
create table app_settings (
  id text primary key default 'default',
  start_address text,
  start_lat double precision,
  start_lng double precision,
  updated_at timestamptz not null default now()
);
insert into app_settings (id) values ('default') on conflict (id) do nothing;

alter table waypoints enable row level security;
alter table app_settings enable row level security;
-- 정책 없음: 모든 읽기/쓰기는 서버(service role key)를 통해서만 수행되는 구조.
-- ⚠️ 로그인이 없는 구조라 이 URL에 접근 가능한 사람은 누구나 같은 목록을 보고 수정할 수 있습니다.
