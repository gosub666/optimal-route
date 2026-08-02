import { createServerSupabase } from "@/lib/supabase/server";

export async function getStartAddress(): Promise<{
  address: string | null;
  lat: number | null;
  lng: number | null;
}> {
  const supabase = createServerSupabase();
  const { data } = await supabase
    .from("app_settings")
    .select("start_address, start_lat, start_lng")
    .eq("id", "default")
    .maybeSingle();

  return {
    address: data?.start_address ?? null,
    lat: data?.start_lat ?? null,
    lng: data?.start_lng ?? null,
  };
}

export async function saveStartAddress(address: string, lat: number, lng: number) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("app_settings")
    .update({
      start_address: address,
      start_lat: lat,
      start_lng: lng,
      updated_at: new Date().toISOString(),
    })
    .eq("id", "default");
  if (error) throw new Error(error.message);
}
