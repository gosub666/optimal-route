# 이음국세 (v2 — 로그인 + 팀/팀원 CRUD)

기존 소스는 폐기하고 새로 시작한 프로젝트의 1단계입니다.
Next.js (App Router) + TypeScript + Tailwind + Supabase.

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # 값 채우기
npm run dev
```

## 포함된 기능

- `/login` — 팀원 로그인 (이름 + 전화번호, 별도 인증 없음)
- `/admin/login` — 관리자 로그인 (ADMIN_PASSWORD 환경변수)
- `/admin/teams` — 팀 목록/생성/삭제
- `/admin/teams/[teamId]` — 팀원 목록/추가/수정/삭제

자세한 환경변수 설정, DB 마이그레이션, 다음 단계(경로/지도/도움 등 기존 기능 재구현,
공유코드 팀 접근 제어)는 `SETUP.md` 참고.
