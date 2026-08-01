import { createClient } from "@supabase/supabase-js";

// 이 클라이언트는 서버(Server Component / Server Action / Route Handler)에서만 사용합니다.
// service role key는 RLS를 우회하므로 절대 클라이언트 번들에 포함되면 안 됩니다.
// .env.local 에 SUPABASE_SERVICE_ROLE_KEY 를 추가하고,
// NEXT_PUBLIC_ 접두사를 붙이지 마세요 (붙이면 브라우저에 노출됩니다).

export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 확인하세요."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
