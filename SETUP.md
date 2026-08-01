# 이음국세 v2 — 설정 가이드

## 1. 패키지 설치
```bash
npm install
```

## 2. 환경변수 (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
KAKAO_REST_API_KEY=      # 카카오 로컬 API (주소검색/지오코딩)
TMAP_APP_KEY=            # SK Open API (TMAP 경유지 순서 최적화)
```

`SUPABASE_SERVICE_ROLE_KEY`, `KAKAO_REST_API_KEY`, `TMAP_APP_KEY`는 서버 전용입니다.
`NEXT_PUBLIC_` 접두사를 붙이지 마세요.

## 3. DB 마이그레이션
Supabase SQL Editor에서 순서대로 실행:
1. `sql/001_teams_members.sql`
2. `sql/002_waypoints_and_shares.sql`

## 4. 기능 요약

### 로그인 (`/login`, `/admin/login`)
- 팀원: 이름 + 전화번호 (인증 없음, 관리자가 사전 등록한 사람만 로그인 가능)
- 관리자: `ADMIN_PASSWORD` 비밀번호 1개

### 관리자 (`/admin/teams`)
- 팀 생성/삭제, 팀원 추가/수정/삭제

### 경로 (`/route`)
- 오늘 날짜 기준 경유지 추가/삭제/완료 체크
- **경유지 추가 시 카카오 로컬 API로 자동 지오코딩**(주소 → 좌표)
- **"최적 경로로 출발"**: 출발지 주소 입력 → TMAP `routeOptimization10`으로 순서 계산
  → 계산된 순서대로 한 곳씩 티맵/카카오맵 딥링크로 안내, 도착 체크 시 다음 목적지로 진행
  (※ 티맵/카카오맵 모두 앱을 다중 경유지로 한 번에 여는 공식 방법이 없어, 순서 계산은 서버에서
  미리 하고 안내는 한 곳씩 순차적으로 넘기는 방식입니다.)
- **공유코드**: 내 경유지 목록을 6자리 코드로 발급 → 같은 팀 소속 팀원만 코드로 조회/대체 가능
  (팀이 다르면 "같은 팀 소속만 조회 가능" 오류)

## 5. 확인/검증이 필요한 부분

- `lib/tmap.ts`의 `routeOptimization10` 응답 파싱은 **공개된 샘플 스펙 기준으로 작성**했고,
  실제 발급받으신 TMAP 앱 키로 아직 테스트해보지 못했습니다. 응답 필드명이 다르면
  (`viaPointOrder`, `pointType` 등) 실제 응답을 보고 파싱 부분만 조정하면 됩니다.
- 카카오맵 딥링크(`kakaomap://route?ep=lat,lng&by=CAR`)는 목적지 좌표만 넘기고 이름은
  카카오맵이 자체적으로 표시합니다 — 필요시 카카오맵 공식 문서로 재확인 권장.
- 출발지는 매번 직접 입력하는 방식으로 구현했습니다. 즐겨찾기 출발지(세무서/집) 기능은
  아직 없음 — 다음 단계로 추가 가능합니다.
