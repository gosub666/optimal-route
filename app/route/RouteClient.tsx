"use client";

import { useState, useTransition } from "react";
import {
  addWaypoint,
  deleteWaypoint,
  recordVisitResult,
  planMyRoute,
  type VisitResult,
  type PlannedStopResult,
} from "./actions";
import { buildTmapLink, buildKakaoMapLink } from "@/lib/mapLinks";
import RoutePreviewMap from "./RoutePreviewMap";

type Waypoint = {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  order_index: number;
  completed: boolean;
  label_no: number;
  appointment_time: string | null;
  is_mail: boolean;
};

export default function RouteClient({
  initialWaypoints,
  initialStartAddress,
}: {
  initialWaypoints: Waypoint[];
  initialStartAddress: string;
}) {
  const [waypoints] = useState<Waypoint[]>(initialWaypoints);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [startAddress, setStartAddress] = useState(initialStartAddress);
  const [editingStart, setEditingStart] = useState(!initialStartAddress);

  const [routeView, setRouteView] = useState<{
    start: { name: string; lat: number; lng: number };
    stops: PlannedStopResult[];
  } | null>(null);
  const [activeVisitIndex, setActiveVisitIndex] = useState(0);

  const [visitModalStop, setVisitModalStop] = useState<PlannedStopResult | null>(null);
  const [selectedResult, setSelectedResult] = useState<VisitResult | null>(null);

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

  function runPlanRoute() {
    if (!startAddress.trim()) {
      setError("출발지 주소를 입력해 주세요.");
      setEditingStart(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await planMyRoute(startAddress.trim());
        setRouteView(result);
        setActiveVisitIndex(0);
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  function openVisitModal(stop: PlannedStopResult) {
    setVisitModalStop(stop);
    setSelectedResult(null);
  }

  function runSaveVisitResult() {
    if (!visitModalStop || !selectedResult) return;
    setError(null);
    startTransition(async () => {
      try {
        await recordVisitResult(visitModalStop.id, selectedResult);
        const isCurrent = routeView?.stops[activeVisitIndex]?.id === visitModalStop.id;
        setVisitModalStop(null);
        setSelectedResult(null);
        if (isCurrent && routeView) {
          if (activeVisitIndex + 1 < routeView.stops.length) {
            setActiveVisitIndex(activeVisitIndex + 1);
          } else {
            setRouteView(null);
            refresh();
          }
        }
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  const startAddressBlock = editingStart ? (
    <div className="flex gap-2">
      <input
        value={startAddress}
        onChange={(e) => setStartAddress(e.target.value)}
        placeholder="출발지 주소"
        className="flex-1 border rounded-lg px-3 py-2 text-sm"
      />
      <button onClick={() => setEditingStart(false)} className="text-sm text-[#185FA5]">
        완료
      </button>
    </div>
  ) : (
    <button onClick={() => setEditingStart(true)} className="text-xs text-gray-400 text-left">
      출발지: {startAddress || "미설정 (탭하여 설정)"}
    </button>
  );

  // ------------------- 경로 안내 화면 -------------------
  if (routeView) {
    const remaining = routeView.stops.slice(activeVisitIndex);
    const current = routeView.stops[activeVisitIndex];
    const nextStop = routeView.stops[activeVisitIndex + 1];

    return (
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-4 pb-24">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#185FA5]">
            경로 안내{" "}
            <span className="text-sm font-normal text-gray-400">
              {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}
            </span>
          </h1>
          <button onClick={() => setRouteView(null)} className="text-sm text-gray-400">
            ✕ 목록으로
          </button>
        </header>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        {current ? (
          <>
            <RoutePreviewMap
              start={{ lat: routeView.start.lat, lng: routeView.start.lng }}
              stops={routeView.stops.map((s) => ({ lat: s.lat, lng: s.lng, visit_order: s.visit_order }))}
            />

            <div className="border rounded-2xl p-4 space-y-3">
              <div>
                <p className="text-xs text-[#185FA5] font-medium">
                  현재 목적지 · 경유지 {current.label_no}
                  {current.appointment_time && (
                    <span className="ml-2 text-amber-600">⏰ {current.appointment_time}</span>
                  )}
                  {current.is_mail && <span className="ml-2 text-gray-400">✉️ 우편물</span>}
                </p>
                <p className="text-base font-bold">{current.address}</p>
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
                onClick={() => openVisitModal(current)}
                className="w-full bg-[#14532d] text-white rounded-xl py-3 text-sm font-medium"
              >
                도착 체크 ✓
              </button>
              <p className="text-xs text-center text-gray-400">남은 {remaining.length}곳</p>
            </div>

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
                    <p className="text-sm font-medium">
                      경유지 {s.label_no}
                      {s.appointment_time && <span className="ml-1 text-xs text-amber-600">⏰ {s.appointment_time}</span>}
                      {s.is_mail && <span className="ml-1 text-xs text-gray-400">✉️</span>}
                    </p>
                    <p className="text-xs text-gray-500">{s.address}</p>
                  </div>
                  <a href={buildTmapLink(s.address, s.lat, s.lng)} className="text-[#185FA5] text-sm" title="티맵으로 안내">
                    ↗
                  </a>
                  <button
                    onClick={() => openVisitModal(s)}
                    className="w-5 h-5 rounded-full border-2 border-gray-300"
                    aria-label="도착 체크"
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-center text-sm text-gray-400 py-10">모든 경유지를 완료했습니다 🎉</p>
        )}

        {visitModalStop && (
          <VisitResultSheet
            stop={visitModalStop}
            selected={selectedResult}
            onSelect={setSelectedResult}
            onCancel={() => setVisitModalStop(null)}
            onSave={runSaveVisitResult}
            pending={pending}
          />
        )}
      </main>
    );
  }

  // ------------------- 경유지 입력 화면 -------------------
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-[#185FA5]">경로 계획</h1>
        <span className="text-sm text-gray-500">
          {completedCount} / {waypoints.length}
        </span>
      </header>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <ul className="divide-y border rounded-lg overflow-hidden">
        {waypoints.map((w) => (
          <li key={w.id} className="flex items-center gap-3 px-4 py-3">
            <span className="text-sm text-gray-400 w-5">{w.label_no}</span>
            <div className="flex-1">
              <p className={`text-sm ${w.completed ? "line-through text-gray-400" : ""}`}>{w.address}</p>
              <p className="text-xs text-gray-400">
                {w.appointment_time && <span className="text-amber-600">⏰ {w.appointment_time} </span>}
                {w.is_mail && <span>✉️ 우편물</span>}
              </p>
            </div>
            <button onClick={() => runDelete(w.id)} className="text-xs text-red-600" disabled={pending}>
              삭제
            </button>
          </li>
        ))}
        {waypoints.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-gray-400">등록된 경유지가 없습니다.</li>
        )}
      </ul>

      <form action={runAddWaypoint} className="space-y-2 border rounded-lg p-3">
        <input
          name="address"
          required
          placeholder="주소 입력 (예: 서울 관악구 관악로14길 106)"
          className="w-full border rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <label className="text-xs text-gray-500">약속시간</label>
            <input name="appointmentTime" type="time" className="border rounded-lg px-2 py-1 text-sm" />
          </div>
          <label className="flex items-center gap-1 text-xs text-gray-500">
            <input name="isMail" type="checkbox" />
            우편물
          </label>
          <button
            disabled={pending}
            className="ml-auto bg-[#185FA5] text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50"
          >
            추가
          </button>
        </div>
      </form>

      {startAddressBlock}

      <button
        onClick={runPlanRoute}
        disabled={pending || waypoints.length === 0}
        className="w-full bg-[#185FA5] text-white rounded-lg py-3 text-sm font-medium disabled:opacity-50"
      >
        {pending ? "계산 중..." : "최단 경로 계산 →"}
      </button>

      <div className="border rounded-xl p-4 space-y-1 bg-gray-50 text-xs text-gray-600">
        <p className="font-medium text-gray-700">ℹ️ 경로 계산 우선순위</p>
        <p>1. 약속시간이 있는 경유지 — 시간 순서대로 방문</p>
        <p>2. 약속시간이 없는 경유지 — 가까운 약속 위치 근처에 배치</p>
        <p>3. 우편물 — 항상 마지막에 방문 (가까운 순서로)</p>
      </div>
    </main>
  );
}

function VisitResultSheet({
  stop,
  selected,
  onSelect,
  onCancel,
  onSave,
  pending,
}: {
  stop: PlannedStopResult;
  selected: VisitResult | null;
  onSelect: (r: VisitResult) => void;
  onCancel: () => void;
  onSave: () => void;
  pending: boolean;
}) {
  const options: { value: VisitResult; icon: string; label: string; sub: string }[] = [
    { value: "completed", icon: "✅", label: "완료", sub: "방문 면담" },
    { value: "absent", icon: "🚪", label: "부재", sub: "미접촉" },
    { value: "refused", icon: "✋", label: "거부", sub: "면담 거부" },
  ];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-6xl p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold">방문 결과</p>
            <p className="text-xs text-gray-500">
              경유지 {stop.label_no} · {stop.address}
            </p>
          </div>
          <button onClick={onCancel} className="text-gray-400 text-lg">
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSelect(opt.value)}
              className={`flex flex-col items-center gap-1 border rounded-xl py-4 text-sm ${
                selected === opt.value
                  ? "border-[#185FA5] bg-blue-50 text-[#185FA5]"
                  : "border-gray-200 text-gray-600"
              }`}
            >
              <span className="text-xl">{opt.icon}</span>
              <span className="font-medium">{opt.label}</span>
              <span className="text-xs text-gray-400">{opt.sub}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 border rounded-lg py-2 text-sm">
            취소
          </button>
          <button
            onClick={onSave}
            disabled={!selected || pending}
            className="flex-[2] bg-[#185FA5] text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            저장 → 다음
          </button>
        </div>
      </div>
    </div>
  );
}
