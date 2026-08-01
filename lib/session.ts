import { cookies } from "next/headers";

const MEMBER_COOKIE = "eumdan_member_id";
const ADMIN_COOKIE = "eumdan_admin";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30일
};

// --- 팀원(일반 사용자) 세션 ---

export async function setMemberSession(memberId: string) {
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_COOKIE, memberId, COOKIE_OPTIONS);
}

export async function getMemberSession(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(MEMBER_COOKIE)?.value ?? null;
}

export async function clearMemberSession() {
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_COOKIE);
}

// --- 관리자 세션 ---
// 최소 구현: ADMIN_PASSWORD 환경변수와 대조 후 통과 시 쿠키 발급.
// 관리자가 1명뿐이라는 전제(질문에서 확인된 내용)라 별도 계정 테이블 없이 단순 비밀번호로 구성했습니다.
// 관리자가 여러 명이거나 더 강한 인증이 필요해지면 별도 admins 테이블 + 로그인으로 교체하세요.

export async function setAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, "1", COOKIE_OPTIONS);
}

export async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(ADMIN_COOKIE)?.value === "1";
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}
