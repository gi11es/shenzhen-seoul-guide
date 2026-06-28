/* ===== Config & categories =====
 * Locations live in places.json. Run:  python3 build.py
 */
const CONFIG = {
  rates: { CNY: 0.122, HKD: 0.11, KRW: 0.00067 },   // 1 unit -> EUR (editable in-app)
  cities: {
    SZ:    { label: 'Shenzhen',  tz: 'Asia/Shanghai',  center: [22.60, 114.05], zoom: 10 },
    HK:    { label: 'Hong Kong', tz: 'Asia/Hong_Kong', center: [22.30, 114.17], zoom: 12 },
    SEOUL: { label: 'Seoul',     tz: 'Asia/Seoul',     center: [37.57, 126.99], zoom: 12 }
  }
};

/* Trip windows per city (inclusive date ranges). Drives the Events view + "today" default. */
const TRIP = {
  SZ:    [['2026-07-06', '2026-07-10'], ['2026-07-13', '2026-07-17']],
  SEOUL: [['2026-07-10', '2026-07-13']]
};

const CATEGORIES = {
  stay:     { label: 'Stay',     color: '#5b6cff' },
  food:     { label: 'Food',     color: '#e0533d' },
  cafe:     { label: 'Café',     color: '#b5651d' },
  sights:   { label: 'Sights',   color: '#2f80ed' },
  museum:   { label: 'Museum',   color: '#2c8c7c' },
  culture:  { label: 'Culture',  color: '#8e44ad' },
  shopping: { label: 'Shopping', color: '#d23f87' },
  kids:     { label: 'Kids',     color: '#f2a900' },
  nature:   { label: 'Nature',   color: '#3aa655' },
  nightlife:{ label: 'Nightlife',color: '#a55eea' },
  services: { label: 'Services', color: '#6b7785' }
};
