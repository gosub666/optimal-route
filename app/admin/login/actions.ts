"use server";

import { setAdminSession } from "@/lib/session";
import { redirect } from "next/navigation";

export type AdminLoginState = { error?: string };

export async function adminLoginAction(
  _prevState: AdminLoginState,
  formData: FormData
): Promise<AdminLoginState> {
  const password = String(formData.get("password") ?? "");

  if (!process.env.ADMIN_PASSWORD) {
    return { error: "서버에 ADMIN_PASSWORD 환경변수가 설정되어 있지 않습니다." };
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  await setAdminSession();
  redirect("/admin/teams");
}
