"use client";

declare global {
  interface Window {
    daum: any;
  }
}

let loadingPromise: Promise<void> | null = null;

export function loadDaumPostcodeSdk(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경이 아닙니다."));
  }
  if (window.daum?.Postcode) {
    return Promise.resolve();
  }
  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("우편번호 검색 스크립트 로드 실패"));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export type DaumPostcodeResult = {
  address: string; // 기본 주소 (지번 or 도로명, 사용자가 선택한 기준)
  roadAddress: string;
  jibunAddress: string;
  zonecode: string;
  buildingName?: string;
};

export async function openDaumPostcode(): Promise<DaumPostcodeResult> {
  await loadDaumPostcodeSdk();

  return new Promise((resolve) => {
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        // 도로명 주소를 기본으로 사용, 건물명이 있으면 괄호로 덧붙임
        let address = data.roadAddress || data.jibunAddress;
        if (data.buildingName && data.apartment === "Y") {
          address += ` (${data.buildingName})`;
        }
        resolve({
          address,
          roadAddress: data.roadAddress,
          jibunAddress: data.jibunAddress,
          zonecode: data.zonecode,
          buildingName: data.buildingName,
        });
      },
    }).open();
  });
}
