"use client";

let loadingPromise: Promise<void> | null = null;

declare global {
  interface Window {
    kakao: any;
  }
}

export function loadKakaoMapsSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경이 아닙니다."));
  }
  if (window.kakao?.maps) {
    return Promise.resolve();
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!jsKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_KAKAO_JS_KEY 환경변수가 설정되어 있지 않습니다.")
    );
  }

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false`;
    script.async = true;
    script.onload = () => {
      window.kakao.maps.load(() => resolve());
    };
    script.onerror = () => reject(new Error("카카오맵 SDK 로드 실패"));
    document.head.appendChild(script);
  });

  return loadingPromise;
}
