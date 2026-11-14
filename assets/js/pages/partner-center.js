/* 매장 파트너 센터 (P-06 오늘 현황, P-07 인증 확인, P-08 혜택 설정, P-09 보관 관리, P-10 영업 정보, P-11 보관 예약 처리,
   P-13 방문 리포트, P-14 지도·코스 노출, P-15 홍보물, P-16 소식, P-17 매장 주최 런, P-18 크루 제휴, P-20 운영팀 소통, P-22 후기 답글) */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  const app = TR.ls.get('application', null);
  let sid = TR.qs('store') || TR.ls.get('partnerStore', 's3');
  if (!data.store(sid)) sid = 's3';
  $('#pc-store').innerHTML = data.stores().map((s) => `<option value="${s.id}" ${s.id === sid ? 'selected' : ''}>${TR.esc(s.name)}</option>`).join('');
  $('#pc-store').onchange = () => { TR.ls.set('partnerStore', $('#pc-store').value); location.href = `partner-center.html?store=${$('#pc-store').value}${location.hash}`; };
  const S = () => data.store(sid);
  $('#pc-title').textContent = `${S().name} 파트너 센터`;
  $('#side-title').textContent = S().name;

  // 매장 설정 덮어쓰기(storeOv)
  function patch(fn) { const ov = TR.ls.get('storeOv', {}); ov[sid] = ov[sid] || {}; fn(ov[sid], S()); TR.ls.set('storeOv', ov); }
  const visits = () => TR.ls.get('visits', {})[sid] || [];
  function addVisit(v) { const all = TR.ls.get('visits', {}); (all[sid] = all[sid] || []).push(v); TR.ls.set('visits', all); }

  const sections = {};
  /* ---------- 오늘 현황 ---------- */
  sections.today = (p) => {
    const s = S(); const today = visits().filter((v) => new Date(v.at).toDateString() === new Date().toDateString());
    const base = 18;
    p.innerHTML = `${app ? `<div class="notice small mb16"><b>${TR.esc(app.name)}</b> 입점 신청 상태: <b>${TR.esc(app.status)}</b>. 아래는 예시 매장으로 둘러보는 화면이에요.</div>` : ''}
      <div class="grid c4">
        <div class="stat"><div class="k">오늘 인증 방문</div><div class="v">${base + today.length}<small>명</small></div><div class="d">예시 ${base} + 이 화면 ${today.length}</div></div>
        <div class="stat"><div class="k">혜택 사용</div><div class="v">${15 + today.length}<small>건</small></div><div class="d">${TR.esc(s.benefit.title)}</div></div>
        <div class="stat"><div class="k">보관 중</div><div class="v">${s.storage.used}<small>/${s.storage.cap}</small></div><div class="d"><span class="storage ${s.status.storage.cls}"><i></i>${s.status.storage.text}</span></div></div>
        <div class="stat"><div class="k">이번 주 방문</div><div class="v">96<small>명</small></div><div class="d">지난주 81명</div></div>
      </div>
      <div class="card mt16"><h3>지금 보관 상태</h3><p class="small muted mt8">바쁜 시간엔 한 번에 바꾸세요. 지도와 매장 페이지에 바로 반영돼요.</p>
        <div class="row wrap mt12"><button class="btn ${s.status.storage.cls === 'ok' ? '' : 'line'}" data-q="ok">보관 가능</button><button class="btn ${s.storage.used >= s.storage.cap ? 'danger' : 'line'}" data-q="full">만석</button><button class="btn ${s.storage.paused ? 'dark' : 'line'}" data-q="pause">${s.storage.paused ? '보관 다시 받기' : '잠시 중단'}</button></div></div>
      <div class="grid c2 mt16"><div class="card"><h3>최근 인증</h3><div class="mt8" id="recent"></div></div>
        <div class="card"><h3>오늘 예약</h3><div class="mt8" id="today-res"></div></div></div>`;
    $$('[data-q]').forEach((b) => b.onclick = () => {
      patch((o, st) => { o.storage = Object.assign({}, st.storage, o.storage || {}); if (b.dataset.q === 'ok') { o.storage.paused = false; if (o.storage.used >= o.storage.cap) o.storage.used = o.storage.cap - 1; } if (b.dataset.q === 'full') { o.storage.used = o.storage.cap; o.storage.paused = false; } if (b.dataset.q === 'pause') o.storage.paused = !st.storage.paused; });
      TR.toast('지도에 반영했어요'); show('today');
    });
    const r = visits().slice(-5).reverse();
    $('#recent').innerHTML = r.length ? r.map((v) => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line2)"><span>${TR.esc(v.nick)} · ${v.km.toFixed(1)}km</span><span class="muted">${fmt.hm(v.at)}</span></div>`).join('') : '<p class="small muted">아직 없어요. ‘인증 확인’에서 러너의 카드를 스캔해 보세요.</p>';
    const res = TR.ls.get('reservations', []).filter((x) => x.store === sid && x.status === '예약');
    $('#today-res').innerHTML = res.length ? res.map((x) => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line2)"><span>${x.time} · ${TR.esc(x.nick)} · ${TR.esc(x.size)}</span><b>${x.no}</b></div>`).join('') : '<p class="small muted">예약이 없어요.</p>';
  };

  /* ---------- 인증 확인 ---------- */
  let stream = null, scanTimer = null;
  function stopCam() { clearInterval(scanTimer); if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; }
  sections.scan = (p) => {
    p.innerHTML = `<div class="grid c2" style="align-items:start">
      <div class="card"><h3>카드 스캔</h3><p class="small muted mt8">러너의 오늘의 러닝 인증 카드 QR을 비추세요.</p>
        <video id="cam" playsinline muted style="width:100%;border-radius:12px;background:#111;margin-top:12px;display:none;aspect-ratio:1"></video>
        <button class="btn block mt12" id="cam-on">${TR.icon('qr')}카메라로 스캔</button>
        <p class="xsmall muted mt8" id="cam-msg">카메라 스캔이 안 되는 기기라면 휴대폰 기본 카메라로 QR을 찍어도 이 화면이 열려요.</p></div>
      <div class="card"><h3>숫자로 확인</h3><p class="small muted mt8">카드 아래 6자리 숫자를 입력하세요.</p>
        <div class="row mt12"><input class="input" id="code" inputmode="numeric" maxlength="6" placeholder="000000" style="letter-spacing:.3em;text-align:center;font-weight:800"><button class="btn" id="code-go">확인</button></div>
        <p class="xsmall muted mt8">시범 버전에서는 같은 브라우저에서 만든 카드만 숫자로 확인할 수 있어요.</p></div></div>
      <div id="result" class="mt16"></div>`;
    $('#cam-on').onclick = async () => {
      if (!('BarcodeDetector' in window)) { $('#cam-msg').textContent = '이 브라우저는 카메라 스캔을 지원하지 않아요. 휴대폰 기본 카메라로 QR을 찍으면 결과 화면이 열려요.'; return; }
      try {
        const det = new window.BarcodeDetector({ formats: ['qr_code'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const v = $('#cam'); v.srcObject = stream; v.style.display = 'block'; await v.play();
        scanTimer = setInterval(async () => { try { const r = await det.detect(v); if (r[0]) { const m = r[0].rawValue.match(/scan=([^&]+)/); if (m) { stopCam(); v.style.display = 'none'; verify(m[1]); } } } catch (e) { /* 무시 */ } }, 400);
      } catch (e) { $('#cam-msg').textContent = '카메라 권한을 허용해 주세요.'; }
    };
    $('#code-go').onclick = () => {
      const u = TR.user.get(); const v = $('#code').value.trim();
      if (u && TR.checkCode('vf:' + u.id, v)) {
        const rec = TR.records.today()[0];
        verifyObj({ n: u.nick, u: u.id, km: rec ? rec.km : 0, e: rec ? rec.date : new Date().toISOString(), s: rec ? (rec.manual ? '수기 입력' : rec.source) : '기록 없음', c: v });
      } else $('#result').innerHTML = '<div class="notice danger"><b>확인되지 않는 코드예요.</b> 러너 화면의 최신 숫자를 다시 확인해 주세요. 30초마다 바뀌어요.</div>';
    };
    const m = location.hash.match(/scan=([^&]+)/); if (m) verify(m[1]);
  };
  function verify(b64) {
    let d = null; try { d = JSON.parse(decodeURIComponent(escape(atob(b64)))); } catch (e) { d = null; }
    if (!d) { $('#result').innerHTML = '<div class="notice danger"><b>읽을 수 없는 카드예요.</b></div>'; return; }
    if (!TR.checkCode('vf:' + d.u, d.c)) { $('#result').innerHTML = `<div class="notice danger"><b>만료된 카드예요.</b> ${TR.esc(d.n)}님에게 카드 화면을 다시 열어 달라고 해 주세요. 캡처한 화면이면 이렇게 보여요.</div>`; return; }
    verifyObj(d);
  }
  function verifyObj(d) {
    const s = S(); const need = +((s.benefit.cond.match(/([\d.]+)\s*km/) || [])[1] || 0);
    const isToday = new Date(d.e).toDateString() === new Date().toDateString();
    const ok = isToday && d.km >= need && d.km > 0;
    const usedToday = visits().some((v) => v.uid === d.u && new Date(v.at).toDateString() === new Date().toDateString());
    $('#result').innerHTML = `<div class="card" style="border-width:2px;border-color:${ok ? 'var(--good)' : 'var(--danger)'}">
      <div class="row between wrap"><div><div class="small muted">러너</div><div style="font-size:22px;font-weight:800;color:var(--ink)">${TR.esc(d.n)}</div></div>
        <span class="chip ${ok ? 'good' : 'danger'}" style="height:34px;font-size:15px">${ok ? '조건 충족' : '조건 미충족'}</span></div>
      <dl class="kv mt12"><dt>오늘 거리</dt><dd>${(+d.km).toFixed(2)}km ${need ? `(필요 ${need}km)` : ''}</dd><dt>기록 시각</dt><dd>${fmt.dateTime(d.e)}${isToday ? '' : ' · 오늘 기록 아님'}</dd><dt>기록 출처</dt><dd>${TR.esc(d.s)}</dd></dl>
      ${usedToday ? '<div class="notice warn small mt12">오늘 이미 혜택을 받은 러너예요.</div>' : ok ? `<button class="btn good block lg mt16" id="apply-b">${TR.esc(s.benefit.title)} 적용</button>` : ''}
    </div>`;
    const b = $('#apply-b'); if (b) b.onclick = () => { addVisit({ uid: d.u, nick: d.n, km: +d.km, at: new Date().toISOString() }); TR.toast('혜택을 적용했어요'); b.outerHTML = '<div class="notice good mt16"><b>적용 완료.</b> 방문 리포트에 기록됐어요.</div>'; };
  }

  /* ---------- 보관 관리 ---------- */
  sections.storage = (p) => {
    const s = S();
    p.innerHTML = `<div class="grid c2" style="align-items:start">
      <div class="card center"><h3>지금 보관 중</h3><div class="counter mt16"><button id="st-minus" aria-label="하나 빼기">−</button><b id="st-used">${s.storage.used}</b><button id="st-plus" aria-label="하나 더하기">＋</button></div>
        <p class="small muted mt12">전체 <input class="input sm" type="number" id="st-cap" value="${s.storage.cap}" min="0" style="width:72px;display:inline-block"> 자리</p>
        <label class="row mt16" style="justify-content:center;gap:10px"><span class="small strong">보관 잠시 중단</span><span class="switch"><input type="checkbox" id="st-pause" ${s.storage.paused ? 'checked' : ''}><span></span></span></label>
        <div class="mt12"><span class="storage ${s.status.storage.cls}"><i></i>${s.status.storage.text}</span></div></div>
      <div class="card"><h3>보관 예약</h3><div id="res-list" class="mt8"></div><p class="xsmall muted mt12">도착 예정 30분이 지나면 예약이 자동으로 풀려요(정식 서비스).</p></div></div>`;
    const save = (fn) => { patch((o, st) => { o.storage = Object.assign({}, st.storage, o.storage || {}); fn(o.storage); }); show('storage'); };
    $('#st-minus').onclick = () => save((x) => { x.used = Math.max(0, x.used - 1); });
    $('#st-plus').onclick = () => save((x) => { x.used = Math.min(x.cap, x.used + 1); });
    $('#st-cap').onchange = (e) => save((x) => { x.cap = Math.max(0, +e.target.value || 0); x.used = Math.min(x.used, x.cap); });
    $('#st-pause').onchange = (e) => save((x) => { x.paused = e.target.checked; });
    const all = TR.ls.get('reservations', []);
    const mine = all.filter((x) => x.store === sid);
    $('#res-list').innerHTML = mine.length ? mine.slice().reverse().map((x) => `<div class="row between wrap" style="padding:10px 0;border-bottom:1px solid var(--line2)"><div><b class="strong">${x.no}</b> · ${TR.esc(x.nick)} · ${TR.esc(x.size)}<div class="xsmall muted">${x.time} 도착 예정 · ${x.status}</div></div>
      ${x.status === '예약' ? `<div class="row"><button class="btn sm" data-r="${x.id}" data-to="보관 중">받음</button><button class="btn line sm" data-r="${x.id}" data-to="취소">취소</button></div>` : x.status === '보관 중' ? `<button class="btn line sm" data-r="${x.id}" data-to="찾아감">찾아감</button>` : ''}</div>`).join('') : '<p class="small muted">예약이 없어요. 매장 페이지에서 러너가 예약하면 여기에 보여요.</p>';
    $$('[data-r]').forEach((b) => b.onclick = () => {
      const x = all.find((r) => r.id === b.dataset.r); x.status = b.dataset.to; TR.ls.set('reservations', all);
      if (x.status === '보관 중') patch((o, st) => { o.storage = Object.assign({}, st.storage, o.storage || {}); o.storage.used = Math.min(o.storage.cap, o.storage.used + 1); });
      if (x.status === '찾아감') patch((o, st) => { o.storage = Object.assign({}, st.storage, o.storage || {}); o.storage.used = Math.max(0, o.storage.used - 1); });
      show('storage');
    });
  };

  /* ---------- 혜택 설정 ---------- */
  sections.benefit = (p) => {
    const s = S(); const km = (s.benefit.cond.match(/([\d.]+)\s*km/) || [])[1] || '';
    p.innerHTML = `<div class="card"><h3>러닝 인증 혜택</h3>
      <label class="field mt16"><span>혜택</span><input class="input" id="bf-title" value="${TR.esc(s.benefit.title)}"></label>
      <div class="form-grid mt16"><label class="field"><span>최소 거리(km, 비우면 제한 없음)</span><input class="input" type="number" id="bf-km" value="${km}" min="0" step="0.5"></label>
        <label class="field"><span>횟수</span><select class="select" id="bf-limit"><option ${s.benefit.limit === '하루 1회' ? 'selected' : ''}>하루 1회</option><option ${s.benefit.limit === '방문마다' ? 'selected' : ''}>방문마다</option></select></label></div>
      <button class="btn mt16" id="bf-save">저장</button></div>
      <div class="notice gray small mt16">혜택은 결제 없이 매장에서 바로 적용해요. 오늘러닝은 주문·결제를 대신 받지 않아요.</div>`;
    $('#bf-save').onclick = () => { const k = $('#bf-km').value; patch((o) => { o.benefit = { title: $('#bf-title').value.trim() || '러닝 인증 혜택', cond: k ? `당일 ${k}km 이상` : '당일 러닝 기록', limit: $('#bf-limit').value }; }); TR.toast('혜택을 저장했어요'); };
  };

  /* ---------- 영업 정보 ---------- */
  sections.info = (p) => {
    const s = S(); const A = ['화장실', '물', '짐 보관', '탈의실', '샤워', '주차'];
    p.innerHTML = `<div class="card"><h3>영업 정보</h3>
      <div class="form-grid mt16"><label class="field"><span>여는 시간</span><input class="input" type="time" id="if-open" value="${s.open}"></label><label class="field"><span>닫는 시간</span><input class="input" type="time" id="if-close" value="${s.close === '24:00' ? '23:59' : s.close}"></label></div>
      <div class="field mt16"><span class="label">휴무일</span><div class="row wrap">${['월', '화', '수', '목', '금', '토', '일'].map((d) => `<label class="toggle-chip"><input type="checkbox" class="if-off" value="${d}" ${(s.closedDay || '').split(',').includes(d) ? 'checked' : ''}>${d}</label>`).join('')}</div></div>
      <div class="field mt16"><span class="label">시설</span><div class="row wrap">${A.map((a) => `<label class="toggle-chip"><input type="checkbox" class="if-am" value="${a}" ${s.amen.includes(a) ? 'checked' : ''}>${a}</label>`).join('')}</div></div>
      <button class="btn mt16" id="if-save">저장</button></div>`;
    $('#if-save').onclick = () => { patch((o) => { o.open = $('#if-open').value; o.close = $('#if-close').value; o.closedDay = $$('.if-off').filter((x) => x.checked).map((x) => x.value).join(','); o.amen = $$('.if-am').filter((x) => x.checked).map((x) => x.value); }); TR.toast('영업 정보를 저장했어요'); };
  };

  /* ---------- 홍보 ---------- */
  sections.promo = (p) => {
    const s = S(); const ks = data.courses().filter((k) => k.hubId === s.hubId); const ms = data.meetups().filter((m) => m.hubId === s.hubId);
    p.innerHTML = `<div class="grid c3"><div class="stat"><div class="k">노출 코스</div><div class="v">${ks.length}<small>개</small></div><div class="d">근처 코스 지도에 표시</div></div><div class="stat"><div class="k">근처 모임</div><div class="v">${ms.length}<small>개</small></div><div class="d">모임 상세 ‘달린 뒤 들르기’</div></div><div class="stat"><div class="k">소식 받는 러너</div><div class="v">${42 + (TR.ls.get('storeFav', {})[sid] ? 1 : 0)}<small>명</small></div><div class="d">예시</div></div></div>
      <div class="grid c2 mt16" style="align-items:start">
        <div class="card"><h3>소식·이벤트 올리기</h3><textarea class="textarea mt12" id="nw-text" placeholder="예: 이번 주 토요일 오전 매장 주최 5km 런. 끝나고 커피 한 잔 드려요."></textarea><button class="btn mt12" id="nw-save">올리기</button><div class="mt12 small" id="nw-list"></div></div>
        <div class="stack">
          <div class="card"><h3>홍보물 받기</h3><p class="small muted mt8">‘러너 프렌들리’ 스티커와 매장 페이지 QR 안내판을 인쇄해 입구에 붙이세요.</p><button class="btn line mt12" id="poster">${TR.icon('download')}안내판 열기</button></div>
          <div class="card"><h3>매장 주최 런</h3><p class="small muted mt8">매장을 집결지로 하는 모임을 열면 지도와 모임 목록에 함께 보여요.</p><a class="btn line mt12" href="meetup-new.html">모임 열기</a></div>
        </div></div>`;
    const drawNews = () => { $('#nw-list').innerHTML = (S().news || []).map((n) => `<div style="padding:6px 0;border-bottom:1px solid var(--line2)">${TR.esc(typeof n === 'string' ? n : n.text)}</div>`).join(''); };
    drawNews();
    $('#nw-save').onclick = () => { const t = $('#nw-text').value.trim(); if (!t) return; patch((o, st) => { o.news = [t].concat(o.news || st.news || []).slice(0, 5); }); $('#nw-text').value = ''; TR.toast('소식을 올렸어요. 소식 받는 러너에게 알려요'); drawNews(); };
    $('#poster').onclick = () => {
      const url = new URL(`store.html?id=${sid}`, location.href).toString();
      TR.modal({ title: '안내판 미리보기', wide: true, html: `<div style="border:3px solid var(--point);border-radius:18px;padding:28px;text-align:center">
        <div style="font-weight:800;color:var(--point);letter-spacing:.08em">RUNNER FRIENDLY</div><div style="font-size:30px;font-weight:800;color:var(--ink);margin-top:6px">러너 환영합니다</div>
        <p class="mt8">${TR.esc(S().benefit.title)} · ${S().storage.cap ? '짐 보관 가능' : ''}</p><div style="width:180px;margin:16px auto">${TR.qrSvg(url)}</div><div class="small muted">오늘러닝에서 ${TR.esc(S().name)} 보기</div></div>`,
        actions: [{ label: '닫기', cls: 'line' }, { label: '인쇄', onClick: () => window.print() }] });
    };
  };

  /* ---------- 크루 제휴 ---------- */
  sections.crew = (p) => {
    const s = S(); const deals = TR.ls.get('deals', {}); const d = deals[sid] = deals[sid] || {};
    const crews = data.crews().filter((c) => (data.hub(c.hubId) || {}).region === s.region);
    p.innerHTML = `<p class="small muted mb16">근처 크루에게 제휴를 제안하면 크루 운영 콘솔에 전달돼요. 제휴하면 정기런 집결지와 단체 보관 매장으로 소개돼요.</p>
      <div class="list">${crews.map((c) => { const st = s.crew === c.id ? '제휴 중' : d[c.id]; return `<div class="list-item"><span class="ico">${TR.icon('users')}</span><div class="grow"><div class="title">${TR.esc(c.name)}</div><div class="meta">${TR.esc((data.hub(c.hubId) || {}).name)} · ${TR.esc(c.schedule)} · ${c.members}명</div></div>${st ? `<span class="chip ${st === '제휴 중' ? 'good' : 'blue'}">${st}</span>` : `<button class="btn line sm" data-c="${c.id}">제휴 제안</button>`}</div>`; }).join('')}</div>`;
    $$('[data-c]').forEach((b) => b.onclick = () => TR.modal({ title: '제휴 제안', html: `<label class="field"><span>제안 내용</span><textarea class="textarea" id="deal-t">정기런 날 크루원 단체 짐 보관(최대 10개)과 음료 할인을 드릴게요. 집결지로 써 주세요.</textarea></label>`,
      actions: [{ label: '취소', cls: 'line' }, { label: '보내기', onClick: (c) => { d[b.dataset.c] = '답변 대기'; TR.ls.set('deals', deals); c(); TR.toast('크루 운영진에게 보냈어요'); show('crew'); } }] }));
  };

  /* ---------- 소통 ---------- */
  sections.talk = (p) => {
    const rv = [['한소윤', '짐 맡기고 서울숲 한 바퀴 돌고 와서 커피까지. 직원분들이 러너를 정말 반겨 줘요.'], ['오지후', '보관함이 넉넉해서 크루 정기런 끝나고 다 같이 들러요.'], ['윤서아', '주말 아침엔 자리가 금방 차요. 조금 일찍 오세요.']];
    const mine = (TR.ls.get('reviews', {})[sid] || []).map((r) => [r.nick, r.text]);
    const all = mine.concat(rv);
    const replies = TR.ls.get('replies', {}); const rp = replies[sid] = replies[sid] || {};
    p.innerHTML = `<div class="grid c2" style="align-items:start"><div class="card"><h3>후기 답글</h3><div id="rv" class="mt8"></div></div>
      <div class="card"><h3>운영팀에 문의</h3><p class="small muted mt8">입점, 혜택 운영, 보관 분쟁, 정산과 무관한 무엇이든 물어보세요.</p><textarea class="textarea mt12" id="ask" placeholder="예: 비 오는 날은 보관을 쉬고 싶은데 어떻게 하나요?"></textarea><button class="btn mt12" id="ask-go">보내기</button></div></div>`;
    $('#rv').innerHTML = all.map(([n, t], i) => `<div style="padding:12px 0;border-bottom:1px solid var(--line2)"><b class="strong">${TR.esc(n)}</b><p class="small mt8">${TR.esc(t)}</p>${rp[i] ? `<div class="notice gray small mt8"><b>내 답글</b> ${TR.esc(rp[i])}</div>` : `<div class="row mt8"><input class="input sm" data-i="${i}" placeholder="답글 쓰기"><button class="btn line sm" data-go="${i}">등록</button></div>`}</div>`).join('');
    $$('[data-go]').forEach((b) => b.onclick = () => { const v = TR.$(`input[data-i="${b.dataset.go}"]`).value.trim(); if (!v) return; rp[b.dataset.go] = v; TR.ls.set('replies', replies); TR.toast('답글을 달았어요'); show('talk'); });
    $('#ask-go').onclick = () => { if (!$('#ask').value.trim()) return; $('#ask').value = ''; TR.toast('운영팀에 보냈어요. 영업일 기준 하루 안에 답해 드려요'); };
  };

  /* ---------- 방문 리포트 ---------- */
  sections.report = (p) => {
    const days = ['월', '화', '수', '목', '금', '토', '일']; const dv = [9, 16, 11, 14, 8, 22, 16];
    const hours = ['6시', '8시', '10시', '12시', '18시', '20시', '22시']; const hv = [12, 9, 6, 3, 8, 21, 7];
    const mx = (a) => Math.max(...a);
    p.innerHTML = `<div class="grid c2"><div class="card"><h3>요일별 인증 방문(지난주)</h3><div class="bars mt12">${dv.map((v, i) => `<div class="b"><em>${v}</em><i style="height:${v / mx(dv) * 100}%"></i><span>${days[i]}</span></div>`).join('')}</div></div>
      <div class="card"><h3>시간대별</h3><div class="bars mt12">${hv.map((v, i) => `<div class="b"><em>${v}</em><i style="height:${v / mx(hv) * 100}%;background:var(--ink)"></i><span>${hours[i]}</span></div>`).join('')}</div></div></div>
      <div class="card mt16"><h3>요약(예시)</h3><ul class="small mt8" style="padding-left:18px;line-height:1.9"><li>화요일·토요일 방문이 많아요. 근처 크루 정기런 날과 겹쳐요.</li><li>저녁 8시대가 가장 붐벼요. 이 시간엔 보관 자리를 미리 비워 두세요.</li><li>방문 러너 10명 중 6명은 다시 온 사람이에요.</li></ul>
      <p class="xsmall muted mt12">리포트는 개인을 알아볼 수 없는 집계로만 보여 드려요.</p></div>`;
  };

  function show(sec) {
    stopCam();
    $$('#side button').forEach((b) => b.classList.toggle('on', b.dataset.s === sec));
    sections[sec]($('#panel'));
  }
  $$('#side button').forEach((b) => b.onclick = () => { history.replaceState(null, '', '#' + b.dataset.s); show(b.dataset.s); });
  const h = location.hash.slice(1);
  show(h.startsWith('scan=') ? 'scan' : (sections[h] ? h : 'today'));
})();
