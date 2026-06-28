/* ===== Shenzhen · Hong Kong · Seoul travel guide ===== */
(function () {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DAYS = ['mon','tue','wed','thu','fri','sat','sun'];
  const DLBL = { mon:'Mon', tue:'Tue', wed:'Wed', thu:'Thu', fri:'Fri', sat:'Sat', sun:'Sun' };
  const SYM  = { CNY:'¥', HKD:'HK$', KRW:'₩' };
  const EVCAT = { festival:{label:'Festival',color:'#e0533d'}, concert:{label:'Concert',color:'#8e44ad'}, fireworks:{label:'Lights',color:'#2f80ed'}, exhibition:{label:'Exhibition',color:'#2c8c7c'}, market:{label:'Market',color:'#d23f87'}, show:{label:'Show',color:'#f2a900'} };

  const LS = { favs:'tg_favs', rates:'tg_rates', city:'tg_city' };
  const favs  = new Set(JSON.parse(localStorage.getItem(LS.favs)  || '[]'));
  const rates = Object.assign({}, CONFIG.rates, JSON.parse(localStorage.getItem(LS.rates) || '{}'));
  const cityKeys = Object.keys(CONFIG.cities);
  const state = {
    city: cityKeys.includes(localStorage.getItem(LS.city)) ? localStorage.getItem(LS.city) : cityKeys[0],
    q:'', cats:new Set(), openNow:false, favOnly:false, day:null, evDate:null, activeId:null
  };

  const saveFavs  = () => localStorage.setItem(LS.favs,  JSON.stringify([...favs]));
  const saveRates = () => localStorage.setItem(LS.rates, JSON.stringify(rates));
  const saveCity  = () => localStorage.setItem(LS.city,  state.city);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const byId = id => LOCATIONS.find(l => l.id === id);

  /* ---------- time / hours ---------- */
  function nowInCity() {
    const tz = CONFIG.cities[state.city].tz;
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false }).formatToParts(new Date());
    let wd, h = 0, m = 0;
    for (const x of p) { if (x.type==='weekday') wd = x.value; if (x.type==='hour') h = +x.value; if (x.type==='minute') m = +x.value; }
    if (h === 24) h = 0;
    return { day: {Mon:0,Tue:1,Wed:2,Thu:3,Fri:4,Sat:5,Sun:6}[wd], min: h*60 + m };
  }
  const toMin = s => { const [h,m] = s.split(':').map(Number); return h*60 + m; };

  // returns true / false / null(unknown)
  function isOpenAt(loc, dayIdx, min) {
    if (!loc.hours) return null;
    const today = loc.hours[DAYS[dayIdx]];
    if (today) for (const [o,c] of today) {
      const om = toMin(o), cm = toMin(c);
      if (cm > om ? (min >= om && min < cm) : (min >= om)) return true; // cm>1440 means past midnight
    }
    const prev = loc.hours[DAYS[(dayIdx+6)%7]];
    if (prev) for (const [o,c] of prev) {
      const cm = toMin(c);
      if (cm > 1440 && min < cm - 1440) return true; // spilled into today's early hours
    }
    return false;
  }
  const isOpenNow = loc => { const n = nowInCity(); return isOpenAt(loc, n.day, n.min); };
  const fmtHM = s => { let m = toMin(s); if (m >= 1440) m -= 1440; const h = Math.floor(m/60), mm = m%60; return String(h).padStart(2,'0')+':'+String(mm).padStart(2,'0'); };

  /* ---------- price ---------- */
  function fmtEur(amount, cur) { const e = amount * (rates[cur] || 0); return '€' + (e >= 10 ? Math.round(e) : e.toFixed(1)); }
  function fmtLocal(amount, cur) { return SYM[cur] + (cur === 'KRW' ? amount.toLocaleString('en-US') : amount); }
  function priceHtml(loc) {
    if (loc.price === 'free') return '<span class="free">Free</span>';
    if (!loc.price) return '';
    const { amount, cur, note } = loc.price;
    if (amount === 0) return `<span class="free">Free${note ? ` · ${esc(note)}` : ''}</span>`;
    return `<span class="price">${fmtLocal(amount,cur)} <span class="eur">· ${fmtEur(amount,cur)}</span>${note ? ` <span class="eur">${esc(note)}</span>` : ''}</span>`;
  }
  function statusHtml(loc) {
    const s = isOpenNow(loc);
    if (s === null) return '<span class="status unknown">Hours ?</span>';
    return s ? '<span class="status open">Open now</span>' : '<span class="status closed">Closed</span>';
  }

  /* ---------- map ---------- */
  let map, layer, markers = {};
  function initMap() {
    map = L.map('map', { zoomControl: true, attributionControl: true, tap: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on('popupopen', e => {
      const el = e.popup.getElement();
      const b = el.querySelector('[data-fav]');
      if (b) b.addEventListener('click', () => toggleFav(b.dataset.fav));
      const w = el.querySelector('[data-wechat]');
      if (w) w.addEventListener('click', () => copyWechat(w.dataset.wechat));
      const wp = el.querySelector('[data-wechatphone]');
      if (wp) wp.addEventListener('click', () => copyWechatPhone(wp.dataset.wechatphone));
    });
    setTimeout(() => map.invalidateSize(), 60);
  }
  const catColor = c => (CATEGORIES[c] || {}).color || '#888';
  function makeIcon(loc, active) {
    return L.divIcon({ className:'', iconSize:[24,24], iconAnchor:[12,24], popupAnchor:[0,-22],
      html:`<div class="pin${favs.has(loc.id)?' fav':''}${active?' active':''}" style="background:${catColor(loc.category)}"><span class="dot"></span></div>` });
  }
  function popupHtml(loc) {
    const cat = CATEGORIES[loc.category] || {};
    const hero = loc.photos && loc.photos[0] ? `<img class="pophero" loading="lazy" src="${esc(loc.photos[0])}" onerror="this.remove()">` : '';
    return `<div class="pop">${hero}<h3>${esc(loc.name)}</h3>
      <div class="meta">${esc(cat.label||'')} · ${statusHtml(loc)} ${priceHtml(loc)}</div>
      <div class="acts">
        <button class="popfav${favs.has(loc.id)?' on':''}" data-fav="${loc.id}">${favs.has(loc.id)?'♥ Saved':'♡ Save'}</button>
        ${loc.maplink ? `<a href="${esc(loc.maplink)}" target="_blank" rel="noopener">🗺️ ${esc(loc.maplabel||'Map')} ↗</a>` : ''}
        ${contactBtns(loc)}
      </div></div>`;
  }
  function renderMarkers() {
    layer.clearLayers(); markers = {};
    const locs = visible(); const pts = [];
    locs.forEach(loc => {
      const m = L.marker([loc.lat, loc.lng], { icon: makeIcon(loc, loc.id === state.activeId) });
      m.on('click', () => select(loc.id, { fromMap:true }));
      m.bindPopup(popupHtml(loc));
      m.addTo(layer); markers[loc.id] = m; pts.push([loc.lat, loc.lng]);
    });
    if (pts.length) map.fitBounds(pts, { padding:[44,44], maxZoom:15 });
    else { const c = CONFIG.cities[state.city]; map.setView(c.center, c.zoom); }
  }

  /* ---------- filtering ---------- */
  function visible() {
    return LOCATIONS.filter(l => l.city === state.city).filter(l => {
      if (l.category === 'stay') return true;                          // home is always shown, never filtered
      if (state.cats.size && !state.cats.has(l.category)) return false;
      if (state.favOnly && !favs.has(l.id)) return false;
      if (state.q && !(l.name + ' ' + (l.desc||'') + ' ' + (l.address||'')).toLowerCase().includes(state.q)) return false;
      if (state.openNow && isOpenNow(l) !== true) return false;
      if (state.day !== null && !(l.hours && Array.isArray(l.hours[DAYS[state.day]]))) return false;
      return true;
    }).sort((a, b) => {
      const sa = a.category === 'stay', sb = b.category === 'stay';   // home pinned to top
      if (sa !== sb) return sa ? -1 : 1;
      const fa = favs.has(a.id), fb = favs.has(b.id);
      if (fa !== fb) return fa ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  /* ---------- rendering: list ---------- */
  function weekHtml(loc) {
    const today = nowInCity().day;
    return '<div class="week">' + DAYS.map((dk,i) => {
      let cls = 'd';
      if (!loc.hours || loc.hours[dk] === undefined) cls += ' unknown';
      else if (loc.hours[dk] === null) cls += ' closed';
      else cls += ' open';
      if (i === today) cls += ' today';
      return `<div class="${cls}"><span class="lbl">${DLBL[dk][0]}</span><span class="o"></span></div>`;
    }).join('') + '</div>';
  }
  function todayHours(loc) {
    if (!loc.hours) return 'Hours unknown';
    const v = loc.hours[DAYS[nowInCity().day]];
    if (v === undefined) return 'Hours unknown';
    if (v === null) return 'Closed today';
    if (v.length === 1 && v[0][0] === '00:00' && v[0][1] === '24:00') return 'Open 24 hours';
    return 'Today ' + v.map(([o,c]) => `${fmtHM(o)}–${fmtHM(c)}`).join(', ');
  }
  function photosHtml(loc) {
    if (!loc.photos || !loc.photos.length) return '';
    return `<div class="photos">${loc.photos.map((u,i) => `<img loading="lazy" src="${esc(u)}" data-ph="${loc.id}|${i}" onerror="this.remove()">`).join('')}</div>`;
  }
  function isMobileCN(p) { const d = String(p).replace(/\D/g, '').replace(/^86/, ''); return /^1\d{10}$/.test(d); }
  function contactBtns(loc) {
    let h = '';
    if (loc.phone)  h += `<a class="contact" href="tel:${esc(String(loc.phone).replace(/\s+/g,''))}">📞 Call</a>`;
    if (loc.wechat) h += `<button class="contact" data-wechat="${esc(loc.wechat)}">💬 WeChat</button>`;
    else if (loc.phone && isMobileCN(loc.phone)) h += `<button class="contact" data-wechatphone="${esc(String(loc.phone).replace(/\s+/g,''))}">💬 WeChat</button>`;
    return h;
  }
  function contactHtml(loc) {
    const map = loc.maplink ? `<a class="contact" href="${esc(loc.maplink)}" target="_blank" rel="noopener">🗺️ ${esc(loc.maplabel||'Map')}</a>` : '';
    const vid = loc.video ? `<a class="contact" href="${esc(loc.video)}" target="_blank" rel="noopener">▶ Video</a>` : '';
    const b = map + vid + contactBtns(loc);
    return b ? `<div class="contacts">${b}</div>` : '';
  }
  let toastEl, toastT;
  function showToast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }
  function copyWechat(id) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(id).catch(() => {});
    showToast('WeChat ID copied: ' + id + '  ·  open WeChat ▸ Search to add');
  }
  function copyWechatPhone(num) {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(num).catch(() => {});
    showToast('Number copied: ' + num + '  ·  in WeChat tap + ▸ Add Contacts ▸ phone number');
  }
  function cardHtml(loc) {
    const cat = CATEGORIES[loc.category] || {};
    return `<div class="card${loc.id===state.activeId?' active':''}" data-id="${loc.id}" style="--catcolor:${cat.color}">
      <div class="top">
        <div class="cat" style="background:${cat.color}"></div>
        <div class="body">
          <h3>${esc(loc.name)}</h3>
          <div class="meta"><span class="catname">${esc(cat.label||'')}</span> ${statusHtml(loc)} ${priceHtml(loc)}</div>
          ${loc.desc ? `<p class="desc">${esc(loc.desc)}</p>` : ''}
        </div>
        <button class="heart${favs.has(loc.id)?' on':''}" data-heart="${loc.id}" aria-label="favorite">${favs.has(loc.id)?'♥':'♡'}</button>
      </div>
      ${photosHtml(loc)}
      ${weekHtml(loc)}
      <div class="hourline"><b>${todayHours(loc)}</b>${loc.address ? ` · ${esc(loc.address)}` : ''}${loc.notes ? `<br>${esc(loc.notes)}` : ''}</div>
      ${loc.commute ? `<div class="commute">🧭 ${esc(loc.commute)}</div>` : ''}
      ${contactHtml(loc)}
    </div>`;
  }
  function renderList() {
    const locs = visible();
    $('#count').textContent = `${locs.length} place${locs.length!==1?'s':''}${state.openNow?' open now':''}${state.favOnly?' · favorites':''}`;
    $('#listItems').innerHTML = locs.length ? locs.map(cardHtml).join('') : '<div class="empty">No places match these filters.</div>';
  }
  const renderAll = () => { renderMarkers(); renderList(); };

  /* ---------- selection ---------- */
  function select(id, opts = {}) {
    state.activeId = id;
    Object.entries(markers).forEach(([mid, m]) => m.setIcon(makeIcon(byId(mid), mid === id)));
    const loc = byId(id);
    if (loc && !opts.fromMap) map.flyTo([loc.lat, loc.lng], Math.max(map.getZoom(), 15), { duration:.4 });
    if (markers[id]) markers[id].openPopup();
    $$('.card').forEach(c => c.classList.toggle('active', c.dataset.id === id));
    if (opts.fromMap) { const card = $(`.card[data-id="${id}"]`); if (card) card.scrollIntoView({ block:'start', behavior:'auto' }); }
  }
  function toggleFav(id) { favs.has(id) ? favs.delete(id) : favs.add(id); saveFavs(); renderAll(); }

  /* ---------- lightbox ---------- */
  let lb, lbPhotos = [], lbIdx = 0;
  function buildLightbox() {
    lb = document.createElement('div'); lb.className = 'lightbox';
    lb.innerHTML = `<button class="lbclose" aria-label="close">×</button><img alt=""><div class="lbcount"></div>
      <div class="lbnav lbprev"></div><div class="lbnav lbnext"></div>`;
    document.body.appendChild(lb);
    lb.querySelector('.lbclose').onclick = closeLb;
    lb.querySelector('.lbprev').onclick = () => stepLb(-1);
    lb.querySelector('.lbnext').onclick = () => stepLb(1);
    lb.addEventListener('click', e => { if (e.target === lb || e.target.tagName === 'IMG') closeLb(); });
  }
  function openLb(photos, idx) { lbPhotos = photos; lbIdx = idx; lb.classList.add('show'); showLb(); }
  function showLb() { lb.querySelector('img').src = lbPhotos[lbIdx]; lb.querySelector('.lbcount').textContent = `${lbIdx+1} / ${lbPhotos.length}`; }
  function stepLb(d) { lbIdx = (lbIdx + d + lbPhotos.length) % lbPhotos.length; showLb(); }
  function closeLb() { lb.classList.remove('show'); }

  /* ---------- events ---------- */
  let evTempMarker = null;
  const fmtDate = iso => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', timeZone:'UTC' });
  const ALLEV = () => (typeof EVENTS !== 'undefined' ? EVENTS : []);
  function todayISO() { return new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Shanghai', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date()); }
  function tripCalendar() {                              // ordered [{date, city}] across the whole trip
    const set = {};
    Object.keys(TRIP).forEach(city => (TRIP[city] || []).forEach(([s, e]) => {
      let d = new Date(s + 'T00:00:00Z'); const end = new Date(e + 'T00:00:00Z');
      while (d <= end) {
        const iso = d.toISOString().slice(0, 10), isStart = (iso === s);
        if (!set[iso] || (isStart && !set[iso].isStart)) set[iso] = { date: iso, city, isStart };  // arrival city wins on travel days
        d = new Date(d.getTime() + 86400000);
      }
    }));
    return Object.values(set).sort((a, b) => a.date.localeCompare(b.date));
  }
  const cityForDate = iso => (tripCalendar().find(x => x.date === iso) || {}).city || null;
  const evOn = (e, iso) => e.start <= iso && e.end >= iso && (!e.onDates || e.onDates.includes(iso));
  const eventsOn = (iso, city) => ALLEV().filter(e => e.city === city && evOn(e, iso));
  const allTripEvents = () => { const cal = tripCalendar(); return ALLEV().filter(e => cal.some(x => x.city === e.city && evOn(e, x.date))); };
  const cityShort = c => (c === 'SEOUL' ? 'SEL' : c);
  function openEvents() {
    const today = todayISO();
    state.evDate = cityForDate(today) ? today : null;     // default to today if we are on a trip day
    buildEvents();
    $('#evOverlay').classList.add('show');
  }
  function closeEvents() { $('#evOverlay').classList.remove('show'); }
  function buildEvents() {
    const cal = tripCalendar(), today = todayISO();
    const selCity = state.evDate ? cityForDate(state.evDate) : null;
    $('#evSub').textContent = state.evDate ? `${CONFIG.cities[selCity].label}, ${fmtDate(state.evDate)}` : 'Whole trip';
    $('#evDates').innerHTML = `<button class="evdate${state.evDate===null?' on':''}" data-evd="all">All</button>` +
      cal.map(x => `<button class="evdate${state.evDate===x.date?' on':''}${x.date===today?' today':''}" data-evd="${x.date}">${new Date(x.date+'T00:00:00Z').toLocaleDateString('en-US',{weekday:'short',timeZone:'UTC'})} ${+x.date.slice(8)}<small>${cityShort(x.city)}</small></button>`).join('');
    renderEvents();
  }
  function renderEvents() {
    let evs, showCity;
    if (state.evDate) { evs = eventsOn(state.evDate, cityForDate(state.evDate)); showCity = false; }
    else { evs = allTripEvents(); showCity = true; }
    evs = evs.slice().sort((a, b) => a.start.localeCompare(b.start) || (a.time||'').localeCompare(b.time||''));
    $('#evList').innerHTML = evs.length ? evs.map(e => evCard(e, showCity)).join('') : '<div class="empty">No family events on this day. Tap “All” to see the whole trip.</div>';
  }
  function evCard(e, showCity) {
    const c = EVCAT[e.category] || { label: e.category, color: '#888' };
    const date = e.start === e.end ? fmtDate(e.start) : `${fmtDate(e.start)} – ${fmtDate(e.end)}`;
    const cityTag = showCity ? `<span class="ev-citytag">${esc(CONFIG.cities[e.city].label)}</span>` : '';
    return `<div class="ev-card">
      ${e.photos && e.photos[0] ? `<img class="ev-photo" loading="lazy" src="${esc(e.photos[0])}" onerror="this.remove()">` : ''}
      <span class="ev-cat" style="background:${c.color}">${esc(c.label)}</span>${cityTag}
      <h3>${esc(e.name)}</h3>
      <div class="ev-meta">📅 ${date}${e.time ? ` · ${esc(e.time)}` : ''}</div>
      <div class="ev-meta">📍 ${esc(e.venue)} ${priceHtml(e)}</div>
      <p class="desc">${esc(e.desc)}</p>
      ${e.notes ? `<div class="hourline">${esc(e.notes)}</div>` : ''}
      <div class="ev-acts">
        ${e.lat ? `<button class="contact" data-evmap="${e.lat}|${e.lng}|${e.city}|${esc(e.name)}">📍 Show on map</button>` : ''}
        ${e.url ? `<a class="contact" href="${esc(e.url)}" target="_blank" rel="noopener">Info ↗</a>` : ''}
      </div>
    </div>`;
  }
  function showEventOnMap(lat, lng, city, name) {
    closeEvents();
    if (city && city !== state.city) { state.city = city; saveCity(); buildCitySeg(); buildCats(); buildDays(); updateToggles(); updateEvBadge(); renderAll(); }
    map.flyTo([lat, lng], 15, { duration: .5 });
    if (evTempMarker) evTempMarker.remove();
    evTempMarker = L.marker([lat, lng], { icon: L.divIcon({ className:'', iconSize:[26,26], iconAnchor:[13,26], popupAnchor:[0,-24], html:`<div class="pin active" style="background:var(--accent)"><span class="dot"></span></div>` }) }).addTo(map).bindPopup(name).openPopup();
  }
  function updateEvBadge() {
    const today = todayISO(), city = cityForDate(today);
    const n = city ? eventsOn(today, city).length : 0;
    const b = $('#evbadge'); b.textContent = n; b.classList.toggle('show', n > 0);
  }

  /* ---------- filters UI ---------- */
  function buildCitySeg() {
    $('#cityseg').innerHTML = cityKeys.map(k =>
      `<button data-city="${k}" class="${k===state.city?'active':''}">${esc(CONFIG.cities[k].label)}</button>`).join('');
  }
  function buildCats() {
    const present = [...new Set(LOCATIONS.filter(l => l.city === state.city).map(l => l.category))];
    const order = Object.keys(CATEGORIES);
    present.sort((a,b) => order.indexOf(a) - order.indexOf(b));
    $('#catchips').innerHTML = present.map(c => {
      const cat = CATEGORIES[c], on = state.cats.has(c);
      return `<button class="chip cat-chip${on?' on':''}" data-cat="${c}" style="${on?`background:${cat.color}`:''}"><span class="swatch" style="background:${cat.color}"></span>${esc(cat.label)}</button>`;
    }).join('');
  }
  function buildDays() {
    const today = nowInCity().day;
    $('#daystrip').innerHTML = DAYS.map((dk,i) =>
      `<button class="daybtn${state.day===i?' on':''}${i===today?' today':''}" data-day="${i}">${DLBL[dk]}</button>`).join('');
  }
  function updateToggles() {
    $('[data-toggle="open"]').classList.toggle('on', state.openNow);
    $('[data-toggle="fav"]').classList.toggle('on', state.favOnly);
  }

  /* ---------- events ---------- */
  function wire() {
    $('#cityseg').addEventListener('click', e => {
      const b = e.target.closest('[data-city]'); if (!b) return;
      state.city = b.dataset.city; state.activeId = null; state.cats.clear(); state.day = null; saveCity();
      buildCitySeg(); buildCats(); buildDays(); updateToggles(); updateEvBadge(); renderAll();
    });
    $('.filters').addEventListener('click', e => {
      const cat = e.target.closest('[data-cat]');
      if (cat) { const c = cat.dataset.cat; state.cats.has(c) ? state.cats.delete(c) : state.cats.add(c); buildCats(); renderAll(); return; }
      const day = e.target.closest('[data-day]');
      if (day) { const d = +day.dataset.day; state.day = state.day === d ? null : d; buildDays(); renderAll(); return; }
      const tog = e.target.closest('[data-toggle]');
      if (tog) { if (tog.dataset.toggle === 'open') state.openNow = !state.openNow; else state.favOnly = !state.favOnly; updateToggles(); renderAll(); }
    });
    $('#listItems').addEventListener('click', e => {
      const ph = e.target.closest('[data-ph]');
      if (ph) { const [id, i] = ph.dataset.ph.split('|'); openLb(byId(id).photos, +i); return; }
      const wc = e.target.closest('[data-wechat]');
      if (wc) { e.stopPropagation(); copyWechat(wc.dataset.wechat); return; }
      const wcp = e.target.closest('[data-wechatphone]');
      if (wcp) { e.stopPropagation(); copyWechatPhone(wcp.dataset.wechatphone); return; }
      const heart = e.target.closest('[data-heart]');
      if (heart) { e.stopPropagation(); toggleFav(heart.dataset.heart); return; }
      const card = e.target.closest('.card');
      if (card) select(card.dataset.id);
    });
    const search = $('#search'), wrap = $('#searchwrap');
    search.addEventListener('input', () => { state.q = search.value.trim().toLowerCase(); wrap.classList.toggle('has', !!search.value); renderList(); renderMarkers(); });
    $('#clr').addEventListener('click', () => { search.value = ''; state.q = ''; wrap.classList.remove('has'); renderAll(); });

    $('#maptoggle').addEventListener('click', () => { document.body.classList.toggle('mapbig'); setTimeout(() => map.invalidateSize(), 230); });

    // settings sheet
    const sheet = $('#sheet'), backdrop = $('#backdrop');
    const openSheet = () => { ['CNY','HKD','KRW'].forEach(c => { const i = $('#rate-'+c); if (i) i.value = rates[c]; }); sheet.classList.add('show'); backdrop.classList.add('show'); };
    const closeSheet = () => {
      ['CNY','HKD','KRW'].forEach(c => { const i = $('#rate-'+c); if (i && i.value) rates[c] = parseFloat(i.value); });
      saveRates(); sheet.classList.remove('show'); backdrop.classList.remove('show'); renderAll();
    };
    $('#gear').addEventListener('click', openSheet);
    $('#sheet-done').addEventListener('click', closeSheet);
    backdrop.addEventListener('click', closeSheet);

    $('#evbtn').addEventListener('click', openEvents);
    $('#evClose').addEventListener('click', closeEvents);
    $('#evDates').addEventListener('click', e => { const b = e.target.closest('[data-evd]'); if (!b) return; state.evDate = b.dataset.evd === 'all' ? null : b.dataset.evd; buildEvents(); });
    $('#evList').addEventListener('click', e => { const m = e.target.closest('[data-evmap]'); if (m) { const [la, ln, city, ...nm] = m.dataset.evmap.split('|'); showEventOnMap(+la, +ln, city, nm.join('|')); } });

    window.addEventListener('resize', () => map.invalidateSize());
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeLb(); closeEvents(); } });
  }

  /* ---------- boot ---------- */
  initMap(); buildLightbox(); buildCitySeg(); buildCats(); buildDays(); updateToggles(); wire(); renderAll(); updateEvBadge();
})();
