/* 달리기 (E-02 GPS 기록, E-03 페이스 미터, E-04 음성 안내, E-08 화면 꺼짐 방지, H-01 활동 저장,
   F-04 귀가 공유, F-05 도착 확인, F-06 공유 시간 제한, F-07 위치 감추기 구역, G-04 SOS, G-09 응급 정보) */
(function () {
  const { $, fmt } = TR;
  const S = { state: 'idle', pts: [], dist: 0, moving: 0, startAt: null, lastT: null, wid: null, tick: null, nextKm: 1, splits: [], lastSplitT: 0, recent: [], demo: false, demoTimer: null };

  /* ---------- 화면 ---------- */
  function draw() {
    $('#r-dist').textContent = S.dist.toFixed(2);
    $('#r-time').textContent = fmt.time(S.moving);
    $('#r-avg').textContent = S.dist > 0.05 ? fmt.pace(S.moving / S.dist) : "--'--\"";
    $('#r-splits').textContent = S.splits.length ? S.splits.map((s, i) => `${i + 1}km ${fmt.pace(s)}`).slice(-4).join(' · ') : '';
    const b = $('#r-btns');
    if (S.state === 'idle') b.innerHTML = '<button class="btn lg" id="r-start" style="grid-column:span 2">시작</button>';
    if (S.state === 'run') b.innerHTML = '<button class="btn lg line" id="r-pause">일시정지</button><button class="btn lg" id="r-stop" style="background:#fff;color:#15171A">종료</button>';
    if (S.state === 'pause') b.innerHTML = '<button class="btn lg" id="r-resume">계속</button><button class="btn lg" id="r-stop" style="background:#fff;color:#15171A">종료</button>';
    const on = (id, fn) => { const e = $('#' + id); if (e) e.onclick = fn; };
    on('r-start', start); on('r-pause', pause); on('r-resume', resume); on('r-stop', stop);
  }

  /* ---------- 지도 ---------- */
  let map = null, line = null, me = null;
  function mapPoint(p) {
    if (!map) { $('#r-map').classList.remove('hide'); map = TR.map.create($('#r-map'), { center: p, zoom: 16 }); if (!map) return; line = L.polyline([], { color: '#E8452C', weight: 5 }).addTo(map); me = L.circleMarker(p, { radius: 8, color: '#fff', weight: 3, fillColor: '#E8452C', fillOpacity: 1 }).addTo(map); }
    line.addLatLng(p); me.setLatLng(p); map.panTo(p, { animate: false });
  }

  /* ---------- 위치 처리 ---------- */
  function onPos(lat, lng, acc, t) {
    $('#r-gps').innerHTML = `<span class="pulse"></span>GPS 정확도 ${Math.round(acc)}m`;
    S.here = [lat, lng];
    if (S.state !== 'run') return;
    if (acc > 35) return; // 부정확한 점은 버림
    const p = [lat, lng, t];
    const last = S.pts[S.pts.length - 1];
    if (last) {
      const d = TR.dist(last, p), dt = (t - last[2]) / 1000;
      if (dt <= 0) return;
      const v = d * 1000 / dt;
      if (v > 12) return; // 순간 튐
      S.recent.push([d, dt]); if (S.recent.length > 6) S.recent.shift();
      const rd = S.recent.reduce((s, x) => s + x[0], 0), rt = S.recent.reduce((s, x) => s + x[1], 0);
      $('#r-pace').textContent = rd > 0.005 ? fmt.pace(rt / rd) : "--'--\"";
      S.dist += d;
      if (S.dist >= S.nextKm) {
        const split = S.moving - S.lastSplitT; S.splits.push(split); S.lastSplitT = S.moving;
        if ($('#o-voice').checked) TR.say(`${S.nextKm}킬로미터. 이번 구간 ${Math.floor(split / 60)}분 ${Math.round(split % 60)}초.`);
        TR.vibrate([150, 80, 150]); S.nextKm += 1;
      }
    }
    S.pts.push(p); mapPoint([lat, lng]);
  }
  function startWatch() {
    if (S.demo) return;
    if (!navigator.geolocation) { TR.toast('이 브라우저는 위치를 지원하지 않아요. 체험 모드로 둘러보세요'); return false; }
    S.wid = navigator.geolocation.watchPosition((pos) => onPos(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy, pos.timestamp),
      (err) => { $('#r-gps').textContent = err.code === 1 ? '위치 권한이 필요해요' : 'GPS 신호를 찾는 중'; if (err.code === 1) TR.toast('브라우저 설정에서 위치 권한을 허용해 주세요'); },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
    return true;
  }

  /* ---------- 체험 모드: 여의도 코스를 20배속으로 ---------- */
  function startDemo() {
    S.demo = true; $('#r-mode').textContent = '체험 모드 · 20배속';
    const path = TR.data.course('k1').path; let seg = 0, f = 0, t = Date.now();
    const speed = 1000 / 360 * 2; // 0.1초마다 2초씩: 6분/km를 20배속으로
    S.demoTimer = setInterval(() => {
      if (S.state !== 'run') return;
      let move = speed; t += 2000;
      while (move > 0 && seg < path.length - 1) {
        const a = path[seg], b = path[seg + 1]; const L1 = TR.dist(a, b) * 1000; const remain = L1 * (1 - f);
        if (move < remain) { f += move / L1; move = 0; } else { move -= remain; seg++; f = 0; }
      }
      if (seg >= path.length - 1) { seg = 0; f = 0; }
      const a = path[seg], b = path[seg + 1];
      onPos(a[0] + (b[0] - a[0]) * f + (Math.random() - .5) * 0.00002, a[1] + (b[1] - a[1]) * f, 6, t);
    }, 100);
  }

  /* ---------- 시작·정지 ---------- */
  function clock() { S.tick = setInterval(() => { if (S.state === 'run') { S.moving += S.demo ? 2 : 1; draw(); } }, S.demo ? 100 : 1000); }
  function start() {
    TR.audio();
    if (!S.demo && !startWatch()) return;
    S.state = 'run'; S.startAt = new Date(); clock();
    if ($('#o-wake').checked) TR.wake.on();
    if ($('#o-voice').checked) TR.say('달리기를 시작합니다');
    draw();
  }
  function pause() { S.state = 'pause'; S.recent = []; $('#r-pace').textContent = "--'--\""; draw(); TR.say('일시정지'); }
  function resume() { S.state = 'run'; const l = S.pts[S.pts.length - 1]; if (l) l[2] = Date.now(); draw(); TR.say('다시 시작'); }
  function stop() {
    S.state = 'pause'; draw();
    if (S.dist < 0.05) { TR.confirm('기록을 끝낼까요?', '50m보다 짧아서 저장하지 않아요.', '끝내기', reset); return; }
    const avg = S.moving / S.dist;
    TR.modal({
      title: '수고했어요!',
      html: `<div class="grid c3"><div class="result"><div class="k">거리</div><div class="v" style="font-size:28px">${S.dist.toFixed(2)}km</div></div><div class="result"><div class="k">시간</div><div class="v" style="font-size:28px">${fmt.time(S.moving)}</div></div><div class="result"><div class="k">평균 페이스</div><div class="v" style="font-size:28px">${fmt.pace(avg)}</div></div></div>
        ${S.splits.length ? `<div class="small mt16"><b class="strong">구간</b> ${S.splits.map((s, i) => `${i + 1}km ${fmt.pace(s)}`).join(' · ')}</div>` : ''}
        <label class="field mt16"><span>메모(선택)</span><input class="input" id="r-memo" placeholder="예: 바람이 많이 불었음"></label>
        ${S.demo ? '<p class="small warn-text mt8">체험 모드 기록은 ‘체험’으로 표시돼요.</p>' : ''}`,
      actions: [{ label: '버리기', cls: 'line', onClick: (c) => { c(); reset(); } }, {
        label: '저장', onClick: (c) => {
          const route = S.pts.filter((_, i) => i % Math.max(1, Math.ceil(S.pts.length / 400)) === 0).map((p) => [+p[0].toFixed(5), +p[1].toFixed(5)]);
          TR.records.add({ date: new Date().toISOString(), km: +S.dist.toFixed(2), sec: Math.round(S.moving), source: S.demo ? '체험' : '오늘러닝 웹', splits: S.splits.map(Math.round), memo: ($('#r-memo') || {}).value || '', route });
          c(); reset();
          TR.modal({ title: '기록을 저장했어요', html: '<p>근처 러너 프렌들리 매장에서 오늘의 러닝 인증 카드를 보여 주면 혜택을 받을 수 있어요.</p>', actions: [{ label: '닫기', cls: 'line' }, { label: '인증 카드 열기', onClick: () => { location.href = 'verify.html'; } }] });
        },
      }],
    });
  }
  function reset() {
    if (S.wid != null) navigator.geolocation.clearWatch(S.wid);
    clearInterval(S.tick); clearInterval(S.demoTimer); TR.wake.off();
    Object.assign(S, { state: 'idle', pts: [], dist: 0, moving: 0, startAt: null, wid: null, tick: null, nextKm: 1, splits: [], lastSplitT: 0, recent: [], demo: false });
    $('#r-mode').textContent = '자유 달리기'; $('#r-pace').textContent = "--'--\"";
    if (map) { map.remove(); map = null; $('#r-map').classList.add('hide'); }
    draw();
  }
  $('#r-demo').onclick = () => { if (S.state !== 'idle') return; startDemo(); start(); };
  window.addEventListener('beforeunload', (e) => { if (S.state !== 'idle') { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- SOS ---------- */
  const safety = () => TR.ls.get('safety', { contacts: [], hideRadius: 300, home: null, shareLimit: 120, card: {} });
  function where() { return S.here || (S.pts.length ? S.pts[S.pts.length - 1] : null); }
  $('#r-sos').onclick = () => {
    const sf = safety(); const u = TR.user.get();
    const go = (loc) => {
      const link = loc ? `https://map.kakao.com/link/map/${encodeURIComponent((u ? u.nick : '러너') + ' 위치')},${loc[0].toFixed(5)},${loc[1].toFixed(5)}` : '';
      const msg = `[오늘러닝 SOS] ${u ? u.nick : '러너'}입니다. 달리다가 도움이 필요해요.${link ? ' 지금 위치: ' + link : ''}`;
      const card = sf.card || {};
      TR.modal({
        title: '도움이 필요하세요?',
        html: `<div class="stack">
          <a class="btn danger block lg" href="tel:119">119 전화(구급·화재)</a>
          <a class="btn dark block lg" href="tel:112">112 전화(경찰)</a>
          ${sf.contacts.length ? sf.contacts.map((c) => `<a class="btn line block" href="sms:${encodeURIComponent(c.phone)}?&body=${encodeURIComponent(msg)}">${TR.esc(c.name)}에게 위치 문자 보내기</a>`).join('') : '<a class="btn line block" href="mypage.html#safety">비상 연락처 등록하기</a>'}
          ${link ? `<button class="btn ghost block" id="sos-copy">위치 링크 복사</button>` : '<p class="small muted">위치를 아직 못 잡았어요. 주변 건물이나 표지판을 알려 주세요.</p>'}
          ${card.note || card.name ? `<div class="notice gray small"><b>응급 정보</b><br>${TR.esc(card.name || '')} ${TR.esc(card.note || '')}</div>` : ''}
        </div>`,
        onOpen: () => { const c = $('#sos-copy'); if (c) c.onclick = () => TR.copy(msg); },
      });
      TR.vibrate([300, 100, 300]);
    };
    const l = where();
    if (l) go(l);
    else if (navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => go([p.coords.latitude, p.coords.longitude]), () => go(null), { enableHighAccuracy: true, timeout: 6000 });
    else go(null);
  };

  /* ---------- 귀가 공유 ---------- */
  const sf0 = safety();
  $('#sh-to').innerHTML = (sf0.contacts.length ? sf0.contacts.map((c, i) => `<option value="${i}">${TR.esc(c.name)} (${TR.esc(c.phone)})</option>`).join('') : '') + '<option value="link">링크만 만들기</option>';
  let share = TR.ss.get('share', null);
  function buildLink(arrived) {
    const u = TR.user.get(); const sf = safety();
    let loc = where();
    let blurred = false;
    if (loc && sf.home && TR.dist(loc, sf.home) * 1000 < (sf.hideRadius || 300)) { loc = [+loc[0].toFixed(2), +loc[1].toFixed(2)]; blurred = true; }
    const payload = { n: u ? u.nick : '러너', s: share.start, e: share.eta, t: new Date().toISOString(), a: arrived ? 1 : 0, b: blurred ? 1 : 0 };
    if (loc) { payload.la = +loc[0].toFixed(5); payload.lo = +loc[1].toFixed(5); }
    const url = new URL('share.html', location.href);
    url.hash = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    return url.toString();
  }
  function sendLink(arrived) {
    const url = buildLink(arrived);
    const u = TR.user.get();
    const text = arrived ? `[오늘러닝] ${u ? u.nick : ''} 무사히 도착했어요.` : `[오늘러닝 귀가 공유] ${u ? u.nick : ''}이(가) 달리기를 시작했어요. ${fmt.hm(share.eta)}쯤 도착 예정이에요. 위치 보기:`;
    const sel = $('#sh-to').value; const sf = safety();
    if (sel !== 'link' && sf.contacts[+sel]) { location.href = `sms:${encodeURIComponent(sf.contacts[+sel].phone)}?&body=${encodeURIComponent(text + ' ' + url)}`; }
    else TR.share('귀가 공유', text, url);
  }
  function drawShare() {
    const on = share && new Date(share.end) > new Date();
    if (share && !on) { share = null; TR.ss.set('share', null); }
    $('#sh-state').textContent = on ? `켜짐 · ${fmt.hm(share.eta)} 도착 예정` : '꺼짐';
    $('#sh-state').className = 'chip ' + (on ? 'good' : '');
    $('#sh-form').classList.toggle('hide', !!on);
    $('#sh-actions').innerHTML = on
      ? `<button class="btn" id="sh-resend">${TR.icon('share')}지금 위치 다시 보내기</button><button class="btn good" id="sh-arrive">${TR.icon('check')}도착했어요</button><button class="btn ghost" id="sh-off">끄기</button>`
      : `<button class="btn" id="sh-on">귀가 공유 켜기</button><a class="small muted" href="mypage.html#safety">받는 사람·집 주변 감추기 설정 →</a>`;
    const b = (id, fn) => { const e = $('#' + id); if (e) e.onclick = fn; };
    b('sh-on', () => {
      const getLoc = (cb) => navigator.geolocation ? navigator.geolocation.getCurrentPosition((p) => { S.here = [p.coords.latitude, p.coords.longitude]; cb(); }, cb, { enableHighAccuracy: true, timeout: 8000 }) : cb();
      getLoc(() => {
        const mins = +$('#sh-eta').value; const now = new Date();
        share = { start: now.toISOString(), eta: new Date(now.getTime() + mins * 60000).toISOString(), end: new Date(now.getTime() + (mins + (safety().shareLimit || 120)) * 60000).toISOString() };
        TR.ss.set('share', share); drawShare(); sendLink(false);
      });
    });
    b('sh-resend', () => sendLink(false));
    b('sh-arrive', () => { sendLink(true); share = null; TR.ss.set('share', null); drawShare(); TR.toast('귀가 공유를 마쳤어요'); });
    b('sh-off', () => { share = null; TR.ss.set('share', null); drawShare(); TR.toast('귀가 공유를 껐어요'); });
  }
  drawShare();

  /* ---------- 기록 직접 입력 ---------- */
  $('#manual').onclick = () => TR.user.require(() => {
    const today = new Date().toISOString().slice(0, 10);
    TR.modal({
      title: '기록 직접 입력',
      html: `<div class="form-grid"><label class="field"><span>날짜</span><input class="input" type="date" id="mn-date" value="${today}" max="${today}"></label><label class="field"><span>거리(km)</span><input class="input" type="number" id="mn-km" step="0.01" value="5"></label>
        <div class="field full"><span class="label">시간</span><div class="time-inputs"><input class="input" type="number" id="mn-h" value="0"><span>:</span><input class="input" type="number" id="mn-m" value="32"><span>:</span><input class="input" type="number" id="mn-s" value="0"></div></div>
        <label class="field full"><span>어디서 기록했나요</span><select class="select" id="mn-src"><option>워치(직접 입력)</option><option>트레드밀</option><option>기타</option></select></label></div>`,
      actions: [{ label: '취소', cls: 'line' }, { label: '저장', onClick: (c) => {
        const km = +$('#mn-km').value, sec = (+$('#mn-h').value) * 3600 + (+$('#mn-m').value) * 60 + (+$('#mn-s').value);
        if (!km || !sec) { TR.toast('거리와 시간을 입력해 주세요'); return false; }
        const d = new Date($('#mn-date').value + 'T' + TR.pad(new Date().getHours()) + ':' + TR.pad(new Date().getMinutes()));
        TR.records.add({ date: d.toISOString(), km, sec, source: '수기 · ' + $('#mn-src').value, manual: true, splits: [], route: [] });
        c(); TR.toast('기록을 저장했어요');
      } }],
    });
  }, '기록을 저장하려면 닉네임이 필요해요.');

  draw();
  if (location.hash === '#manual') setTimeout(() => $('#manual').click(), 300);
})();
