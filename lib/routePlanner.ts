import { haversineDistance, type LatLng } from "./distance";

export type PlannerPoint = LatLng & {
  id: string;
  appointmentTime: string | null; // "HH:MM" 또는 null
  isMail: boolean;
};

export type PlannedStop = {
  id: string;
  visitOrder: number; // 0-based
};

/**
 * 우선순위 기반 경로 계산
 * 1) 약속시간이 있는 경유지: 약속시간 순서대로 방문 (뼈대, 순서 고정)
 * 2) 약속시간이 없는 일반 경유지: 뼈대 사이에서 이동거리가 가장 적게 늘어나는 위치에 삽입
 *    (자연스럽게 "가장 가까운 약속 위치" 근처에 배치됨)
 * 3) 우편물: 항상 최후순위 — 위 경로가 끝난 뒤, 마지막 지점에서 가장 가까운 순서로 방문
 *
 * ⚠️ 이 알고리즘은 휴리스틱(근사)입니다. 지점 수가 많아질수록 완벽한 최단경로가 아닐 수 있습니다.
 *    거리 계산은 직선거리(Haversine) 기준이며, 실제 도로 거리와는 차이가 있을 수 있습니다.
 */
export function planRoute(start: LatLng, points: PlannerPoint[]): PlannedStop[] {
  const mail = points.filter((p) => p.isMail);
  const withTime = points
    .filter((p) => !p.isMail && p.appointmentTime)
    .sort((a, b) => (a.appointmentTime! < b.appointmentTime! ? -1 : 1));
  const noTime = points.filter((p) => !p.isMail && !p.appointmentTime);

  // 1) 뼈대: 약속시간 순서 고정
  const route: PlannerPoint[] = [...withTime];

  // 2) 일반 경유지: cheapest insertion — 삽입 시 늘어나는 거리가 최소인 위치에 끼워넣기
  const remaining = [...noTime];
  while (remaining.length > 0) {
    let bestIdx = -1;
    let bestPos = -1;
    let bestCost = Infinity;

    for (let ri = 0; ri < remaining.length; ri++) {
      const point = remaining[ri];
      for (let pos = 0; pos <= route.length; pos++) {
        const prev = pos === 0 ? start : route[pos - 1];
        const next = pos < route.length ? route[pos] : null;

        const cost = next
          ? haversineDistance(prev, point) +
            haversineDistance(point, next) -
            haversineDistance(prev, next)
          : haversineDistance(prev, point);

        if (cost < bestCost) {
          bestCost = cost;
          bestIdx = ri;
          bestPos = pos;
        }
      }
    }

    const [chosen] = remaining.splice(bestIdx, 1);
    route.splice(bestPos, 0, chosen);
  }

  // 3) 우편물: 최후순위 — 남은 경로 끝에서부터 가장 가까운 순서로 방문
  const mailRemaining = [...mail];
  let current: LatLng = route.length > 0 ? route[route.length - 1] : start;
  while (mailRemaining.length > 0) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < mailRemaining.length; i++) {
      const d = haversineDistance(current, mailRemaining[i]);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const [chosen] = mailRemaining.splice(bestIdx, 1);
    route.push(chosen);
    current = chosen;
  }

  return route.map((p, idx) => ({ id: p.id, visitOrder: idx }));
}
