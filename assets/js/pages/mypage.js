/* 마이페이지 (L-01 내 홈, L-02 도구함, L-03 내 모임, L-04 내 크루, L-05 내 코스, L-06 내 기록, L-07 안전 설정, L-08 연결 관리,
   L-09 알림, L-10 프로필, L-11 계정, L-12 홈 화면에 추가, H-02 대시보드, H-04 데이터 관리, H-06 최고 기록, H-08 파일 가져오기, I-07 러닝화) */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  const u = TR.user.get();
  if (!u) {
    $('#my-wrap').innerHTML = `<div style="grid-column:1/-1">${ui.empty('로그인하면 어디서든 이어져요', '내 모임, 기록, 자주 쓰는 도구, 안전 설정을 웹·앱·워치 어디서 열어도 그대로 볼 수 있어요.', '<button class="btn lg" id="my-login">시작하기</button>')}</div>`;
    $('#my-login').onclick = () => TR.loginModal(() => location.reload());
    return;
  }
  $('#my-head').innerHTML = `<span class="eyebrow">My Page</span><div class="row mt8" style="gap:16px"><span class="ico" style="width:60px;height:60px;border-radius:30px;font-size:24px;font-weight:800">${TR.esc(u.nick.slice(0, 1))}</span><div><h1 style="font-size:28px">${TR.esc(u.nick)}님</h1><p style="margin-top:2px">${TR.esc(u.region)} · 편한 페이스 ${u.pace} · ${fmt.ymd(u.joined)} 시작</p></div></div>`;
  $('#side-title').textContent = u.nick;
  const TOOLS = { stopwatch: '스톱워치·랩', interval: '인터벌 타이머', pace: '페이스 계산기', predict: '기록 예측', band: '페이스 밴드', zones: '심박 구간', convert: '속도·트레드밀 환산', metronome: '케이던스 메트로놈', compass: '나침반', speed: '속도계·페이스 미터', weather: '날씨 한눈에' };
  const recs = () => TR.records.all();
  const weekStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
  const sections = {};

  /* ---------- 내 홈 ---------- */
  sections.home = (p) => {
    const ms = data.meetups().filter((m) => m.mine && !m.cancelled);
    const ws = weekStart(new Date()); const wk = recs().filter((r) => new Date(r.date) >= ws);
    const mon = recs().filter((r) => new Date(r.date).getMonth() === new Date().getMonth() && new Date(r.date).getFullYear() === new Date().getFullYear());
    const fav = TR.ls.get('toolFav', ['stopwatch', 'pace', 'interval']);
    const hub = data.hub(u.region === '경기' ? 'gwanggyo' : u.region === '부산' ? 'gwangalli' : 'yeouido');
    p.innerHTML = `<div class="grid c3">
        <div class="stat"><div class="k">이번 주</div><div class="v">${wk.reduce((s, r) => s + r.km, 0).toFixed(1)}<small>km</small></div><div class="d">${wk.length}번 달렸어요</div></div>
        <div class="stat"><div class="k">이번 달</div><div class="v">${mon.reduce((s, r) => s + r.km, 0).toFixed(1)}<small>km</small></div><div class="d">${mon.length}번</div></div>
        <div class="stat"><div class="k">신청한 모임</div><div class="v">${ms.length}<small>개</small></div><div class="d">${ms[0] ? `다음: ${fmt.rel(ms[0].at)} ${fmt.hm(ms[0].at)}` : '아직 없어요'}</div></div></div>
      <div class="grid c2 mt16" style="align-items:start">
        <div class="stack">
          <div>${ms[0] ? `<div class="small strong mb8">다음 모임</div>${ui.meetCard(ms[0])}` : ui.empty('신청한 모임이 없어요', '', '<a class="btn" href="meetups.html">모임 찾기</a>')}</div>
          <div class="card"><div class="row between"><h3>도구함</h3><a class="small muted" href="tools.html">도구 더 보기</a></div><div class="grid c2 mt12">${fav.map((id) => `<a class="btn line" href="tools.html#${id}" style="justify-content:flex-start">${TOOLS[id] || id}</a>`).join('') || '<p class="small muted">러닝 도구에서 ☆을 눌러 담아 보세요.</p>'}</div></div>
        </div>
        <div class="stack">
          <div class="card" id="my-wx"></div>
          <div class="grid c2"><a class="card hover" href="run.html"><span class="ico">${TR.icon('run')}</span><h3 class="mt12">달리기</h3><p class="small muted">GPS 기록·귀가 공유</p></a><a class="card hover" href="verify.html"><span class="ico">${TR.icon('qr')}</span><h3 class="mt12">인증 카드</h3><p class="small muted">혜택 ${TR.ls.get('benefits', []).length}번 받음</p></a></div>
        </div></div>`;
    TR.weatherCard($('#my-wx'), { lat: hub.lat, lng: hub.lng, name: hub.name, compact: true });
  };

  /* ---------- 내 모임 ---------- */
  sections.meetups = (p) => {
    const all = data.meetups();
    const mine = all.filter((m) => m.mine);
    const hosted = TR.ls.get('meetups', []);
    p.innerHTML = `<h2 style="font-size:20px">신청한 모임</h2><div class="list mt12">${mine.length ? mine.map((m) => `<div class="list-item"><div class="grow"><a class="title" href="meetup.html?id=${m.id}">${TR.esc(m.title)}</a><div class="meta">${fmt.dateTime(m.at)} · ${TR.esc(m.mine.group)}그룹 · ${m.mine.status}${m.cancelled ? ' · <span class="danger-text">운영진이 취소</span>' : ''}</div></div><button class="btn line sm" data-cancel="${m.id}">취소</button></div>`).join('') : '<div class="list-item small muted">신청한 모임이 없어요.</div>'}</div>
      <div class="row between mt32"><h2 style="font-size:20px">내가 연 모임</h2><a class="btn sm" href="meetup-new.html">${TR.icon('plus')}모임 열기</a></div>
      <div class="list mt12">${hosted.length ? hosted.map((h) => { const m = all.find((x) => x.id === h.id); return m ? `<div class="list-item"><div class="grow"><a class="title" href="meetup.html?id=${m.id}">${TR.esc(m.title)}</a><div class="meta">${m.weekday != null ? '매주 ' + fmt.weekday(m.weekday) + ' · ' : ''}${fmt.dateTime(m.at)} · 신청 ${m.filled}/${m.cap}</div></div><button class="btn line sm" data-link="${m.id}">${TR.icon('link')}링크</button><button class="btn ghost sm" data-del="${m.id}" aria-label="삭제">${TR.icon('trash')}</button></div>` : ''; }).join('') : '<div class="list-item small muted">연 모임이 없어요.</div>'}</div>`;
    $$('[data-cancel]').forEach((b) => b.onclick = () => TR.confirm('신청을 취소할까요?', '자리가 다음 대기자에게 넘어가요.', '신청 취소', () => { const a = TR.myApps(); delete a[b.dataset.cancel]; TR.ls.set('apps', a); show('meetups'); }));
    $$('[data-link]').forEach((b) => b.onclick = () => TR.copy(new URL(`meetup.html?id=${b.dataset.link}`, location.href).toString()));
    $$('[data-del]').forEach((b) => b.onclick = () => TR.confirm('모임을 삭제할까요?', '신청한 사람에게 취소 알림이 가요.', '삭제', () => { TR.ls.set('meetups', TR.ls.get('meetups', []).filter((x) => x.id !== b.dataset.del)); show('meetups'); }));
  };

  /* ---------- 내 크루 ---------- */
  sections.crews = (p) => {
    const joined = TR.ls.get('joined', {}); const ids = Object.keys(joined);
    const admin = u.adminCrew ? data.crew(u.adminCrew) : null;
    p.innerHTML = `${admin ? `<div class="card point mb16"><div class="row between wrap"><div><div class="small strong point-text">운영 중인 크루</div><h3 class="mt8">${TR.esc(admin.name)}</h3></div><a class="btn dark" href="crew-admin.html?crew=${admin.id}">운영 콘솔</a></div></div>` : ''}
      <h2 style="font-size:20px">가입한 크루</h2>
      <div class="grid c2 mt12">${ids.length ? ids.map((id) => { const c = data.crew(id); return c ? ui.crewCard(c).replace('</a>', `<span class="chip ${joined[id] === '대기' ? 'blue' : 'good'}">${joined[id] === '대기' ? '가입 확인 중' : '멤버'}</span></a>`) : ''; }).join('') : `<div style="grid-column:1/-1">${ui.empty('가입한 크루가 없어요', '', '<a class="btn" href="crews.html">크루 찾기</a>')}</div>`}</div>`;
  };

  /* ---------- 내 코스 ---------- */
  sections.courses = (p) => {
    const list = TR.ls.get('courses', []);
    p.innerHTML = `<div class="row between"><h2 style="font-size:20px">내 코스 ${list.length}개</h2><a class="btn sm" href="course-builder.html">${TR.icon('route')}코스 짜기</a></div>
      <div class="list mt12">${list.length ? list.map((k) => `<div class="list-item"><div class="grow"><a class="title" href="course.html?id=${k.id}">${TR.esc(k.name)}</a><div class="meta">${k.type} · ${TR.pathKm(k.path).toFixed(2)}km · ${TR.esc((data.hub(k.hubId) || {}).name || '')}</div></div><button class="btn line sm" data-gpx="${k.id}">${TR.icon('download')}GPX</button><button class="btn ghost sm" data-del="${k.id}" aria-label="삭제">${TR.icon('trash')}</button></div>`).join('') : '<div class="list-item small muted">저장한 코스가 없어요. 지도에서 직접 그려 보세요.</div>'}</div>`;
    $$('[data-gpx]').forEach((b) => b.onclick = () => { const k = list.find((x) => x.id === b.dataset.gpx); TR.download(`${k.name}.gpx`, TR.gpx(k.name, k.path), 'application/gpx+xml'); });
    $$('[data-del]').forEach((b) => b.onclick = () => TR.confirm('코스를 삭제할까요?', '', '삭제', () => { TR.ls.set('courses', list.filter((x) => x.id !== b.dataset.del)); show('courses'); }));
  };

  /* ---------- 내 기록 ---------- */
  sections.records = (p) => {
    const rs = recs();
    const weeks = []; const ws0 = weekStart(new Date());
    for (let i = 7; i >= 0; i--) { const a = new Date(ws0); a.setDate(a.getDate() - i * 7); const b = new Date(a); b.setDate(b.getDate() + 7); weeks.push([a, rs.filter((r) => new Date(r.date) >= a && new Date(r.date) < b).reduce((s, r) => s + r.km, 0)]); }
    const mx = Math.max(1, ...weeks.map((w) => w[1]));
    const long = rs.reduce((m, r) => (r.km > (m ? m.km : 0) ? r : m), null);
    const fast = rs.filter((r) => r.km >= 3).reduce((m, r) => (!m || r.sec / r.km < m.sec / m.km ? r : m), null);
    p.innerHTML = `<div class="grid c3"><div class="stat"><div class="k">전체</div><div class="v">${rs.reduce((s, r) => s + r.km, 0).toFixed(1)}<small>km</small></div><div class="d">${rs.length}번</div></div>
        <div class="stat"><div class="k">가장 길게</div><div class="v">${long ? long.km.toFixed(1) : '-'}<small>km</small></div><div class="d">${long ? fmt.ymd(long.date) : ''}</div></div>
        <div class="stat"><div class="k">가장 빠른 평균(3km+)</div><div class="v" style="font-size:24px">${fast ? fmt.pace(fast.sec / fast.km) : '-'}</div><div class="d">${fast ? fast.km.toFixed(1) + 'km · ' + fmt.ymd(fast.date) : ''}</div></div></div>
      <div class="card mt16"><h3>주간 거리(최근 8주)</h3><div class="bars mt12">${weeks.map(([a, v]) => `<div class="b ${v ? '' : 'zero'}"><em>${v ? v.toFixed(1) : ''}</em><i style="height:${v / mx * 100}%"></i><span>${a.getMonth() + 1}/${a.getDate()}</span></div>`).join('')}</div></div>
      <div class="row between wrap mt24"><h3>기록 ${rs.length}개</h3><div class="row wrap"><a class="btn sm" href="run.html#manual">${TR.icon('plus')}직접 입력</a><label class="btn line sm">${TR.icon('download')}GPX 가져오기<input type="file" id="imp-gpx" accept=".gpx" hidden></label><button class="btn line sm" id="exp-csv">CSV 내보내기</button></div></div>
      <div class="table-wrap mt12"><table class="table"><thead><tr><th>날짜</th><th class="num">거리</th><th class="num">시간</th><th class="num">페이스</th><th>출처</th><th></th></tr></thead><tbody>
        ${rs.length ? rs.map((r) => `<tr><td>${fmt.date(r.date)} ${fmt.hm(r.date)}</td><td class="num strong">${r.km.toFixed(2)}km</td><td class="num">${fmt.time(r.sec)}</td><td class="num">${fmt.pace(r.sec / r.km)}</td><td class="small">${TR.esc(r.source)}${r.manual ? ' <span class="chip">수기</span>' : ''}</td><td><button class="btn ghost sm" data-rm="${r.id}" aria-label="삭제">${TR.icon('trash')}</button></td></tr>`).join('') : '<tr><td colspan="6" class="muted">아직 기록이 없어요. <a class="point-text" href="run.html">달리기</a>에서 시작하거나 GPX 파일을 가져오세요.</td></tr>'}
      </tbody></table></div>
      <p class="xsmall muted mt8">애플 건강·헬스 커넥트·가민 기록을 자동으로 가져오는 기능은 앱 출시와 함께 열려요. 지금은 워치 앱에서 GPX를 내려받아 가져올 수 있어요.</p>`;
    $$('[data-rm]').forEach((b) => b.onclick = () => TR.confirm('기록을 삭제할까요?', '삭제한 기록은 되돌릴 수 없어요.', '삭제', () => { TR.records.remove(b.dataset.rm); show('records'); }));
    $('#exp-csv').onclick = () => TR.download('오늘러닝-기록.csv', '﻿날짜,거리(km),시간(초),평균 페이스,출처\n' + rs.map((r) => `${new Date(r.date).toISOString()},${r.km},${r.sec},${fmt.pace(r.sec / r.km).replace('"', '')},${r.source}`).join('\n'), 'text/csv');
    $('#imp-gpx').onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return;
      const g = TR.parseGpx(await f.text());
      if (g.path.length < 2) { TR.toast('GPX에서 경로를 찾지 못했어요'); return; }
      const km = TR.pathKm(g.path); const sec = g.start && g.end ? Math.round((g.end - g.start) / 1000) : Math.round(km * 360);
      TR.records.add({ date: (g.start || new Date()).toISOString(), km: +km.toFixed(2), sec, source: 'GPX 가져오기', route: g.path.filter((_, i) => i % Math.max(1, Math.ceil(g.path.length / 400)) === 0), splits: [] });
      TR.toast(`${km.toFixed(2)}km 기록을 가져왔어요`); show('records');
    };
  };

  /* ---------- 러닝화 ---------- */
  sections.shoes = (p) => {
    const shoes = TR.ls.get('shoes', []);
    const used = (s) => s.base + recs().filter((r) => s.main && new Date(r.date) >= new Date(s.since)).reduce((a, r) => a + r.km, 0) + (s.extra || 0);
    p.innerHTML = `<div class="row between"><h2 style="font-size:20px">러닝화</h2><button class="btn sm" id="sh-add">${TR.icon('plus')}추가</button></div>
      <p class="small muted mt8">‘주로 신는 신발’로 정하면 그 뒤 기록이 자동으로 더해져요. 보통 500~800km쯤 달리면 쿠션이 줄어요.</p>
      <div class="list mt12">${shoes.length ? shoes.map((s, i) => { const km = used(s); const pct = Math.min(100, km / 700 * 100); return `<div class="list-item"><div class="grow"><div class="title">${TR.esc(s.name)} ${s.main ? '<span class="chip point">주로 신는 신발</span>' : ''}</div><div class="meta">${km.toFixed(0)}km 달림 · ${fmt.ymd(s.since)}부터</div><div class="cap-bar mt8"><span style="width:${pct}%;background:${km > 600 ? 'var(--danger)' : 'var(--point)'}"></span></div>${km > 600 ? '<div class="xsmall danger-text mt8">교체를 생각해 볼 때예요.</div>' : ''}</div><button class="btn line sm" data-main="${i}">${s.main ? '기본' : '기본으로'}</button><button class="btn ghost sm" data-del="${i}" aria-label="삭제">${TR.icon('trash')}</button></div>`; }).join('') : '<div class="list-item small muted">등록한 러닝화가 없어요.</div>'}</div>`;
    $('#sh-add').onclick = () => TR.modal({ title: '러닝화 추가', html: `<label class="field"><span>이름</span><input class="input" id="s-n" placeholder="예: 데일리 트레이너"></label><label class="field mt16"><span>이미 달린 거리(km)</span><input class="input" type="number" id="s-b" value="0"></label>`,
      actions: [{ label: '취소', cls: 'line' }, { label: '추가', onClick: (c) => { const n = $('#s-n').value.trim(); if (!n) return false; shoes.forEach((x) => { x.main = false; }); shoes.push({ name: n, base: +$('#s-b').value || 0, since: new Date().toISOString(), main: true }); TR.ls.set('shoes', shoes); c(); show('shoes'); } }] });
    $$('[data-main]').forEach((b) => b.onclick = () => { shoes.forEach((x, i) => { x.main = i === +b.dataset.main; }); TR.ls.set('shoes', shoes); show('shoes'); });
    $$('[data-del]').forEach((b) => b.onclick = () => { shoes.splice(+b.dataset.del, 1); TR.ls.set('shoes', shoes); show('shoes'); });
  };

  /* ---------- 안전 설정 ---------- */
  sections.safety = (p) => {
    const sf = TR.ls.get('safety', { contacts: [], hideRadius: 300, home: null, shareLimit: 120, card: {} });
    const save = () => TR.ls.set('safety', sf);
    p.innerHTML = `<div class="card"><h3>비상 연락처</h3><p class="small muted mt8">귀가 공유를 받을 사람이자, SOS를 누르면 위치 문자를 보낼 사람이에요.</p>
        <div id="ct-list" class="mt12"></div>
        <div class="row wrap mt12"><input class="input sm" id="ct-n" placeholder="이름(예: 엄마)" style="width:150px"><input class="input sm" id="ct-p" type="tel" placeholder="010-0000-0000" style="width:170px"><button class="btn sm" id="ct-add">추가</button></div></div>
      <div class="card mt16"><h3>집 주변 위치 감추기</h3><p class="small muted mt8">집 근처에서는 귀가 공유와 기록 지도에 정확한 위치 대신 대략적인 위치만 보여요.</p>
        <div class="row wrap mt12"><select class="select sm" id="hz-r" style="width:auto">${[200, 300, 500, 800].map((r) => `<option value="${r}" ${r === sf.hideRadius ? 'selected' : ''}>반경 ${r}m</option>`).join('')}</select>
        <button class="btn line sm" id="hz-set">${TR.icon('pin')}지금 위치를 집으로</button>${sf.home ? '<button class="btn ghost sm" id="hz-clear">지우기</button>' : ''}</div>
        <p class="small mt8" id="hz-st">${sf.home ? '<span class="good-text strong">집 위치가 설정돼 있어요.</span> 좌표는 이 기기에만 저장돼요.' : '<span class="muted">아직 설정하지 않았어요.</span>'}</p></div>
      <div class="card mt16"><h3>귀가 공유 자동 종료</h3><p class="small muted mt8">도착 예정 시간에서 이만큼 지나면 공유가 자동으로 꺼져요.</p>
        <select class="select sm mt12" id="sl" style="width:auto">${[[60, '1시간'], [120, '2시간'], [180, '3시간']].map(([v, t]) => `<option value="${v}" ${v === sf.shareLimit ? 'selected' : ''}>${t} 뒤</option>`).join('')}</select></div>
      <div class="card mt16"><h3>응급 정보 카드</h3><p class="small muted mt8">SOS 화면에 함께 보여요. 원하는 만큼만 적으세요. 이 기기에만 저장돼요.</p>
        <div class="form-grid mt12"><label class="field"><span>이름</span><input class="input" id="ec-n" value="${TR.esc(sf.card.name || '')}"></label><label class="field"><span>메모</span><input class="input" id="ec-m" value="${TR.esc(sf.card.note || '')}" placeholder="예: 비상시 가족 연락 부탁"></label></div>
        <button class="btn sm mt12" id="ec-save">저장</button></div>`;
    const drawCt = () => { $('#ct-list').innerHTML = sf.contacts.length ? sf.contacts.map((c, i) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line2)"><span><b class="strong">${TR.esc(c.name)}</b> <span class="muted">${TR.esc(c.phone)}</span></span><button class="btn ghost sm" data-ci="${i}">${TR.icon('trash')}</button></div>`).join('') : '<p class="small muted">등록한 연락처가 없어요.</p>'; $$('[data-ci]').forEach((b) => b.onclick = () => { sf.contacts.splice(+b.dataset.ci, 1); save(); drawCt(); }); };
    drawCt();
    $('#ct-add').onclick = () => { const n = $('#ct-n').value.trim(), ph = $('#ct-p').value.trim(); if (!n || !/^[0-9+\-\s]{8,}$/.test(ph)) { TR.toast('이름과 전화번호를 확인해 주세요'); return; } sf.contacts.push({ name: n, phone: ph }); save(); $('#ct-n').value = ''; $('#ct-p').value = ''; drawCt(); };
    $('#hz-r').onchange = (e) => { sf.hideRadius = +e.target.value; save(); TR.toast('저장했어요'); };
    $('#hz-set').onclick = () => navigator.geolocation ? navigator.geolocation.getCurrentPosition((pp) => { sf.home = [+pp.coords.latitude.toFixed(5), +pp.coords.longitude.toFixed(5)]; save(); show('safety'); TR.toast('집 위치를 설정했어요'); }, () => TR.toast('위치 권한을 허용해 주세요'), { enableHighAccuracy: true, timeout: 10000 }) : TR.toast('이 브라우저는 위치를 지원하지 않아요');
    const hc = $('#hz-clear'); if (hc) hc.onclick = () => { sf.home = null; save(); show('safety'); };
    $('#sl').onchange = (e) => { sf.shareLimit = +e.target.value; save(); TR.toast('저장했어요'); };
    $('#ec-save').onclick = () => { sf.card = { name: $('#ec-n').value.trim(), note: $('#ec-m').value.trim() }; save(); TR.toast('응급 정보를 저장했어요'); };
  };

  /* ---------- 기기 연결 ---------- */
  sections.connect = (p) => {
    const rows = [
      ['애플 건강(HealthKit)', '아이폰 운동 기록 가져오기·저장', '1단계 앱(2027년 5월 말)', 'heart'],
      ['헬스 커넥트(안드로이드)', '갤럭시·픽셀 등 운동 기록과 경로', '1단계 앱(2027년 5월 말)', 'heart'],
      ['캘린더', '신청한 모임을 내 캘린더에', '지금 가능: 모임 상세의 ‘캘린더에 추가’', 'cal'],
      ['애플워치·갤럭시워치 앱', '손목에서 그룹 간격·SOS·출석', '2단계(2027년 9월)', 'watch'],
      ['가민', '기록 가져오기, 코스·훈련 보내기', '2단계(2027년 9월)', 'watch'],
      ['삼성 헬스', '삼성 헬스 데이터 직접 연동', '2단계(2027년 9월)', 'heart'],
      ['Strava로 올리기', '오늘러닝 기록을 내 Strava에 업로드', '2단계(2027년 9월)', 'share'],
      ['블루투스 심박계·풋팟', '앱에서 센서 직접 연결', '2단계(2027년 9월)', 'heart'],
      ['코로스·폴라 등', '제조사 파트너 API', '3단계(2027년 10월~)', 'watch'],
      ['GPX 파일', '워치 앱에서 내려받은 기록 가져오기', '지금 가능: 내 기록 → GPX 가져오기', 'download'],
    ];
    p.innerHTML = `<p class="small muted mb16">쓰던 워치와 건강 앱은 그대로 두세요. 오늘러닝은 기록을 가져와 모임·인증·훈련에 이어 줘요. 연결은 언제든 끊을 수 있고, 무엇을 가져올지 항목별로 고를 수 있어요.</p>
      <div class="list">${rows.map(([n, d, st, ic]) => `<div class="list-item"><span class="ico gray">${TR.icon(ic)}</span><div class="grow"><div class="title">${n}</div><div class="meta">${d}</div></div><span class="chip ${st.startsWith('지금') ? 'good' : ''}">${st}</span></div>`).join('')}</div>`;
  };

  /* ---------- 알림 ---------- */
  sections.notify = (p) => {
    const nt = TR.ls.get('notify', { before: true, deadline: true, notice: true, race: true, store: false, weather: true });
    const L2 = [['before', '모임 2시간 전 알림'], ['deadline', '대기 중인 모임에 자리가 났을 때'], ['notice', '크루 공지'], ['race', '관심 대회 접수 시작·마감 사흘 전'], ['store', '소식 받는 매장의 새 소식·이벤트'], ['weather', '내 모임의 날씨 기준이 ‘주의’ 이상일 때']];
    p.innerHTML = `<div class="list">${L2.map(([k, t]) => `<label class="list-item" style="cursor:pointer"><div class="grow"><div class="title">${t}</div></div><span class="switch"><input type="checkbox" data-k="${k}" ${nt[k] ? 'checked' : ''}><span></span></span></label>`).join('')}</div>
      <div class="card soft mt16"><h3>브라우저 알림</h3><p class="small muted mt8">웹에서도 알림을 받으려면 브라우저 알림을 허용해 주세요. 앱을 설치하면 앱 알림으로 받아요.</p><button class="btn line sm mt12" id="nt-perm">알림 허용하기</button><span class="small muted" id="nt-st"></span></div>`;
    $$('[data-k]').forEach((i) => i.onchange = () => { nt[i.dataset.k] = i.checked; TR.ls.set('notify', nt); });
    const st = () => { $('#nt-st').textContent = 'Notification' in window ? ` 현재: ${({ granted: '허용됨', denied: '차단됨', default: '묻기 전' })[Notification.permission]}` : ' 이 브라우저는 알림을 지원하지 않아요'; };
    st(); $('#nt-perm').onclick = async () => { if ('Notification' in window) { await Notification.requestPermission(); st(); if (Notification.permission === 'granted') new Notification('오늘러닝', { body: '이제 모임 알림을 받을 수 있어요.' }); } };
  };

  /* ---------- 계정 ---------- */
  sections.account = (p) => {
    p.innerHTML = `<div class="card"><h3>프로필</h3>
        <div class="form-grid mt12"><label class="field"><span>닉네임</span><input class="input" id="pf-n" value="${TR.esc(u.nick)}" maxlength="12"></label>
        <label class="field"><span>지역</span><select class="select" id="pf-r">${['서울', '경기', '부산', '그 외'].map((r) => `<option ${r === u.region ? 'selected' : ''}>${r}</option>`).join('')}</select></label>
        <label class="field"><span>편한 페이스</span><input class="input" id="pf-p" value="${TR.esc(u.pace)}"></label>
        <label class="field"><span>기록 공개 범위</span><select class="select" id="pf-v">${['나만', '같은 크루', '전체'].map((r) => `<option ${r === (u.visible || '같은 크루') ? 'selected' : ''}>${r}</option>`).join('')}</select></label></div>
        <button class="btn sm mt12" id="pf-save">저장</button></div>
      <div class="card mt16"><h3>홈 화면에 추가</h3><p class="small muted mt8">앱처럼 바로 열 수 있어요. 아이폰은 사파리 공유 버튼 → ‘홈 화면에 추가’를 눌러 주세요.</p><button class="btn line sm mt12" id="a2hs">홈 화면에 추가</button></div>
      <div class="card mt16"><h3>내 데이터</h3><p class="small muted mt8">시범 버전에서 입력한 모든 내용은 이 브라우저에만 있어요. 파일로 내려받거나 모두 지울 수 있어요.</p>
        <div class="row wrap mt12"><button class="btn line sm" id="dl-all">${TR.icon('download')}내 데이터 내려받기(JSON)</button><button class="btn line sm" id="logout">로그아웃</button><button class="btn danger sm" id="wipe">모두 지우기</button></div></div>`;
    $('#pf-save').onclick = () => { const n = $('#pf-n').value.trim(); if (!n) return; Object.assign(u, { nick: n, region: $('#pf-r').value, pace: isFinite(TR.parsePace($('#pf-p').value)) && TR.parsePace($('#pf-p').value) > 120 ? TR.fmt.pace(TR.parsePace($('#pf-p').value)) : u.pace, visible: $('#pf-v').value }); TR.user.set(u); TR.toast('저장했어요'); setTimeout(() => location.reload(), 500); };
    $('#a2hs').onclick = async () => { if (TR.installPrompt) { TR.installPrompt.prompt(); await TR.installPrompt.userChoice; TR.installPrompt = null; } else TR.toast('브라우저 메뉴에서 ‘홈 화면에 추가’를 눌러 주세요'); };
    $('#dl-all').onclick = () => { const out = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('tr.')) { try { out[k.slice(3)] = JSON.parse(localStorage.getItem(k)); } catch (e) { /* 무시 */ } } } TR.download('오늘러닝-내데이터.json', JSON.stringify(out, null, 2), 'application/json'); };
    $('#logout').onclick = () => TR.confirm('로그아웃할까요?', '기록과 설정은 이 브라우저에 남아요.', '로그아웃', () => TR.user.logout());
    $('#wipe').onclick = () => TR.confirm('모두 지울까요?', '모임 신청, 기록, 코스, 설정이 모두 사라지고 되돌릴 수 없어요.', '모두 지우기', () => { Object.keys(localStorage).filter((k) => k.startsWith('tr.')).forEach((k) => localStorage.removeItem(k)); location.href = 'index.html'; });
  };

  function show(sec) {
    $$('#side button').forEach((b) => b.classList.toggle('on', b.dataset.s === sec));
    sections[sec]($('#panel'));
  }
  $$('#side button').forEach((b) => b.onclick = () => { history.replaceState(null, '', '#' + b.dataset.s); show(b.dataset.s); });
  window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (sections[h]) show(h); });
  show(sections[location.hash.slice(1)] ? location.hash.slice(1) : 'home');
})();
