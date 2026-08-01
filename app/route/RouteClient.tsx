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
} from "./actions";
import { buildTmapLink, buildKakaoMapLink } from "@/lib/mapLinks";
import type { CurrentMember } from "@/lib/currentMember";

type Waypoint = {
  id: string;
  address: string;
  lat: number | null;
  lng: number | null;
  order_index: number;
  completed: boolean;
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

  const [showOptimize, setShowOptimize] = useState(false);
  const [startAddress, setStartAddress] = useState("");
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [optimized, setOptimized] = useState<Waypoint[] | null>(null);

  const [showShare, setShowShare] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [loadCodeInput, setLoadCodeInput] = useState("");
  const [loadPreview, setLoadPreview] = useState<SharedRoutePreview | null>(null);

  const completedCount = waypoints.filter((w) => w.completed).length;

  function refresh() {
    // 서버 액션의 revalidatePath로 서버 컴포넌트는 최신화되지만,
    // 이 클라이언트 상태는 location.reload로 간단히 동기화합니다.
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
        refresh();
      } catch (e: any) {
        setError(e.message);
      }
    });
  }

  function runOptimize() {
    if (!startAddress.trim()) {
      setError("출발지 주소를 입력해 주세요.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const result = await optimizeMyRoute(startAddress.trim());
        setOptimized(
          result.map((r) => ({
            id: r.id,
            address: r.name,
            lat: r.lat,
            lng: r.lng,
            order_index: r.order,
            completed: false,
          }))
        );
        setActiveStopIndex(0);
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

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#185FA5]">경로 계획</h1>
          <p className="text-xs text-gray-500">
            {member.team_name} · {member.name}
          </p>
        </div>
        <span className="text-sm text-gray-500">
          {completedCount} / {waypoints.length}
        </span>
      </header>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* 경유지 목록 */}
      <ul className="divide-y border rounded-lg overflow-hidden">
        {waypoints.map((w, idx) => (
          <li key={w.id} className="flex items-center gap-3 px-4 py-3">
            <input
              type="checkbox"
              checked={w.completed}
              onChange={(e) => runToggle(w.id, e.target.checked)}
            />
            <span className="text-sm text-gray-400 w-5">{idx + 1}</span>
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

      {/* 경유지 추가 */}
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

      {/* 하단 액션 버튼 */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowShare(true)}
          className="flex-1 border border-[#185FA5] text-[#185FA5] rounded-lg py-2 text-sm"
        >
          공유코드로 불러오기
        </button>
        <button
          onClick={() => setShowOptimize(true)}
          className="flex-1 bg-[#185FA5] text-white rounded-lg py-2 text-sm font-medium"
        >
          최적 경로로 출발 →
        </button>
      </div>

      {/* 최적화 모달 */}
      {showOptimize && (
        <Modal onClose={() => { setShowOptimize(false); setOptimized(null); }}>
          {!optimized ? (
            <div className="space-y-3">
              <h2 className="font-bold">출발지 입력</h2>
              <input
                value={startAddress}
                onChange={(e) => setStartAddress(e.target.value)}
                placeholder="출발지 주소"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={runOptimize}
                disabled={pending}
                className="w-full bg-[#185FA5] text-white rounded-lg py-2 text-sm disabled:opacity-50"
              >
                {pending ? "계산 중..." : "최적 순서 계산"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <h2 className="font-bold">
                {activeStopIndex + 1} / {optimized.length}번째 목적지
              </h2>
              {optimized[activeStopIndex] && (
                <>
                  <p className="text-sm">{optimized[activeStopIndex].address}</p>
                  <div className="flex gap-2">
                    <a
                      href={buildTmapLink(
                        optimized[activeStopIndex].address,
                        optimized[activeStopIndex].lat!,
                        optimized[activeStopIndex].lng!
                      )}
                      className="flex-1 text-center bg-[#185FA5] text-white rounded-lg py-2 text-sm"
                    >
                      🗺️ 티맵으로 안내
                    </a>
                    <a
                      href={buildKakaoMapLink(
                        optimized[activeStopIndex].address,
                        optimized[activeStopIndex].lat!,
                        optimized[activeStopIndex].lng!
                      )}
                      className="flex-1 text-center border border-[#185FA5] text-[#185FA5] rounded-lg py-2 text-sm"
                    >
                      📍 카카오맵으로 안내
                    </a>
                  </div>
                  <button
                    onClick={() => {
                      runToggle(optimized[activeStopIndex].id, true);
                      if (activeStopIndex + 1 < optimized.length) {
                        setActiveStopIndex(activeStopIndex + 1);
                      } else {
                        setShowOptimize(false);
                        setOptimized(null);
                      }
                    }}
                    className="w-full border rounded-lg py-2 text-sm"
                  >
                    ✅ 도착 완료, 다음 목적지
                  </button>
                </>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* 공유코드 모달 (공유하기 + 불러오기 겸용) */}
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
