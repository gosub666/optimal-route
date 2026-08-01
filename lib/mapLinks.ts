// 티맵/카카오맵은 앱 URL scheme으로 "한 번에 여러 목적지"를 넘길 공식 방법이 없어,
// 최적화된 순서대로 한 곳씩 딥링크를 열고, 도착 체크 후 다음 목적지로 넘어가는 방식으로 구성합니다.

export function buildTmapLink(name: string, lat: number, lng: number): string {
  const params = new URLSearchParams({
    goalname: name,
    goalx: String(lng),
    goaly: String(lat),
  });
  return `tmap://route?${params.toString()}`;
}

export function buildKakaoMapLink(name: string, lat: number, lng: number): string {
  const params = new URLSearchParams({
    ep: `${lat},${lng}`,
    by: "CAR",
  });
  // 카카오맵은 목적지명을 명시적으로 받지 않고 좌표 기준으로 길찾기를 엽니다.
  return `kakaomap://route?${params.toString()}`;
}
