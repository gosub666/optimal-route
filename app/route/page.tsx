import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/currentMember";
import { createServerSupabase } from "@/lib/supabase/server";
import RouteClient from "./RouteClient";

export default async function RoutePage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login");

  const supabase = createServerSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: waypoints } = await supabase
    .from("waypoints")
    .select("id, address, lat, lng, order_index, completed, label_no")
    .eq("member_id", member.id)
    .eq("visit_date", today)
    .order("order_index", { ascending: true });

  return <RouteClient member={member} initialWaypoints={waypoints ?? []} />;
}
