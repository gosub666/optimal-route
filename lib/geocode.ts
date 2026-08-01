// 카카오 로컬 API — 주소 검색 (지오코딩)
// https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord
// 서버에서만 호출 (REST API 키를 클라이언트에 노출하지 않기 위함)

export type GeocodeResult = {
  address: string;
  lat: number;
  lng: number;
};

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  const key = process.env.KAKAO_REST_API_KEY;
  if (!key) {
    throw new Error("KAKAO_REST_API_KEY 환경변수가 설정되어 있지 않습니다.");
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json");
  url.searchParams.set("query", address);

  const res = await fetch(url.toString(), {
    headers: { Authorization: `KakaoAK ${key}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`카카오 주소 검색 실패 (status ${res.status})`);
  }

  const data = await res.json();
  const first = data?.documents?.[0];

  if (!first) {
    throw new Error(`주소를 찾을 수 없습니다: ${address}`);
  }

  return {
    address,
    lat: parseFloat(first.y),
    lng: parseFloat(first.x),
  };
}
