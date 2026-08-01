"use server";

import { clearMemberSession } from "@/lib/session";
import { redirect } from "next/navigation";

export async function memberLogoutAction() {
  await clearMemberSession();
  redirect("/login");
}
