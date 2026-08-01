# 이음국세 — 팀/팀원 CRUD + 로그인 추가분

기존 `optimal-route` 저장소가 비공개라 코드 구조를 직접 볼 수 없어서,
**독립적으로 붙일 수 있는 파일 세트**로 작성했습니다. 아래 순서대로 기존 프로젝트에 병합하세요.

## 1. 필요 패키지

```bash
npm install @supabase/supabase-js
```

## 2. 환경변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=기존에 쓰던 값 그대로
SUPABASE_SERVICE_ROLE_KEY=Supabase 프로젝트 설정 > API > service_role key
ADMIN_PASSWORD=관리자 페이지 비밀번호(임의로 정한 문자열)
```

`SUPABASE_SERVICE_ROLE_KEY`는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 마세요 — 붙이면 브라우저에 노출됩니다.

## 3. DB 마이그레이션

`sql/001_teams_members.sql`을 Supabase SQL Editor에서 실행하세요.
`teams`, `members` 테이블이 새로 생깁니다. 기존 테이블과 이름이 겹치지 않는지 먼저 확인해 주세요.

## 4. 파일 배치

아래 경로 그대로 기존 Next.js(App Router) 프로젝트에 복사하면 됩니다.

```
lib/supabase/server.ts
lib/session.ts
app/login/page.tsx
app/login/actions.ts
app/admin/login/page.tsx
app/admin/login/actions.ts
app/admin/teams/page.tsx
app/admin/teams/actions.ts
app/admin/teams/[teamId]/page.tsx
```

기존 프로젝트가 `@/`를 `tsconfig.json`의 경로 별칭으로 이미 쓰고 있다면 그대로 동작합니다.
안 쓰고 있다면 import 경로를 상대경로로 바꿔주세요.

## 5. 기존 `/route` 페이지 로그인 연동

- `/route` 페이지 진입 시 `getMemberSession()` (`lib/session.ts`)으로 로그인 여부를 확인하고,
  없으면 `/login`으로 리다이렉트하도록 한 줄만 추가하면 됩니다.
- 로그인한 팀원의 `team_id`가 필요하면 `members` 테이블에서 세션의 member id로 조회하세요.

## 6. 공유코드(경유지 공유) 접근 제어 — 기존 코드에 직접 적용 필요

기존 공유코드 관련 코드(테이블명, API 위치)를 확인하지 못해 이 부분은 **패턴만** 제공합니다.
공유코드를 저장하는 테이블(`route_shares` 등으로 가정)에 다음을 적용하세요:

1. 공유코드 저장 시 `author_member_id` 컬럼에 작성자의 member id를 함께 저장
2. 공유코드 조회 API에서, 요청자의 로그인 세션으로 `team_id`를 확인
3. 아래 조건이 참일 때만 경유지 목록을 반환:

```ts
const requesterMember = await getMemberById(requesterMemberId); // 세션에서
const authorMember = await getMemberById(routeShare.author_member_id);

if (requesterMember.team_id !== authorMember.team_id) {
  // 접근 거부 — "같은 팀 소속이 아닙니다" 등으로 응답
}
```

이 부분은 실제 저장소 코드를 보여주시면 정확한 파일/함수에 맞춰 바로 패치해 드릴 수 있습니다.

## 7. 관리자 페이지 접근

`/admin/login`에서 `ADMIN_PASSWORD`로 로그인 → `/admin/teams`에서 팀 생성/삭제,
팀 클릭 시 상세 페이지에서 팀원 추가/수정/삭제.

셀프 가입 없이, 관리자가 등록한 이름+전화번호로만 팀원이 `/login`에서 로그인할 수 있습니다.
