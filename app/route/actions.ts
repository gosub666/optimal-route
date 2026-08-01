"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentMember } from "@/lib/currentMember";
import { geocodeAddress } from "@/lib/geocode";
import { optimizeRoute } from "@/lib/tmap";
import { revalidatePath } from "next/cache";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function requireMember() {
  const member = await getCurrentMember();
  if (!member) throw new Error("로그인이 필요합니다.");
  return member;
}

// --- 경유지 CRUD (오늘 날짜 기준) ---

export async function addWaypoint(formData: FormData) {
  const member = await requireMember();
  const address = String(formData.get("address") ?? "").trim();
  if (!address) throw new Error("주소를 입력해 주세요.");

  const geo = await geocodeAddress(address);

  const supabase = createServerSupabase();
  const { data: existing } = await supabase
    .from("waypoints")
    .select("order_index, label_no")
    .eq("member_id", member.id)
    .eq("visit_date", todayStr())
    .order("order_index", { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.order_index ?? -1) + 1;

  const { data: maxLabel } = await supabase
    .from("waypoints")
    .select("label_no")
    .eq("member_id", member.id)
    .eq("visit_date", todayStr())
    .order("label_no", { ascending: false })
    .limit(1);
  const nextLabel = (maxLabel?.[0]?.label_no ?? 0) + 1;

  const { error } = await supabase.from("waypoints").insert({
    member_id: member.id,
    team_id: member.team_id,
    visit_date: todayStr(),
    address: geo.address,
    lat: geo.lat,
    lng: geo.lng,
    order_index: nextOrder,
    label_no: nextLabel,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/route");
}

export async function deleteWaypoint(waypointId: string) {
  const member = await requireMember();
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("waypoints")
    .delete()
    .eq("id", waypointId)
    .eq("member_id", member.id);
  if (error) throw new Error(error.message);

  revalidatePath("/route");
}

export async function toggleWaypointCompleted(waypointId: string, completed: boolean) {
  const member = await requireMember();
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("waypoints")
    .update({ completed })
    .eq("id", waypointId)
    .eq("member_id", member.id);
  if (error) throw new Error(error.message);

  revalidatePath("/route");
}

export async function replaceAllWaypoints(
  waypoints: { address: string; lat: number; lng: number }[]
) {
  const member = await requireMember();
  const supabase = createServerSupabase();

  const { error: delError } = await supabase
    .from("waypoints")
    .delete()
    .eq("member_id", member.id)
    .eq("visit_date", todayStr());
  if (delError) throw new Error(delError.message);

  if (waypoints.length > 0) {
    const { error: insError } = await supabase.from("waypoints").insert(
      waypoints.map((w, idx) => ({
        member_id: member.id,
        team_id: member.team_id,
        visit_date: todayStr(),
        address: w.address,
        lat: w.lat,
        lng: w.lng,
        order_index: idx,
        label_no: idx + 1,
      }))
    );
    if (insError) throw new Error(insError.message);
  }

  revalidatePath("/route");
}

// --- 경로 최적화 ---

export type OptimizedStop = {
  id: string;
  address: string;
  lat: number;
  lng: number;
  label_no: number;
  visit_order: number; // 0-based 방문 순서
};

export async function optimizeMyRoute(startAddress: string): Promise<{
  start: { name: string; lat: number; lng: number };
  stops: OptimizedStop[];
}> {
  const member = await requireMember();
  const supabase = createServerSupabase();

  const { data: waypoints, error } = await supabase
    .from("waypoints")
    .select("id, address, lat, lng, label_no")
    .eq("member_id", member.id)
    .eq("visit_date", todayStr())
    .eq("completed", false)
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  if (!waypoints || waypoints.length === 0) {
    throw new Error("최적화할 경유지가 없습니다.");
  }

  const startGeo = await geocodeAddress(startAddress);

  const optimized = await optimizeRoute({
    start: { name: "출발지", lat: startGeo.lat, lng: startGeo.lng },
    waypoints: waypoints.map((w) => ({
      id: w.id,
      name: w.address,
      lat: w.lat!,
      lng: w.lng!,
    })),
  });

  const labelById = new Map(waypoints.map((w) => [w.id, w.label_no]));

  // 계산된 순서를 order_index에 반영 (label_no는 그대로 유지)
  for (const [idx, w] of optimized.entries()) {
    await supabase.from("waypoints").update({ order_index: idx }).eq("id", w.id);
  }

  revalidatePath("/route");

  return {
    start: { name: "출발지", lat: startGeo.lat, lng: startGeo.lng },
    stops: optimized.map((w, idx) => ({
      id: w.id,
      address: w.name,
      lat: w.lat,
      lng: w.lng,
      label_no: labelById.get(w.id) ?? idx + 1,
      visit_order: idx,
    })),
  };
}

// --- 공유코드 ---

function generateShareCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createShareCode() {
  const member = await requireMember();
  const supabase = createServerSupabase();

  const { data: waypoints, error } = await supabase
    .from("waypoints")
    .select("address, lat, lng, order_index")
    .eq("member_id", member.id)
    .eq("visit_date", todayStr())
    .order("order_index", { ascending: true });
  if (error) throw new Error(error.message);
  if (!waypoints || waypoints.length === 0) {
    throw new Error("공유할 경유지가 없습니다.");
  }

  let code = generateShareCode();
  // 코드 충돌 시 재시도 (드묾)
  for (let i = 0; i < 5; i++) {
    const { data: exists } = await supabase
      .from("route_shares")
      .select("share_code")
      .eq("share_code", code)
      .maybeSingle();
    if (!exists) break;
    code = generateShareCode();
  }

  const { error: insError } = await supabase.from("route_shares").insert({
    share_code: code,
    author_member_id: member.id,
    team_id: member.team_id,
    visit_date: todayStr(),
    waypoints_snapshot: waypoints,
  });
  if (insError) throw new Error(insError.message);

  return code;
}

export type SharedRoutePreview = {
  address: string;
  lat: number;
  lng: number;
  order_index: number;
}[];

export async function previewShareCode(code: string): Promise<SharedRoutePreview> {
  const member = await requireMember();
  const supabase = createServerSupabase();

  const { data: share, error } = await supabase
    .from("route_shares")
    .select("team_id, waypoints_snapshot")
    .eq("share_code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!share) throw new Error("존재하지 않는 공유코드입니다.");

  // 접근 제어: 같은 팀 소속일 때만 조회 가능
  if (share.team_id !== member.team_id) {
    throw new Error("같은 팀 소속만 이 공유코드를 조회할 수 있습니다.");
  }

  return share.waypoints_snapshot as SharedRoutePreview;
}

export async function loadShareCode(code: string) {
  const preview = await previewShareCode(code); // 팀 검증 포함
  await replaceAllWaypoints(
    preview.map((p) => ({ address: p.address, lat: p.lat, lng: p.lng }))
  );
}
