"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMapsSdk } from "@/lib/kakaoMaps";

export type PreviewStop = {
  lat: number;
  lng: number;
  visit_order: number; // 0-based
};

export default function RoutePreviewMap({
  start,
  stops,
}: {
  start: { lat: number; lng: number };
  stops: PreviewStop[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadKakaoMapsSdk()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        const kakao = window.kakao;

        const bounds = new kakao.maps.LatLngBounds();
        const startPos = new kakao.maps.LatLng(start.lat, start.lng);
        bounds.extend(startPos);

        const map = new kakao.maps.Map(containerRef.current, {
          center: startPos,
          level: 7,
        });

        // 출발지 마커 (초록 원)
        new kakao.maps.CustomOverlay({
          map,
          position: startPos,
          content: `<div style="width:28px;height:28px;border-radius:9999px;background:#16a34a;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3);"></div>`,
          yAnchor: 0.5,
        });

        // 경유지 번호 마커 (주황 원 + 방문순서 숫자)
        const linePath = [startPos];
        for (const stop of stops) {
          const pos = new kakao.maps.LatLng(stop.lat, stop.lng);
          bounds.extend(pos);
          linePath.push(pos);

          new kakao.maps.CustomOverlay({
            map,
            position: pos,
            content: `<div style="width:26px;height:26px;border-radius:9999px;background:#ea580c;color:white;font-size:13px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.3);">${
              stop.visit_order + 1
            }</div>`,
            yAnchor: 0.5,
          });
        }

        // 경유지를 잇는 선 (참고용 직선 — 실제 도로 경로가 아닌 방문 순서 표시)
        new kakao.maps.Polyline({
          map,
          path: linePath,
          strokeWeight: 4,
          strokeColor: "#185FA5",
          strokeOpacity: 0.8,
          strokeStyle: "solid",
        });

        map.setBounds(bounds);
      })
      .catch((e) => setError(e.message));

    return () => {
      cancelled = true;
    };
  }, [start, stops]);

  if (error) {
    return (
      <div className="w-full h-40 flex items-center justify-center bg-gray-50 rounded-lg text-xs text-red-500">
        지도 로드 실패: {error}
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-40 rounded-lg overflow-hidden" />;
}
