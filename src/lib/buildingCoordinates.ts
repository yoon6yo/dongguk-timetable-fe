/**
 * Dongguk University Seoul campus building coordinates, scraped from the
 * official campus map's embedded Kakao Maps marker data
 * (https://www.dongguk.edu/campus/map/seoul) on 2026-07-19. Straight-line
 * (haversine) distance between these points is a rough proxy for walking
 * distance — campus is compact and hilly, so this deliberately does not
 * attempt real routing. Good enough to rank combinations by "less walking",
 * not precise enough for turn-by-turn anything.
 */
export const BUILDING_COORDINATES: Record<string, { lat: number; lng: number }> = {
  명진관: { lat: 37.55772606706203, lng: 126.99996604695845 },
  "본관(남산홀)": { lat: 37.55854822598063, lng: 126.9994991871343 },
  만해관: { lat: 37.557631459049844, lng: 127.0008827779647 },
  법학관: { lat: 37.5583027016612, lng: 127.00092805695456 },
  정각원: { lat: 37.5574760343315, lng: 127.0011883524842 },
  혜화관: { lat: 37.557755334531706, lng: 127.00187873570162 },
  혜화별관: { lat: 37.55748054, lng: 127.0015364 },
  경영관: { lat: 37.55703001008748, lng: 127.00293691077678 },
  사회과학관: { lat: 37.55770125981277, lng: 127.00265399520265 },
  문화관: { lat: 37.55789496273709, lng: 127.00312368687446 },
  학술관: { lat: 37.55812920874817, lng: 127.00359055348954 },
  박물관: { lat: 37.558295924698534, lng: 127.0023371188262 },
  다향관: { lat: 37.55870815351716, lng: 127.000350852701 },
  금강관: { lat: 37.559577616181436, lng: 127.0000962026649 },
  체육관: { lat: 37.55984566248697, lng: 127.00028295002805 },
  학림관: { lat: 37.56030967615687, lng: 126.99985286507297 },
  계산관A: { lat: 37.56048311576853, lng: 126.99925017603759 },
  계산관B: { lat: 37.56008667453774, lng: 126.99891629790194 },
  학생회관: { lat: 37.56012045564737, lng: 126.99837020185302 },
  정보문화관Q: { lat: 37.55993349830784, lng: 126.9983362518821 },
  정보문화관P: { lat: 37.55962040586439, lng: 126.99865033242945 },
  원흥관1: { lat: 37.55906404060124, lng: 126.99868712558434 },
  원흥관2: { lat: 37.5585684946605, lng: 126.99893329660165 },
  원흥별관: { lat: 37.55866760164561, lng: 126.99866732634997 },
  "남산학사(기숙사)": { lat: 37.55844459622606, lng: 126.99804768136305 },
  신공학관: { lat: 37.5581224966969, lng: 126.99852869373731 },
  과학관: { lat: 37.55733863817263, lng: 126.99989814140267 },
  중앙도서관: { lat: 37.557976090318114, lng: 126.99909175310334 },
  상록원: { lat: 37.5570097733892, lng: 126.99956993225685 },
  "충무로 영상센터": { lat: 37.56026219361624, lng: 126.99347513603394 },
  반야관: { lat: 37.56011145450986, lng: 127.00075547925854 },
  명심관: { lat: 37.56023308860073, lng: 127.00082904787489 },
  대운동장: { lat: 37.556613333043764, lng: 127.0007299795389 },

  // Compound label observed in real ROOM_KOR_DSC captures (e.g. "법학/만해관
  // 303-254 강의실_스마트") — midpoint of 법학관/만해관 since the two buildings
  // are directly connected and course data doesn't distinguish which wing.
  "법학/만해관": { lat: 37.55796708035552, lng: 127.00090541745963 },
};

const BUILDING_NAMES_BY_LENGTH_DESC = Object.keys(BUILDING_COORDINATES).sort((a, b) => b.length - a.length);

/**
 * ROOM_KOR_DSC format is "{강의실코드}({건물명} {동-호} {설명})" (e.g.
 * "342(혜화관 207-342 342 강의실)") — the building name is always the start of
 * the parenthesized text, never parsed separately server-side (see BE's
 * docs/ndrims-response-notes.md). Longest-name-first match handles compound
 * labels like "법학/만해관" before the plainer "법학관"/"만해관" would.
 * Returns null for classroom text we don't recognize (unparsed row, or a
 * building not yet in the map) — callers must treat that as "unknown,
 * ignore" rather than crash.
 */
export function extractBuildingName(classroomRaw: string | null | undefined): string | null {
  if (!classroomRaw) return null;
  // Slice from just after the first "(" rather than capturing up to the next
  // ")" — some real building names (e.g. "본관(남산홀)") contain their own
  // parens, which would truncate a naive "(...)" regex capture short.
  const openParenIndex = classroomRaw.indexOf("(");
  const inner = openParenIndex === -1 ? classroomRaw : classroomRaw.slice(openParenIndex + 1);
  for (const name of BUILDING_NAMES_BY_LENGTH_DESC) {
    if (inner.startsWith(name)) return name;
  }
  return null;
}

const EARTH_RADIUS_METERS = 6371000;

/** Straight-line distance between two lat/lng points, in meters. */
export function haversineDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance in meters between two already-resolved building names, or null
 * if either is unresolved. Split out from classroomDistanceMeters so a
 * caller resolving many raw classroom strings up front (e.g. scoring.ts,
 * across a whole day's blocks) can call extractBuildingName once per block
 * instead of twice per pair. haversineDistanceMeters already returns exact
 * 0 for identical coordinates, so nameA === nameB needs no special case. */
export function distanceBetweenBuildingNames(nameA: string | null, nameB: string | null): number | null {
  if (!nameA || !nameB) return null;
  return haversineDistanceMeters(BUILDING_COORDINATES[nameA], BUILDING_COORDINATES[nameB]);
}

/** Distance in meters between two classroom raw strings, or null if either
 * building can't be resolved (caller should treat as "no penalty"). */
export function classroomDistanceMeters(a: string | null | undefined, b: string | null | undefined): number | null {
  return distanceBetweenBuildingNames(extractBuildingName(a), extractBuildingName(b));
}
