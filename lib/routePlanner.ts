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
 * 삽입 비용이 가장 적은 위치에 지점들을 하나씩 끼워넣는다 (cheapest insertion).
 * route 배열을 in-place로 변경한다.
 */
function insertCheapest(start: LatLng, route: PlannerPoint[], candidates: PlannerPoint[]) {
  const remaining = [...candidates];
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
}

/**
 * 우선순위 기반 경로 계산
 * 1) 약속시간이 있는 경유지: 약속시간 순서대로 방문 (뼈대, 순서 고정)
 * 2) 약속시간이 없는 일반 경유지: 이동거리가 가장 적게 늘어나는 위치에 먼저 끼워넣기 (좋은 자리 우선 선점)
 * 3) 우편물: 낮은 우선순위 — 일반 경유지가 자리를 잡은 뒤, 남은 기준으로 가장 효율적인 위치에 끼워넣기
 *    (무조건 맨 뒤가 아니라, 경로상 자연스럽게 지나가는 자리가 있으면 그 자리에 배치됨)
 *
 * ⚠️ 이 알고리즘은 휴리스틱(근사)입니다. 지점 수가 많아질수록 완벽한 최단경로가 아닐 수 있습니다.
 *    거리 계산은 직선거리(Haversine) 기준이며, 실제 도로 거리와는 차이가 있을 수 있습니다.
 *    약속시간이 있는 경유지 사이에도 다른 지점이 끼어들 수 있어, 이동시간이 길면
 *    약속시간에 늦을 가능성은 별도로 감안해야 합니다(이 알고리즘은 거리만 고려하고 시간은 계산하지 않습니다).
 */
export function planRoute(start: LatLng, points: PlannerPoint[]): PlannedStop[] {
  const mail = points.filter((p) => p.isMail);
  const withTime = points
    .filter((p) => !p.isMail && p.appointmentTime)
    .sort((a, b) => (a.appointmentTime! < b.appointmentTime! ? -1 : 1));
  const noTime = points.filter((p) => !p.isMail && !p.appointmentTime);

  // 1) 뼈대: 약속시간 순서 고정
  const route: PlannerPoint[] = [...withTime];

  // 2) 일반 경유지 먼저 삽입 (가장 좋은 자리 우선 선점)
  insertCheapest(start, route, noTime);

  // 3) 우편물은 그 다음 삽입 (남은 기준으로 가장 효율적인 자리에 배치, 무조건 맨 뒤가 아님)
  insertCheapest(start, route, mail);

  return route.map((p, idx) => ({ id: p.id, visitOrder: idx }));
}
