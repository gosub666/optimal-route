// SK Open API - TMAP 경유지 순서 최적화 (routeOptimization10)
// https://skopenapi.readme.io/reference/경유지-최적화-샘플예제
// 최대 10개 경유지까지 지원. 서버에서만 호출 (앱 키를 클라이언트에 노출하지 않기 위함)

export type OptimizeInput = {
  start: { name: string; lat: number; lng: number };
  waypoints: { id: string; name: string; lat: number; lng: number }[];
};

export type OptimizedWaypoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
};

export async function optimizeRoute(input: OptimizeInput): Promise<OptimizedWaypoint[]> {
  const appKey = process.env.TMAP_APP_KEY;
  if (!appKey) {
    throw new Error("TMAP_APP_KEY 환경변수가 설정되어 있지 않습니다.");
  }
  if (input.waypoints.length === 0) {
    return [];
  }
  if (input.waypoints.length > 10) {
    throw new Error("경유지는 최대 10개까지 한 번에 최적화할 수 있습니다.");
  }

  // 마지막 경유지를 목적지(end)로, 나머지를 viaPoints로 사용
  const last = input.waypoints[input.waypoints.length - 1];
  const viaPoints = input.waypoints.slice(0, -1);

  const body = {
    reqCoordType: "WGS84GEO",
    resCoordType: "WGS84GEO",
    startName: input.start.name,
    startX: String(input.start.lng),
    startY: String(input.start.lat),
    endName: last.name,
    endX: String(last.lng),
    endY: String(last.lat),
    endPoiId: "",
    searchOption: "0",
    carType: "0",
    viaPoints: viaPoints.map((v, idx) => ({
      viaPointId: v.id,
      viaPointName: v.name,
      viaX: String(v.lng),
      viaY: String(v.lat),
    })),
  };

  const res = await fetch(
    "https://apis.openapi.sk.com/tmap/routes/routeOptimization10?version=1",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        appKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TMAP 경로 최적화 실패 (status ${res.status}): ${text}`);
  }

  const data = await res.json();

  // 응답 구조: features 배열 중 각 지점(Point)에 순서 정보가 담겨 있음.
  // TMAP 응답 포맷은 버전에 따라 약간씩 다를 수 있어, 방어적으로 파싱합니다.
  const features: any[] = data?.features ?? [];
  const pointFeatures = features.filter((f) => f?.geometry?.type === "Point");

  const byId = new Map(input.waypoints.map((w) => [w.id, w]));

  const ordered: OptimizedWaypoint[] = pointFeatures
    .map((f) => {
      const viaId: string | undefined = f?.properties?.viaPointId;
      const isEnd = f?.properties?.pointType === "EP" || f?.properties?.pointIndex === undefined && !viaId;
      const source = viaId ? byId.get(viaId) : isEnd ? last : undefined;
      if (!source) return null;
      return {
        id: source.id,
        name: source.name,
        lat: source.lat,
        lng: source.lng,
        order: Number(f?.properties?.viaPointOrder ?? f?.properties?.pointIndex ?? 0),
      };
    })
    .filter((x): x is OptimizedWaypoint => x !== null)
    .sort((a, b) => a.order - b.order);

  // 파싱이 실패한 경우(TMAP 응답 포맷 변경 등) 원래 순서를 그대로 반환해 최소한 동작은 하게 함
  if (ordered.length === 0) {
    return input.waypoints.map((w, idx) => ({ ...w, order: idx }));
  }

  return ordered;
}
