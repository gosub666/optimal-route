"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { isAdminSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const ok = await isAdminSession();
  if (!ok) {
    throw new Error("관리자 인증이 필요합니다.");
  }
}

// --- 팀 ---

export async function createTeam(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("팀명을 입력해 주세요.");

  const supabase = createServerSupabase();
  const { error } = await supabase.from("teams").insert({ name });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/teams");
}

export async function renameTeam(teamId: string, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("팀명을 입력해 주세요.");

  const supabase = createServerSupabase();
  const { error } = await supabase.from("teams").update({ name }).eq("id", teamId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/teams");
  revalidatePath(`/admin/teams/${teamId}`);
}

export async function deleteTeam(teamId: string) {
  await requireAdmin();
  const supabase = createServerSupabase();
  // members는 team_id에 on delete cascade가 걸려 있어 팀 삭제 시 팀원도 함께 삭제됩니다.
  const { error } = await supabase.from("teams").delete().eq("id", teamId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/teams");
}

// --- 팀원 ---

export async function createMember(teamId: string, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/[^0-9]/g, "");

  if (!name || !phone) throw new Error("이름과 전화번호를 입력해 주세요.");

  const supabase = createServerSupabase();
  const { error } = await supabase.from("members").insert({ team_id: teamId, name, phone });
  if (error) {
    if (error.code === "23505") {
      throw new Error("이미 등록된 전화번호입니다.");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/admin/teams/${teamId}`);
}

export async function updateMember(memberId: string, teamId: string, formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").replace(/[^0-9]/g, "");

  if (!name || !phone) throw new Error("이름과 전화번호를 입력해 주세요.");

  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("members")
    .update({ name, phone })
    .eq("id", memberId);
  if (error) {
    if (error.code === "23505") {
      throw new Error("이미 등록된 전화번호입니다.");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/admin/teams/${teamId}`);
}

export async function deleteMember(memberId: string, teamId: string) {
  await requireAdmin();
  const supabase = createServerSupabase();
  const { error } = await supabase.from("members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);

  revalidatePath(`/admin/teams/${teamId}`);
}
