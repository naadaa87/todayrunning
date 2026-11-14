/* =========================================================
   오늘러닝 — 공통 스크립트
   머리글·바닥글·하단 탭, 저장소, 서식, 날씨 기준, 지도, QR, 로그인
   ========================================================= */
(function () {
  'use strict';
  const D = window.TR_DATA || { hubs: [], crews: [], meetups: [], courses: [], stores: [], races: [], facilities: [], principles: [] };
  const TR = (window.TR = {});

  /* ---------------- 기본 도구 ---------------- */
  TR.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TR.$ = (sel, el) => (el || document).querySelector(sel);
  TR.$$ = (sel, el) => Array.from((el || document).querySelectorAll(sel));
  TR.qs = (name) => new URLSearchParams(location.search).get(name);
  TR.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  TR.pad = (n) => String(n).padStart(2, '0');
  TR.clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // localStorage (시범 버전은 브라우저에만 저장)
  TR.ls = {
    get(k, d) { try { const v = localStorage.getItem('tr.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('tr.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem('tr.' + k); } catch (e) { /* 무시 */ } },
  };
  TR.ss = {
    get(k, d) { try { const v = sessionStorage.getItem('tr.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { sessionStorage.setItem('tr.' + k, JSON.stringify(v)); } catch (e) { /* 무시 */ } },
  };

  /* ---------------- 서식 ---------------- */
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  TR.fmt = {
    time(sec, forceH) {
      if (!isFinite(sec) || sec < 0) sec = 0;
      sec = Math.round(sec);
      const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
      return (h || forceH) ? `${h}:${TR.pad(m)}:${TR.pad(s)}` : `${m}:${TR.pad(s)}`;
    },
    clock(ms) { // 스톱워치용 mm:ss.cc
      const cs = Math.floor(ms / 10) % 100, s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000);
      return (h ? h + ':' + TR.pad(m) : TR.pad(m)) + ':' + TR.pad(s) + '.' + TR.pad(cs);
    },
    pace(secPerKm) {
      if (!isFinite(secPerKm) || secPerKm <= 0 || secPerKm > 3600) return "--'--\"";
      let m = Math.floor(secPerKm / 60), s = Math.round(secPerKm % 60);
      if (s === 60) { m += 1; s = 0; }
      return `${m}'${TR.pad(s)}"`;
    },
    km(n, d) { return (Math.round(n * Math.pow(10, d == null ? 2 : d)) / Math.pow(10, d == null ? 2 : d)).toFixed(d == null ? 2 : d); },
    date(dt) { const d = new Date(dt); return `${d.getMonth() + 1}월 ${d.getDate()}일(${WD[d.getDay()]})`; },
    ymd(dt) { const d = new Date(dt); return `${d.getFullYear()}.${TR.pad(d.getMonth() + 1)}.${TR.pad(d.getDate())}`; },
    hm(dt) { const d = new Date(dt); return `${TR.pad(d.getHours())}:${TR.pad(d.getMinutes())}`; },
    dateTime(dt) { return `${TR.fmt.date(dt)} ${TR.fmt.hm(dt)}`; },
    rel(dt) {
      const d = new Date(dt); const a = new Date(); a.setHours(0, 0, 0, 0); const b = new Date(d); b.setHours(0, 0, 0, 0);
      const diff = Math.round((b - a) / 86400000);
      if (diff === 0) return '오늘'; if (diff === 1) return '내일'; if (diff === 2) return '모레';
      if (diff > 0) return `${diff}일 후`; return `${-diff}일 전`;
    },
    won(n) { return Number(n).toLocaleString('ko-KR') + '원'; },
    weekday(i) { return WD[i]; },
  };
  TR.parsePace = function (str) {
    if (str == null) return NaN;
    const s = String(str).trim().replace(/["”″]/g, '').replace(/['’′]/g, ':');
    if (s.includes(':')) { const [m, sec] = s.split(':'); return (+m) * 60 + (+sec || 0); }
    const n = +s; if (!isFinite(n)) return NaN;
    return n >= 100 ? Math.floor(n / 100) * 60 + (n % 100) : n * 60;
  };
  // 두 지점 사이 거리(km)
  TR.dist = function (a, b) {
    const R = 6371, toR = Math.PI / 180;
    const dLat = (b[0] - a[0]) * toR, dLng = (b[1] - a[1]) * toR;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toR) * Math.cos(b[0] * toR) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  };
  TR.pathKm = (path) => path.reduce((s, p, i) => (i ? s + TR.dist(path[i - 1], p) : 0), 0);

  /* ---------------- 아이콘 ---------------- */
  const P = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.2 3.2 0 010 6.2M21 20c0-2.6-1.6-4.8-4-5.6"/>',
    run: '<circle cx="14" cy="4.5" r="2"/><path d="M8 21l3-6 3 2v5M6 12l3-4 4 1 3 4 3 1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
    map: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
    pin: '<path d="M12 21s-7-6.2-7-12a7 7 0 0114 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    cup: '<path d="M4 8h13v5a6 6 0 01-6 6h-1a6 6 0 01-6-6V8z"/><path d="M17 10h1.5a2.5 2.5 0 010 5H17M8 3v2M12 3v2"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    tool: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M10 2h4M12 2v3"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    book: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5z"/><path d="M4 19a2 2 0 012-2h13"/>',
    bag: '<path d="M6 8h12l-1 12H7L6 8z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
    bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4l2-2z"/><path d="M10 20a2 2 0 004 0"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    share: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="M8.2 10.8l7.6-4.4M8.2 13.2l7.6 4.4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    route: '<circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="6" r="2.5"/><path d="M8.5 18H15a3 3 0 000-6H9a3 3 0 010-6h6.5"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z"/>',
    watch: '<rect x="6" y="6" width="12" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 9.5V12l1.5 1"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    store: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9h16v2a3 3 0 01-5.3 2A3 3 0 0112 14a3 3 0 01-2.7-1A3 3 0 014 11V9z"/><path d="M5 14v6h14v-6"/>',
    qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/>',
    sos: '<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16.5v.5"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"/>',
    link: '<path d="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
    moon: '<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  };
  TR.icon = (name, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
  TR.logoMark = () => '<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#fff" stroke="#E3E6EA"/><path d="M7 25C7 14.5 13 8.5 25 8" fill="none" stroke="#E8452C" stroke-width="3.4" stroke-linecap="round"/><path d="M12.5 26c0-7.6 4.4-12.4 13-12.6" fill="none" stroke="#1F2328" stroke-width="2" stroke-linecap="round" opacity=".25"/><circle cx="7" cy="25" r="2.6" fill="#E8452C"/></svg>';

  /* ---------------- 데이터 접근 ---------------- */
  function nextAt(m) {
    const [hh, mm] = (m.time || '07:00').split(':').map(Number);
    const now = new Date();
    if (m.date) { const d = new Date(m.date + 'T' + m.time); return d; }
    if (m.offsetDays != null) { const d = new Date(); d.setDate(d.getDate() + m.offsetDays); d.setHours(hh, mm, 0, 0); return d; }
    for (let i = 0; i < 8; i++) {
      const d = new Date(); d.setDate(now.getDate() + i); d.setHours(hh, mm, 0, 0);
      if (d.getDay() === m.weekday && d > now) return d;
    }
    return now;
  }
  TR.data = {
    hubs: () => D.hubs,
    hub: (id) => D.hubs.find((h) => h.id === id),
    crews() { return D.crews.concat(TR.ls.get('crews', [])); },
    crew(id) { return TR.data.crews().find((c) => c.id === id); },
    courses() { return D.courses.concat(TR.ls.get('courses', [])).map((c) => Object.assign({ km: TR.pathKm(c.path) }, c)); },
    course(id) { return TR.data.courses().find((c) => c.id === id); },
    meetups() {
      const apps = TR.ls.get('apps', {});
      const cancelled = TR.ls.get('cancelled', {});
      return D.meetups.concat(TR.ls.get('meetups', [])).map((m) => {
        const x = JSON.parse(JSON.stringify(m));
        x.at = nextAt(m);
        const hub = TR.data.hub(x.hubId) || {};
        x.lat = x.lat || hub.lat; x.lng = x.lng || hub.lng; x.region = hub.region; x.hubName = hub.name;
        const a = apps[x.id];
        if (a && a.status === '신청') { const g = x.groups.find((g) => g.name === a.group); if (g && g.filled < g.cap) g.filled += 1; }
        x.cap = x.groups.reduce((s, g) => s + g.cap, 0);
        x.filled = x.groups.reduce((s, g) => s + g.filled, 0);
        x.cancelled = !!cancelled[x.id];
        x.mine = a || null;
        return x;
      }).sort((a, b) => a.at - b.at);
    },
    meetup(id) { return TR.data.meetups().find((m) => m.id === id); },
    stores() {
      const ov = TR.ls.get('storeOv', {});
      return D.stores.concat(TR.ls.get('stores', [])).map((s) => {
        const x = JSON.parse(JSON.stringify(s));
        if (ov[s.id]) Object.assign(x, ov[s.id], { storage: Object.assign({}, x.storage, (ov[s.id] || {}).storage || {}), benefit: Object.assign({}, x.benefit, (ov[s.id] || {}).benefit || {}) });
        const hub = TR.data.hub(x.hubId) || {};
        x.region = hub.region; x.hubName = hub.name;
        x.status = TR.storeStatus(x);
        return x;
      });
    },
    store(id) { return TR.data.stores().find((s) => s.id === id); },
    races: () => D.races.map((r) => Object.assign({}, r)),
    facilities: (hubId) => D.facilities.filter((f) => !hubId || f.hubId === hubId),
    principles: () => D.principles,
  };
  TR.storeStatus = function (s, when) {
    const now = when ? new Date(when) : new Date();
    const wd = TR.fmt.weekday(now.getDay());
    const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const cur = now.getHours() * 60 + now.getMinutes();
    let open = false, label = '';
    if (s.closedDay && s.closedDay.split(',').includes(wd)) { label = '오늘 휴무'; }
    else if (cur < toMin(s.open)) label = `${s.open} 영업 시작`;
    else if (cur >= toMin(s.close === '24:00' ? '23:59' : s.close)) label = '영업 종료';
    else { open = true; label = `영업 중 · ${s.close}까지`; }
    const cap = (s.storage && s.storage.cap) || 0, used = (s.storage && s.storage.used) || 0;
    const left = Math.max(0, cap - used);
    const storage = cap === 0 ? { cls: 'off', text: '짐 보관 없음' } : (!open || s.storage.paused) ? { cls: 'off', text: s.storage.paused ? '보관 잠시 중단' : '보관 운영 시간 아님' } : left === 0 ? { cls: 'full', text: '보관 만석' } : { cls: 'ok', text: `지금 보관 가능 · ${left}자리` };
    return { open, label, storage, left };
  };
  TR.myApps = () => TR.ls.get('apps', {});

  /* ---------------- 사용자(시범: 브라우저 저장) ---------------- */
  TR.user = {
    get: () => TR.ls.get('user', null),
    set(u) { TR.ls.set('user', u); },
    logout() { TR.ls.del('user'); location.reload(); },
    require(then, why) {
      const u = TR.user.get();
      if (u) { then && then(u); return u; }
      TR.loginModal(then, why);
      return null;
    },
  };
  TR.loginModal = function (then, why) {
    const html = `
      ${why ? `<p class="muted small mb16">${TR.esc(why)}</p>` : ''}
      <label class="field"><span>닉네임</span><input class="input" id="lg-nick" maxlength="12" placeholder="예: 소윤"></label>
      <div class="form-grid mt16">
        <label class="field"><span>주로 달리는 지역</span><select class="select" id="lg-region"><option>서울</option><option>경기</option><option>부산</option><option>그 외</option></select></label>
        <label class="field"><span>편한 페이스(1km)</span><select class="select" id="lg-pace">${["5'00\"", "5'30\"", "6'00\"", "6'30\"", "7'00\"", "7'30\"", "8'00\"", "8'30\""].map((p) => `<option ${p === "6'30\"" ? 'selected' : ''}>${p}</option>`).join('')}</select></label>
      </div>
      <div class="notice gray mt16 small">시범 버전에서는 계정을 따로 만들지 않고, 입력한 정보를 이 브라우저에만 저장합니다. 정식 서비스에서는 카카오·네이버·애플·이메일 로그인을 제공합니다.</div>`;
    TR.modal({
      title: '오늘러닝 시작하기', html,
      actions: [{ label: '취소', cls: 'line' }, {
        label: '시작하기', onClick: (close) => {
          const nick = TR.$('#lg-nick').value.trim();
          if (!nick) { TR.toast('닉네임을 입력해 주세요'); return false; }
          const u = { id: TR.uid(), nick, region: TR.$('#lg-region').value, pace: TR.$('#lg-pace').value, joined: new Date().toISOString() };
          TR.user.set(u); close(); TR.toast(`${nick}님, 반가워요`);
          renderHeaderUser();
          then && then(u);
        },
      }],
      onOpen: () => setTimeout(() => { const el = TR.$('#lg-nick'); el && el.focus(); }, 50),
    });
  };

  /* ---------------- 토스트·모달 ---------------- */
  TR.toast = function (msg) {
    let w = TR.$('.toast-wrap');
    if (!w) { w = document.createElement('div'); w.className = 'toast-wrap'; w.setAttribute('role', 'status'); document.body.appendChild(w); }
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; w.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; setTimeout(() => t.remove(), 300); }, 2400);
  };
  TR.modal = function ({ title, html, actions, onOpen, wide }) {
    const back = document.createElement('div'); back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" ${wide ? 'style="max-width:720px"' : ''}><h3>${TR.esc(title || '')}</h3><div class="modal-body">${html || ''}</div><div class="actions"></div></div>`;
    const close = () => { back.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const act = back.querySelector('.actions');
    (actions || [{ label: '닫기', cls: 'line' }]).forEach((a) => {
      const b = document.createElement('button'); b.className = 'btn ' + (a.cls || ''); b.textContent = a.label;
      b.onclick = () => { const r = a.onClick ? a.onClick(close, back) : undefined; if (r !== false && !a.onClick) close(); };
      act.appendChild(b);
    });
    back.addEventListener('click', (e) => { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    onOpen && onOpen(back);
    return close;
  };
  TR.confirm = (title, text, okLabel, onOk) => TR.modal({ title, html: `<p>${text}</p>`, actions: [{ label: '취소', cls: 'line' }, { label: okLabel || '확인', onClick: (c) => { c(); onOk && onOk(); } }] });
  TR.copy = async function (text) {
    try { await navigator.clipboard.writeText(text); TR.toast('복사했어요'); }
    catch (e) { TR.modal({ title: '링크 복사', html: `<input class="input" value="${TR.esc(text)}" onfocus="this.select()">` }); }
  };
  TR.share = async function (title, text, url) {
    if (navigator.share) { try { await navigator.share({ title, text, url }); return; } catch (e) { return; } }
    TR.copy(url);
  };

  /* ---------------- 날씨·대기 기준 ---------------- */
  const WCODE = { 0: '맑음', 1: '대체로 맑음', 2: '구름 조금', 3: '흐림', 45: '안개', 48: '안개', 51: '이슬비', 53: '이슬비', 55: '이슬비', 56: '어는 비', 57: '어는 비', 61: '비', 63: '비', 65: '강한 비', 66: '어는 비', 67: '어는 비', 71: '눈', 73: '눈', 75: '많은 눈', 77: '싸락눈', 80: '소나기', 81: '소나기', 82: '강한 소나기', 85: '눈', 86: '많은 눈', 95: '뇌우', 96: '뇌우', 99: '뇌우' };
  TR.weather = {
    text: (c) => WCODE[c] || '-',
    async get(lat, lng) {
      const key = 'wx.' + lat.toFixed(2) + ',' + lng.toFixed(2);
      const c = TR.ss.get(key, null);
      if (c && Date.now() - c.t < 30 * 60 * 1000) return c.v;
      const fUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,apparent_temperature,precipitation_probability,uv_index,weather_code,wind_speed_10m&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=3`;
      const aUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=pm10,pm2_5&hourly=pm10,pm2_5&timezone=Asia%2FSeoul&forecast_days=3`;
      const [f, a] = await Promise.all([
        fetch(fUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(aUrl).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (!f) throw new Error('weather');
      const v = { f, a };
      TR.ss.set(key, { t: Date.now(), v });
      return v;
    },
    // 특정 시각의 값 뽑기
    at(w, when) {
      const t = new Date(when || Date.now());
      const hourKey = `${t.getFullYear()}-${TR.pad(t.getMonth() + 1)}-${TR.pad(t.getDate())}T${TR.pad(t.getHours())}:00`;
      const hi = w.f.hourly ? w.f.hourly.time.indexOf(hourKey) : -1;
      const ai = w.a && w.a.hourly ? w.a.hourly.time.indexOf(hourKey) : -1;
      const nowish = !when || Math.abs(t - Date.now()) < 60 * 60 * 1000;
      const cur = w.f.current || {};
      const pick = (arr, i, d) => (arr && i >= 0 && arr[i] != null ? arr[i] : d);
      return {
        when: t,
        temp: nowish ? cur.temperature_2m : pick(w.f.hourly.temperature_2m, hi, cur.temperature_2m),
        feels: nowish ? cur.apparent_temperature : pick(w.f.hourly.apparent_temperature, hi, cur.apparent_temperature),
        hum: cur.relative_humidity_2m,
        wind: nowish ? cur.wind_speed_10m : pick(w.f.hourly.wind_speed_10m, hi, cur.wind_speed_10m),
        code: nowish ? cur.weather_code : pick(w.f.hourly.weather_code, hi, cur.weather_code),
        pop: pick(w.f.hourly.precipitation_probability, hi, null),
        uv: pick(w.f.hourly.uv_index, hi, null),
        pm10: w.a ? (nowish && w.a.current ? w.a.current.pm10 : pick(w.a.hourly && w.a.hourly.pm10, ai, w.a.current && w.a.current.pm10)) : null,
        pm25: w.a ? (nowish && w.a.current ? w.a.current.pm2_5 : pick(w.a.hourly && w.a.hourly.pm2_5, ai, w.a.current && w.a.current.pm2_5)) : null,
      };
    },
    // 오늘러닝 안내 단계(기획서 부록 B 가안)
    stage(x) {
      const r = []; let lv = 0;
      const up = (l, why) => { lv = Math.max(lv, l); r.push({ l, why }); };
      if (x.code >= 95) up(3, '뇌우(낙뢰) 예보');
      if (x.feels != null) {
        if (x.feels >= 38) up(3, `체감온도 ${Math.round(x.feels)}℃ (38℃ 이상)`);
        else if (x.feels >= 35) up(2, `체감온도 ${Math.round(x.feels)}℃ (35℃ 이상)`);
        else if (x.feels >= 33) up(1, `체감온도 ${Math.round(x.feels)}℃ (33℃ 이상)`);
        if (x.feels <= -15) up(2, `체감온도 ${Math.round(x.feels)}℃ (매우 추움)`);
        else if (x.feels <= -10) up(1, `체감온도 ${Math.round(x.feels)}℃ (추움)`);
      }
      if (x.pm25 != null) { if (x.pm25 >= 76) up(2, `초미세먼지 ${Math.round(x.pm25)}㎍/㎥ (매우나쁨)`); else if (x.pm25 >= 36) up(1, `초미세먼지 ${Math.round(x.pm25)}㎍/㎥ (나쁨)`); }
      if (x.pm10 != null) { if (x.pm10 >= 151) up(2, `미세먼지 ${Math.round(x.pm10)}㎍/㎥ (매우나쁨)`); else if (x.pm10 >= 81) up(1, `미세먼지 ${Math.round(x.pm10)}㎍/㎥ (나쁨)`); }
      const h = x.when.getHours();
      if (x.uv != null && x.uv >= 8 && h >= 10 && h <= 16) up(1, `자외선지수 ${Math.round(x.uv)} (매우높음)`);
      if (x.pop != null && x.pop >= 70) up(1, `강수 확률 ${x.pop}%`);
      if (x.wind != null && x.wind >= 14) up(2, `바람 ${Math.round(x.wind)}m/s (강풍)`);
      const labels = ['좋음', '주의', '경고', '중단 권고'];
      const advice = ['달리기 좋은 날이에요.', '거리 단축, 급수 지점 확인, 시간 조정을 검토하세요.', '고강도 훈련은 취소하고 실내 대체나 모임 취소를 권해요.', '야외 모임은 취소를 권해요. 달리는 중이면 바로 멈추고 안전한 곳으로 이동하세요.'];
      return { level: lv, label: labels[lv], reasons: r, advice: advice[lv], cls: ['좋음', '주의', '경고', '중단'][lv] };
    },
    pmGrade(v, kind) {
      if (v == null) return '-';
      const t = kind === 'pm10' ? [30, 80, 150] : [15, 35, 75];
      return v <= t[0] ? '좋음' : v <= t[1] ? '보통' : v <= t[2] ? '나쁨' : '매우나쁨';
    },
  };
  // 날씨 카드 그리기
  TR.weatherCard = async function (el, opt) {
    el.innerHTML = `<div class="muted small">날씨 정보를 불러오는 중…</div>`;
    try {
      const w = await TR.weather.get(opt.lat, opt.lng);
      const x = TR.weather.at(w, opt.when);
      const st = TR.weather.stage(x);
      const whenText = opt.when ? `${TR.fmt.rel(opt.when)} ${TR.fmt.hm(opt.when)} 예보` : '지금';
      el.innerHTML = `
        <div class="row between wrap">
          <div><div class="xsmall muted">${TR.esc(opt.name || '')} · ${whenText}</div>
            <div class="weather mt8"><span class="stage stage-${st.cls}"><i></i>달리기 ${st.label}</span><span class="muted small">${TR.weather.text(x.code)}</span></div></div>
          ${opt.compact ? '' : `<a class="small muted" href="guide.html#weather">기준 보기</a>`}
        </div>
        <div class="wx-grid mt12">
          <div><b>${x.feels != null ? Math.round(x.feels) + '℃' : '-'}</b><span>체감온도</span></div>
          <div><b>${x.pm25 != null ? Math.round(x.pm25) : '-'}</b><span>초미세먼지 ${TR.weather.pmGrade(x.pm25, 'pm25')}</span></div>
          <div><b>${x.pop != null ? x.pop + '%' : '-'}</b><span>강수 확률</span></div>
          <div><b>${x.wind != null ? Math.round(x.wind) + 'm/s' : '-'}</b><span>바람</span></div>
        </div>
        ${st.level ? `<div class="notice ${st.level >= 2 ? 'danger' : 'warn'} mt12 small"><b>${st.reasons.map((r) => r.why).join(' · ')}</b><br>${st.advice}</div>` : `<p class="small muted mt12">${st.advice}</p>`}
        <p class="xsmall muted mt8">자료: Open-Meteo 예보·대기질 모델. 공식 특보는 기상청과 에어코리아를 확인하세요.</p>`;
      return st;
    } catch (e) {
      el.innerHTML = `<div class="small muted">날씨 정보를 불러오지 못했어요. 인터넷 연결을 확인하거나 <a class="point-text" href="https://www.weather.go.kr" target="_blank" rel="noopener">기상청 날씨누리</a>에서 확인해 주세요.</div>`;
      return null;
    }
  };

  /* ---------------- 지도(Leaflet + OpenStreetMap) ---------------- */
  TR.map = {
    create(el, opt) {
      if (!window.L) { el.innerHTML = '<div class="empty" style="height:100%;display:flex;align-items:center;justify-content:center">지도를 불러오지 못했어요</div>'; return null; }
      opt = opt || {};
      const m = L.map(el, { scrollWheelZoom: !!opt.wheel, zoomControl: true, attributionControl: true });
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(m);
      m.setView(opt.center || [37.53, 126.98], opt.zoom || 12);
      return m;
    },
    pin(label, cls) { return L.divIcon({ className: '', html: `<div class="pin ${cls || ''}"><span>${TR.esc(label == null ? '' : label)}</span></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] }); },
    label(text, cls) { return L.divIcon({ className: '', html: `<div class="map-label ${cls || ''}">${TR.esc(text)}</div>`, iconSize: null, iconAnchor: [0, 0] }); },
    fac(label, cls) { return L.divIcon({ className: '', html: `<div class="fac ${cls || ''}">${TR.esc(label)}</div>`, iconSize: [38, 22], iconAnchor: [19, 11] }); },
    facilities(map, hubId) {
      const g = L.layerGroup();
      TR.data.facilities(hubId).forEach((f) => L.marker([f.lat, f.lng], { icon: TR.map.fac(f.label, f.kind === 'aed' ? 'aed' : '') }).bindPopup(`<b>${f.label === 'WC' ? '화장실' : f.label === '보관' ? '보관함' : f.label === '급수' ? '급수대' : 'AED(자동심장충격기)'}</b><br><span class="muted">예시 위치</span>`).addTo(g));
      g.addTo(map); return g;
    },
  };

  /* ---------------- QR ---------------- */
  TR.qrSvg = function (text) {
    if (!window.qrcode) return `<div class="code">${TR.esc(text).slice(-6)}</div>`;
    const q = window.qrcode(0, 'M'); q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  };
  // 30초마다 바뀌는 6자리 코드(시범: 브라우저에서 계산)
  TR.rollingCode = function (seed, step, back) {
    step = step || 30;
    const slot = Math.floor(Date.now() / 1000 / step) - (back || 0);
    let h = 2166136261;
    const s = seed + ':' + slot;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return { code: String(Math.abs(h) % 1000000).padStart(6, '0'), left: step - Math.floor(Date.now() / 1000) % step, slot };
  };
  // 지금 코드나 바로 전 코드(30초 여유)와 맞는지
  TR.checkCode = (seed, v) => [0, 1].some((b) => TR.rollingCode(seed, 30, b).code === String(v).trim());

  /* ---------------- 소리·진동·음성·화면 켜짐 ---------------- */
  let actx = null;
  TR.audio = () => { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { actx = null; } return actx; };
  TR.beep = function (freq, ms, vol, when) {
    const a = TR.audio(); if (!a) return;
    const t = when || a.currentTime;
    const o = a.createOscillator(), g = a.createGain();
    o.frequency.value = freq || 880; o.type = 'sine';
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + (ms || 120) / 1000);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + (ms || 120) / 1000 + 0.02);
  };
  TR.say = function (text) {
    try { if (!window.speechSynthesis) return; const s = new SpeechSynthesisUtterance(text); s.lang = 'ko-KR'; s.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(s); } catch (e) { /* 무시 */ }
  };
  TR.vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) { /* 무시 */ } };
  let wakeSentinel = null;
  TR.wake = {
    supported: 'wakeLock' in navigator,
    async on() { try { if (!('wakeLock' in navigator)) return false; wakeSentinel = await navigator.wakeLock.request('screen'); return true; } catch (e) { return false; } },
    async off() { try { if (wakeSentinel) await wakeSentinel.release(); } catch (e) { /* 무시 */ } wakeSentinel = null; },
    get active() { return !!wakeSentinel && !wakeSentinel.released; },
  };
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && wakeSentinel && wakeSentinel.released) TR.wake.on(); });

  /* ---------------- 기록 ---------------- */
  TR.records = {
    all: () => TR.ls.get('records', []).sort((a, b) => new Date(b.date) - new Date(a.date)),
    add(r) { const all = TR.ls.get('records', []); r.id = r.id || TR.uid(); all.push(r); TR.ls.set('records', all); return r; },
    remove(id) { TR.ls.set('records', TR.ls.get('records', []).filter((r) => r.id !== id)); },
    today() { const t = new Date().toDateString(); return TR.records.all().filter((r) => new Date(r.date).toDateString() === t); },
  };

  /* ---------------- 머리글·바닥글 ---------------- */
  const NAV = [
    ['meetups', '모임', 'meetups.html'],
    ['crews', '크루', 'crews.html'],
    ['courses', '코스', 'courses.html'],
    ['stores', '러너 매장', 'stores.html'],
    ['tools', '러닝 도구', 'tools.html'],
    ['races', '대회', 'races.html'],
    ['guide', '가이드', 'guide.html'],
  ];
  function renderHeaderUser() {
    const box = TR.$('#hdr-user'); if (!box) return;
    const u = TR.user.get();
    box.innerHTML = u
      ? `<a class="btn line sm" href="mypage.html" title="마이페이지"><span style="width:22px;height:22px;border-radius:11px;background:var(--tint);color:var(--point-dark);display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800">${TR.esc(u.nick.slice(0, 1))}</span>마이페이지</a>`
      : `<button class="btn line sm" id="hdr-login">로그인</button>`;
    const b = TR.$('#hdr-login'); if (b) b.onclick = () => TR.loginModal();
  }
  TR.renderHeaderUser = renderHeaderUser;

  function layout() {
    const body = document.body;
    const nav = body.dataset.nav || body.dataset.page || '';
    const page = body.dataset.page || '';
    const header = document.createElement('header');
    header.className = 'site-header';
    header.innerHTML = `
      <div class="container">
        <a class="brand" href="index.html" aria-label="오늘러닝 홈">${TR.logoMark()}<span>오늘러닝</span></a>
        <nav class="gnb" aria-label="주 메뉴">${NAV.map(([id, label, href]) => `<a href="${href}" class="${nav === id ? 'on' : ''}">${label}</a>`).join('')}</nav>
        <div class="header-actions">
          <a class="btn sm hide-m" href="run.html">${TR.icon('run')}달리기</a>
          <span id="hdr-user"></span>
          <button class="menu-btn" aria-label="메뉴 열기" aria-expanded="false">${TR.icon('menu')}</button>
        </div>
      </div>`;
    const skip = document.createElement('a'); skip.className = 'skip'; skip.href = '#main'; skip.textContent = '본문 바로가기';
    body.prepend(header); body.prepend(skip);

    if (!TR.ss.get('demoNoteClosed', false) && body.dataset.demo !== 'off') {
      const note = document.createElement('div'); note.className = 'demo-note';
      note.innerHTML = `<div class="container"><b>시범 화면</b><span>크루·모임·매장·대회 정보는 예시입니다. 입력한 내용은 이 브라우저에만 저장돼요.</span><button aria-label="안내 닫기">×</button></div>`;
      note.querySelector('button').onclick = () => { note.remove(); TR.ss.set('demoNoteClosed', true); };
      header.after(note);
    }

    const mnav = document.createElement('nav'); mnav.className = 'mobile-nav'; mnav.setAttribute('aria-label', '전체 메뉴');
    mnav.innerHTML = [
      ['index.html', '홈', ''], ['meetups.html', '모임 찾기', '페이스·지역별'], ['meetup-new.html', '모임 만들기', '정기런·번개런'], ['crews.html', '크루', '크루 찾기·크루 관리'],
      ['courses.html', '코스', '코스 찾기·코스 짜기'], ['stores.html', '러너 프렌들리 매장', '인증 할인·짐 보관'], ['tools.html', '러닝 도구', '스톱워치·페이스 계산 등'],
      ['run.html', '달리기 기록', 'GPS·귀가 공유'], ['races.html', '대회', '캘린더·접수 알림'], ['guide.html', '가이드', '함께 달리기 원칙·안전'],
      ['mypage.html', '마이페이지', '내 모임·기록·안전 설정'], ['partner.html', '매장 파트너 센터', '입점·관리·홍보'], ['about.html', '서비스 소개', ''],
    ].map(([h, t, s]) => `<a href="${h}">${t}${s ? `<span class="sub">${s}</span>` : ''}</a>`).join('');
    header.after(mnav);
    const mb = header.querySelector('.menu-btn');
    mb.onclick = () => { const o = mnav.classList.toggle('open'); mb.setAttribute('aria-expanded', o); mb.innerHTML = TR.icon(o ? 'x' : 'menu'); document.body.style.overflow = o ? 'hidden' : ''; };

    const footer = document.createElement('footer'); footer.className = 'site-footer';
    footer.innerHTML = `
      <div class="container">
        <div class="cols">
          <div><a class="brand" href="index.html">${TR.logoMark()}<span>오늘러닝</span></a>
            <p class="mt12">코스를 짜고, 사람을 모으고, 함께 안전하게 달리는 일을 한곳에서.</p></div>
          <div><h4>함께 달리기</h4><ul><li><a href="meetups.html">모임 찾기</a></li><li><a href="meetup-new.html">모임 만들기</a></li><li><a href="crews.html">크루 찾기</a></li><li><a href="crew-admin.html">크루 관리</a></li></ul></div>
          <div><h4>코스·도구</h4><ul><li><a href="courses.html">코스 찾기</a></li><li><a href="course-builder.html">코스 짜기</a></li><li><a href="tools.html">러닝 도구</a></li><li><a href="run.html">달리기 기록</a></li></ul></div>
          <div><h4>러너 매장</h4><ul><li><a href="stores.html">매장 찾기</a></li><li><a href="verify.html">오늘의 러닝 인증</a></li><li><a href="partner.html">입점 안내</a></li><li><a href="partner-center.html">파트너 센터</a></li></ul></div>
          <div><h4>안내</h4><ul><li><a href="guide.html">가이드·안전</a></li><li><a href="races.html">대회</a></li><li><a href="about.html">서비스 소개</a></li><li><a href="about.html#privacy">개인정보 처리 안내</a></li></ul></div>
        </div>
        <div class="copy"><span>© 2026 ㈜블랭크 · 오늘러닝</span><span>시범 화면 · 지도 © OpenStreetMap · 날씨 Open-Meteo</span></div>
      </div>`;
    body.appendChild(footer);

    const tab = document.createElement('nav'); tab.className = 'tabbar'; tab.setAttribute('aria-label', '하단 메뉴');
    const T = [['home', '홈', 'index.html', 'home'], ['meetups', '모임', 'meetups.html', 'users'], ['run', '달리기', 'run.html', 'run'], ['records', '기록', 'mypage.html#records', 'chart'], ['mypage', '마이', 'mypage.html', 'user']];
    tab.innerHTML = T.map(([id, t, h, ic]) => id === 'run'
      ? `<a href="${h}" class="run ${page === 'run' ? 'on' : ''}"><span class="r">${TR.icon(ic)}</span>${t}</a>`
      : `<a href="${h}" class="${(page === id || (id === 'home' && page === 'home') || (id === 'meetups' && nav === 'meetups')) ? 'on' : ''}">${TR.icon(ic)}${t}</a>`).join('');
    body.appendChild(tab);

    renderHeaderUser();
  }

  /* ---------------- 공통 카드 ---------------- */
  TR.ui = {
    meetCard(m) {
      const crew = m.crewId ? TR.data.crew(m.crewId) : null;
      const pct = Math.round((m.filled / m.cap) * 100);
      const full = m.filled >= m.cap;
      const kindCls = m.kind === '번개' ? 'blue' : m.kind === '입문' ? 'good' : '';
      return `<a class="card hover meet-card" href="meetup.html?id=${m.id}">
        <div class="top"><span class="when">${TR.fmt.rel(m.at)} · ${TR.fmt.date(m.at)} ${TR.fmt.hm(m.at)}</span><span class="chip ${kindCls}">${m.kind}</span></div>
        <h3>${TR.esc(m.title)}</h3>
        <div class="where">${TR.icon('pin', 'i14')} ${TR.esc(m.hubName || '')} · ${TR.esc(crew ? crew.name : (m.host || '개인'))}</div>
        <div class="groups">${m.groups.map((g) => `<span class="chip ${g.filled >= g.cap ? '' : 'point'}">${TR.esc(g.name)} ${g.pace}${g.filled >= g.cap ? ' 마감' : ''}</span>`).join('')}</div>
        <div class="row between small"><span class="muted">${m.distance}km · ${m.level}${m.beginner ? ' · 입문 환영' : ''}</span><b class="${full ? 'muted' : 'strong'}">${m.filled}/${m.cap}명</b></div>
        <div class="cap-bar"><span style="width:${pct}%"></span></div>
        ${m.mine ? `<span class="chip good">신청 완료 · ${TR.esc(m.mine.group)}그룹</span>` : ''}${m.cancelled ? '<span class="chip danger">운영진이 취소한 모임</span>' : ''}
      </a>`;
    },
    meetRow(m) {
      return `<a class="list-item" href="meetup.html?id=${m.id}">
        <div class="grow"><div class="title">${TR.esc(m.title)}</div><div class="meta">${TR.fmt.rel(m.at)} ${TR.fmt.hm(m.at)} · ${TR.esc(m.hubName || '')} · ${m.distance}km</div></div>
        <span class="chip ${m.filled >= m.cap ? '' : 'point'}">${m.filled}/${m.cap}</span></a>`;
    },
    storeCard(s, opt) {
      opt = opt || {};
      return `<a class="card hover store-card" href="store.html?id=${s.id}" data-id="${s.id}">
        <div class="row between"><span class="name">${TR.esc(s.name)}</span><span class="chip">${TR.esc(s.type)}</span></div>
        <div class="small muted">${TR.esc(s.hubName || '')} · ${TR.esc(s.status.label)}</div>
        <div class="benefit">${TR.icon('cup', 'i14')} ${TR.esc(s.benefit.title)}</div>
        <div class="row between"><span class="storage ${s.status.storage.cls}"><i></i>${s.status.storage.text}</span><span class="small muted">★ ${s.rating} (${s.reviews})</span></div>
        ${opt.amen ? `<div class="chips">${s.amen.map((a) => `<span class="chip">${a}</span>`).join('')}</div>` : ''}
      </a>`;
    },
    crewCard(c) {
      const hub = TR.data.hub(c.hubId) || {};
      return `<a class="card hover" href="crew.html?id=${c.id}" style="display:flex;flex-direction:column;gap:10px">
        <div class="row between"><div class="row"><span class="ico">${TR.icon('users')}</span><div><h3>${TR.esc(c.name)}</h3><div class="small muted">${TR.esc(hub.region || '')} · ${TR.esc(hub.name || '')}</div></div></div>${c.manner ? '<span class="chip good">매너 크루</span>' : ''}</div>
        <p class="small" style="color:var(--text)">${TR.esc(c.intro).slice(0, 70)}${c.intro.length > 70 ? '…' : ''}</p>
        <div class="row between small"><span class="muted">${TR.esc(c.schedule)} · ${c.paces}</span><b class="strong">${c.members}명</b></div>
        <div class="chips">${(c.tags || []).map((t) => `<span class="chip">${TR.esc(t)}</span>`).join('')}${c.beginner ? '<span class="chip point">입문 환영</span>' : ''}</div>
      </a>`;
    },
    empty(title, text, btn) { return `<div class="empty"><b>${title}</b>${text || ''}${btn ? `<div class="mt16">${btn}</div>` : ''}</div>`; },
    regionOptions(sel, withAll) { return (withAll ? '<option value="">전체 지역</option>' : '') + ['서울', '경기', '부산', '제주'].map((r) => `<option ${r === sel ? 'selected' : ''}>${r}</option>`).join(''); },
    hubOptions(region, sel, withAll) { return (withAll ? '<option value="">전체 장소</option>' : '') + TR.data.hubs().filter((h) => !region || h.region === region).map((h) => `<option value="${h.id}" ${h.id === sel ? 'selected' : ''}>${TR.esc(h.name)}</option>`).join(''); },
  };
  // .ics 캘린더 파일 내려받기
  TR.ics = function (title, start, minutes, place) {
    const f = (d) => `${d.getUTCFullYear()}${TR.pad(d.getUTCMonth() + 1)}${TR.pad(d.getUTCDate())}T${TR.pad(d.getUTCHours())}${TR.pad(d.getUTCMinutes())}00Z`;
    const end = new Date(start.getTime() + (minutes || 90) * 60000);
    const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//todayrunning//KO', 'BEGIN:VEVENT', `UID:${TR.uid()}@todayrunning`, `DTSTAMP:${f(new Date())}`, `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${title}`, `LOCATION:${place || ''}`, 'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    TR.download('오늘러닝-' + title.replace(/[^\w가-힣]+/g, '_') + '.ics', txt, 'text/calendar');
  };
  TR.download = function (name, text, type) {
    const blob = new Blob([text], { type: (type || 'text/plain') + ';charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  };
  TR.gpx = function (name, path) {
    const pts = path.map((p) => `      <trkpt lat="${p[0]}" lon="${p[1]}"></trkpt>`).join('\n');
    return `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="todayrunning" xmlns="http://www.topografix.com/GPX/1/1">\n  <metadata><name>${TR.esc(name)}</name></metadata>\n  <trk><name>${TR.esc(name)}</name><trkseg>\n${pts}\n  </trkseg></trk>\n</gpx>\n`;
  };
  TR.parseGpx = function (text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const pts = Array.from(doc.querySelectorAll('trkpt, rtept, wpt')).map((n) => [+n.getAttribute('lat'), +n.getAttribute('lon')]).filter((p) => isFinite(p[0]) && isFinite(p[1]));
    const nameEl = doc.querySelector('trk > name, metadata > name, name');
    const times = Array.from(doc.querySelectorAll('trkpt > time')).map((t) => new Date(t.textContent));
    return { name: nameEl ? nameEl.textContent : '', path: pts, start: times[0] || null, end: times[times.length - 1] || null };
  };

  // 페이지 안 아이콘 자리표시: <i data-ico="run"></i>
  TR.$$('[data-ico]').forEach((el) => { el.outerHTML = TR.icon(el.dataset.ico); });

  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); TR.installPrompt = e; });
  layout();
})();
