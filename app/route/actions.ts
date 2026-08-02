"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/geocode";
import { planRoute, type PlannerPoint } from "@/lib/routePlanner";
import { saveStartAddress } from "@/lib/settings";
import { revalidatePath } from "next/cache";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// --- 경유지 CRUD (오늘 날짜 기준, 로그인 없이 단일 목록) ---

export async function addWaypoint(formData: FormData) {
  const address = String(formData.get("address") ?? "").trim();
  const appointmentTime = String(formData.get("appointmentTime") ?? "").trim() || null;
  const isMail = formData.get("isMail") === "on";

  if (!address) throw new Error("주소를 입력해 주세요.");

  const geo = await geocodeAddress(address);
  const supabase = createServerSupabase();

  const { data: existing } = await supabase
    .from("waypoints")
    .select("order_index, label_no")
    .eq("visit_date", todayStr())
    .order("label_no", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;
  const nextLabel = (existing?.[0]?.label_no ?? 0) + 1;

  const { error } = await supabase.from("waypoints").insert({
    visit_date: todayStr(),
    address: geo.address,
    lat: geo.lat,
    lng: geo.lng,
    appointment_time: appointmentTime,
    is_mail: isMail,
    order_index: nextOrder,
    label_no: nextLabel,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/route");
}

export async function deleteWaypoint(waypointId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("waypoints").delete().eq("id", waypointId);
  if (error) throw new Error(error.message);

  revalidatePath("/route");
}

export type VisitResult = "completed" | "absent" | "refused";

export async function recordVisitResult(waypointId: string, result: VisitResult) {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("waypoints")
    .update({ completed: true, visit_result: result })
    .eq("id", waypointId);
  if (error) throw new Error(error.message);

  revalidatePath("/route");
}

// --- 출발지 저장 ---

export async function setStartAddress(address: string) {
  const geo = await geocodeAddress(address);
  await saveStartAddress(geo.address, geo.lat, geo.lng);
  revalidatePath("/route");
  return geo;
}

// --- 경로 계산 (우선순위 기반) ---

export type PlannedStopResult = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  label_no: number;
  appointment_time: string | null;
  is_mail: boolean;
  visit_order: number;
};

export async function planMyRoute(startAddress: string): Promise<{
  start: { name: string; lat: number; lng: number };
  stops: PlannedStopResult[];
}> {
  const supabase = createServerSupabase();

  const { data: waypoints, error } = await supabase
    .from("waypoints")
    .select("id, address, lat, lng, label_no, appointment_time, is_mail")
    .eq("visit_date", todayStr())
    .eq("completed", false);
  if (error) throw new Error(error.message);
  if (!waypoints || waypoints.length === 0) {
    throw new Error("계산할 경유지가 없습니다.");
  }

  const startGeo = await geocodeAddress(startAddress);
  await saveStartAddress(startGeo.address, startGeo.lat, startGeo.lng);

  const plannerPoints: PlannerPoint[] = waypoints.map((w) => ({
    id: w.id,
    lat: w.lat!,
    lng: w.lng!,
    appointmentTime: w.appointment_time,
    isMail: w.is_mail,
  }));

  const planned = planRoute({ lat: startGeo.lat, lng: startGeo.lng }, plannerPoints);
  const orderMap = new Map(planned.map((p) => [p.id, p.visitOrder]));
  const byId = new Map(waypoints.map((w) => [w.id, w]));

  // 계산된 방문 순서를 order_index에 반영
  for (const p of planned) {
    await supabase.from("waypoints").update({ order_index: p.visitOrder }).eq("id", p.id);
  }

  revalidatePath("/route");

  const stops: PlannedStopResult[] = planned
    .sort((a, b) => a.visitOrder - b.visitOrder)
    .map((p) => {
      const w = byId.get(p.id)!;
      return {
        id: w.id,
        address: w.address,
        lat: w.lat!,
        lng: w.lng!,
        label_no: w.label_no,
        appointment_time: w.appointment_time,
        is_mail: w.is_mail,
        visit_order: p.visitOrder,
      };
    });

  return {
    start: { name: "출발지", lat: startGeo.lat, lng: startGeo.lng },
    stops,
  };
}
