"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { setMemberSession } from "@/lib/session";
import { redirect } from "next/navigation";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/[^0-9]/g, "");

  if (!name || !phone) {
    return { error: "이름과 전화번호를 모두 입력해 주세요." };
  }

  const supabase = createServerSupabase();

  // 관리자가 미리 등록해둔 팀원만 로그인 가능 (셀프 가입 없음)
  const { data: member, error } = await supabase
    .from("members")
    .select("id, name, phone, team_id")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    return { error: "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." };
  }

  if (!member || member.name !== name) {
    return { error: "등록되지 않은 이름/전화번호입니다. 관리자에게 문의해 주세요." };
  }

  await setMemberSession(member.id);
  redirect("/route");
}
