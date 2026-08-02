import { createServerSupabase } from "@/lib/supabase/server";
import { getStartAddress } from "@/lib/settings";
import RouteClient from "./RouteClient";

export const dynamic = "force-dynamic";

export default async function RoutePage() {
  const supabase = createServerSupabase();
  const today = new Date().toISOString().slice(0, 10);

  const { data: waypoints } = await supabase
    .from("waypoints")
    .select("id, address, lat, lng, order_index, completed, label_no, appointment_time, is_mail")
    .eq("visit_date", today)
    .order("order_index", { ascending: true });

  const dedupedWaypoints = Array.from(
    new Map((waypoints ?? []).map((w) => [w.id, w])).values()
  );

  const start = await getStartAddress();

  return <RouteClient initialWaypoints={dedupedWaypoints} initialStartAddress={start.address ?? ""} />;
}
