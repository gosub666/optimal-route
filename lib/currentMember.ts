import { createServerSupabase } from "@/lib/supabase/server";
import { getMemberSession } from "@/lib/session";

export type CurrentMember = {
  id: string;
  name: string;
  phone: string;
  team_id: string;
  team_name: string;
};

export async function getCurrentMember(): Promise<CurrentMember | null> {
  const memberId = await getMemberSession();
  if (!memberId) return null;

  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("members")
    .select("id, name, phone, team_id, teams(name)")
    .eq("id", memberId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    phone: data.phone,
    team_id: data.team_id,
    team_name: (data as any).teams?.name ?? "",
  };
}
