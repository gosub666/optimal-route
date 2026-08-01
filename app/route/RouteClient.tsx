"use client";

import { useState, useTransition } from "react";
import {
  addWaypoint,
  deleteWaypoint,
  toggleWaypointCompleted,
  optimizeMyRoute,
  createShareCode,
  previewShareCode,
  loadShareCode,
  type SharedRoutePreview,
  type OptimizedStop,
} from "./actions";
import { buildTmapLink, buildKakaoMapLink } from "@/lib/mapLinks";
import type { CurrentMember } from "@/lib/currentMember";
import { memberLogoutAction } from "../logout-action";
import RoutePreviewMap from "./RoutePreviewMap";

type Waypoint = {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  order_index: number;
  completed: boolean;
  label_no: number;
};

export default function RouteClient({
  member,
  initialWaypoints,
}: {
  member: CurrentMember;
  initialWaypoints: Waypoint[];
}) {
  const [waypoints, setWaypoints] = useState<Waypoint[]>(initialWaypoints);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [showShare, setShowShare] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [loadCodeInput, setLoadCodeInput] = useState("");
  const [loadPreview, setLoadPreview] = useState<SharedRoutePreview | null>(null);

  // --- 최적 경로 안내 화면 상태 ---
  const [routeView, setRouteView] = useState<{
    start: { name: string; lat: number; lng: number };
    stops: OptimizedStop[];
  } | null>(null);
  const [activeVisitIndex, setActiveVisitIndex] = useState(0);
  const [startAddress, setStartAddress] = useState("");
  const [editingStart, setEditingStart] = useState(false);

  const completedCount = waypoints.filter((w) => w.completed).length;

  function refresh() {
    window.location.reload();
  }

  function runAddWaypoint(formData: FormData) {
    setError(null);
    startTransition(async () => {
      try {
        await addWaypoint(formData);
        refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  function runDelete(id: string) {
    setError(null);
    startTransition(async () => {
      try {
        await deleteWaypoint(id);
        refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  function runToggle(id: string, completed: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        await toggleWaypointCompleted(id, completed);
        if (!routeView) refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  function runOptimize() {
    if (!startAddress.trim()) {
      setError("출발지 주소를 입력해 주세요.");
      setEditingStart(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await optimizeMyRoute(startAddress.trim());
        setRouteView(result);
        setActiveVisitIndex(0);
        setEditingStart(false);
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  function runCreateShareCode() {
    setError(null);
    startTransition(async () => {
      try {
        const code = await createShareCode();
        setShareCode(code);
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  function runPreviewCode() {
    setError(null);
    setLoadPreview(null);
    startTransition(async () => {
      try {
        const preview = await previewShareCode(loadCodeInput.trim());
        setLoadPreview(preview);
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  function runLoadCode() {
    setError(null);
    startTransition(async () => {
      try {
        await loadShareCode(loadCodeInput.trim());
        refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  // ------------------- 최적 경로 안내 화면 -------------------
  if (routeView) {
    const remaining = routeView.stops.slice(activeVisitIndex);
    const current = routeView.stops[activeVisitIndex];
    const nextStop = routeView.stops[activeVisitIndex + 1];

    return (
      <main className="max-w-xl mx-auto px-4 py-6 space-y-4 pb-24">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#185FA5]">
            경로 계획 <span className="text-sm font-normal text-gray-400">{new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}</span>
          </h1>
          <button
            onClick={() => setRouteView(null)}
            className="text-sm text-gray-400"
          >
            ✕ 목록으로
          </button>
        </header>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        {current ? (
          <>
            <RoutePreviewMap
              start={{ lat: routeView.start.lat, lng: routeView.start.lng }}
              stops={routeView.stops.map((s) => ({
                lat: s.lat,
                lng: s.lng,
                visit_order: s.visit_order,
              }))}
            />

            <div className="border rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-xs text-[#185FA5] font-medium">
                  현재 목적지 · 경유지 {current.label_no}
                </p>
                <p className="text-base font-bold">{current.address}</p>
              </div>

              <a
                href={buildTmapLink(current.address, current.lat, current.lng)}
                className="block text-center bg-[#185FA5] text-white rounded-xl py-3 text-sm font-medium"
              >
                🗺️ 티맵으로 순차 안내 시작 — 남은 {remaining.length}곳
              </a>
              <p className="text-xs text-center text-gray-400 -mt-2">
                경유지를 최적 순서로 계산해 한 곳씩 티맵으로 안내합니다
                <br />
                (티맵은 앱 특성상 목적지를 한 번에 여러 곳 넣는 기능은 지원하지 않습니다)
              </p>

              <div className="space-y-1 pt-1">
                <p className="text-sm font-medium">이 경유지로만 안내</p>
                {editingStart ? (
                  <div className="flex gap-2">
                    <input
                      value={startAddress}
                      onChange={(e) => setStartAddress(e.target.value)}
                      placeholder="출발지 주소"
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => setEditingStart(false)}
                      className="text-sm text-[#185FA5]"
                    >
                      완료
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingStart(true)}
                    className="text-xs text-amber-600"
                  >
                    출발지: {startAddress || "미설정 (탭 시 설정 옵션 표시)"}
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <a
                  href={buildKakaoMapLink(current.address, current.lat, current.lng)}
                  className="flex-1 text-center bg-[#185FA5] text-white rounded-lg py-2 text-sm"
                >
                  📍 카카오맵으로 안내
                </a>
                <a
                  href={buildTmapLink(current.address, current.lat, current.lng)}
                  className="flex-1 text-center border border-[#185FA5] text-[#185FA5] rounded-lg py-2 text-sm"
                >
                  🗺️ 티맵으로 안내
                </a>
              </div>

              <button
                onClick={() => {
                  runToggle(current.id, true);
                  if (activeVisitIndex + 1 < routeView.stops.length) {
                    setActiveVisitIndex(activeVisitIndex + 1);
                  } else {
                    setRouteView(null);
                  }
                }}
                className="w-full bg-[#14532d] text-white rounded-xl py-3 text-sm font-medium"
              >
                도착 체크 ✓
              </button>
            </div>

            {/* 전체 경유지 리스트 (방문 순서 배지 + 원래 라벨 번호) */}
            <ul className="divide-y border rounded-xl overflow-hidden">
              {routeView.stops.map((s, idx) => (
                <li
                  key={s.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    idx === activeVisitIndex ? "bg-blue-50" : idx < activeVisitIndex ? "bg-gray-50" : ""
                  }`}
                >
                  <span className="w-7 h-7 rounded-full bg-[#185FA5] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">경유지 {s.label_no}</p>
                    <p className="text-xs text-gray-500">{s.address}</p>
                  </div>
                  <a
                    href={buildTmapLink(s.address, s.lat, s.lng)}
                    className="text-[#185FA5] text-sm"
                    title="티맵으로 안내"
                  >
                    ↗
                  </a>
                  <button
                    onClick={() => runToggle(s.id, true)}
                    className="w-5 h-5 rounded-full border-2 border-gray-300"
                    aria-label="도착 체크"
                  />
                </li>
              ))}
            </ul>

            <div className="border rounded-xl p-4 space-y-2 bg-gray-50 text-xs text-gray-600">
              <p className="font-medium text-gray-700">ℹ️ 길찾기 안내 방식</p>
              <p>• 🗺️ 티맵: 최적 순서를 미리 계산해, 한 곳씩 자동으로 안내</p>
              <p>• 📍 카카오맵: 다중 경유지 미지원, 한 곳씩 도착 체크하며 진행</p>
            </div>

            {nextStop && (
              <div className="border rounded-xl p-4 space-y-2">
                <p className="text-sm font-bold">📍 카카오맵 — 한 곳씩 순서대로</p>
                <p className="text-xs text-gray-500">
                  카카오맵은 다중 경유지를 지원하지 않습니다. 경유지 순서대로 한 곳씩 안내됩니다.
                </p>
                <div className="border rounded-lg p-3">
                  <p className="text-xs text-gray-400">다음 안내 경유지</p>
                  <p className="text-sm font-bold">경유지 {nextStop.label_no}</p>
                  <p className="text-xs text-gray-500">{nextStop.address}</p>
                </div>
                <a
                  href={buildKakaoMapLink(nextStop.address, nextStop.lat, nextStop.lng)}
                  className="block text-center border border-[#185FA5] text-[#185FA5] rounded-lg py-2 text-sm"
                >
                  카카오맵으로 다음 경유지 안내 →
                </a>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-sm text-gray-400 py-10">
            모든 경유지를 완료했습니다 🎉
          </p>
        )}
      </main>
    );
  }

  // ------------------- 경유지 목록/편집 화면 -------------------
  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#185FA5]">경로 계획</h1>
          <p className="text-xs text-gray-500">
            {member.team_name} · {member.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">
            {completedCount} / {waypoints.length}
          </span>
          <form action={memberLogoutAction}>
            <button className="text-xs text-gray-400">로그아웃</button>
          </form>
        </div>
      </header>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <ul className="divide-y border rounded-lg overflow-hidden">
        {waypoints.map((w, idx) => (
          <li key={w.id} className="flex items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={w.completed}
              onChange={(e) => runToggle(w.id, e.target.checked)}
            />
            <span className="text-sm text-gray-400 w-5">{w.label_no}</span>
            <span
              className={`flex-1 text-sm ${w.completed ? "line-through text-gray-400" : ""}`}
            >
              {w.address}
            </span>
            <button
              onClick={() => runDelete(w.id)}
              className="text-xs text-red-600"
              disabled={pending}
            >
              삭제
            </button>
          </li>
        ))}
        {waypoints.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">
            등록된 경유지가 없습니다.
          </li>
        )}
      </ul>

      <form action={runAddWaypoint} className="flex gap-2">
        <input
          name="address"
          required
          placeholder="주소 입력 (예: 서울 관악구 관악로14길 106)"
          className="flex-1 border rounded-lg px-3 py-2 text-sm"
        />
        <button
          disabled={pending}
          className="bg-[#185FA5] text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
        >
          추가
        </button>
      </form>

      {editingStart && !routeView && (
        <div className="flex gap-2">
          <input
            value={startAddress}
            onChange={(e) => setStartAddress(e.target.value)}
            placeholder="출발지 주소"
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={() => setEditingStart(false)}
            className="text-sm text-[#185FA5]"
          >
            완료
          </button>
        </div>
      )}
      {!editingStart && (
        <button
          onClick={() => setEditingStart(true)}
          className="text-xs text-gray-400 text-left"
        >
          출발지: {startAddress || "미설정 (탭하여 설정)"}
        </button>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setShowShare(true)}
          className="flex-1 border border-[#185FA5] text-[#185FA5] rounded-lg py-2 text-sm"
        >
          공유코드로 불러오기
        </button>
        <button
          onClick={runOptimize}
          disabled={pending || waypoints.length === 0}
          className="flex-1 bg-[#185FA5] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          {pending ? "계산 중..." : "최적 경로로 출발 →"}
        </button>
      </div>

      {showShare && (
        <Modal onClose={() => { setShowShare(false); setShareCode(null); setLoadPreview(null); setLoadCodeInput(""); }}>
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="font-bold text-sm">내 경로 공유하기</h2>
              {shareCode ? (
                <p className="text-2xl font-mono tracking-widest text-center py-3 bg-gray-50 rounded-lg">
                  {shareCode}
                </p>
              ) : (
                <button
                  onClick={runCreateShareCode}
                  disabled={pending}
                  className="w-full border border-[#185FA5] text-[#185FA5] rounded-lg py-2 text-sm"
                >
                  공유코드 발급
                </button>
              )}
              <p className="text-xs text-gray-400">같은 팀 소속만 이 코드를 조회할 수 있습니다.</p>
            </div>

            <hr />

            <div className="space-y-2">
              <h2 className="font-bold text-sm">공유코드로 불러오기</h2>
              <div className="flex gap-2">
                <input
                  value={loadCodeInput}
                  onChange={(e) => setLoadCodeInput(e.target.value)}
                  placeholder="6자리 코드"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm tracking-widest"
                />
                <button
                  onClick={runPreviewCode}
                  disabled={pending}
                  className="bg-[#185FA5] text-white rounded-lg px-4 py-2 text-sm"
                >
                  조회
                </button>
              </div>

              {loadPreview && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">경유지 {loadPreview.length}곳</p>
                  <ul className="divide-y border rounded-lg overflow-hidden">
                    {loadPreview.map((p, idx) => (
                      <li key={idx} className="px-3 py-2 text-sm">
                        {idx + 1}. {p.address}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-amber-600">
                    ⚠️ 불러오면 현재 내 경유지가 이 경로로 대체됩니다.
                  </p>
                  <button
                    onClick={runLoadCode}
                    disabled={pending}
                    className="w-full bg-[#185FA5] text-white rounded-lg py-2 text-sm"
                  >
                    대체하고 불러오기
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
    </main>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-400 text-lg"
          aria-label="닫기"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
