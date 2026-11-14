/* 오늘의 러닝 인증 카드 (S-03), 혜택 받기 (S-04), 혜택 지갑 (S-07) */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  const body = $('#vf-body');
  const u = TR.user.get();
  if (!u) {
    body.innerHTML = ui.empty('로그인이 필요해요', '인증 카드는 내 기록으로 만들어져요.', '<button class="btn" id="vf-login">시작하기</button>');
    $('#vf-login').onclick = () => TR.loginModal(() => location.reload());
    return;
  }
  const today = TR.records.today();
  const attended = Object.entries(TR.ls.get('attended', {})).filter(([, t]) => new Date(t).toDateString() === new Date().toDateString());
  const proofs = today.map((r) => ({ id: r.id, km: r.km, end: r.date, src: r.manual ? '수기 입력' : r.source === '체험' ? '체험 기록' : r.source })).concat(attended.map(([mid, t]) => { const m = data.meetup(mid); return { id: 'att-' + mid, km: m ? m.distance : 0, end: t, src: `크루 모임 출석${m ? ' · ' + m.title : ''}` }; }));

  if (!proofs.length) {
    body.innerHTML = `<div class="empty"><b>오늘 달린 기록이 아직 없어요</b>달리기를 기록하거나, 워치로 달렸다면 기록을 직접 입력하세요. 크루 모임에 출석했다면 출석으로도 인증할 수 있어요.
      <div class="row wrap mt16" style="justify-content:center"><a class="btn" href="run.html">달리기 시작</a><a class="btn line" href="run.html#manual">기록 직접 입력</a></div></div>
      <p class="xsmall muted center mt12">워치·건강 앱 기록을 자동으로 가져오는 기능은 앱 출시와 함께 열려요.</p>`;
    drawWallet(); return;
  }
  const stores = data.stores();
  const pre = TR.qs('store');
  body.innerHTML = `
    <div class="row wrap mb16"><select class="select" id="vf-rec" style="flex:1;min-width:200px">${proofs.map((p, i) => `<option value="${i}">${fmt.hm(p.end)} · ${p.km.toFixed(2)}km · ${TR.esc(p.src)}</option>`).join('')}</select>
      <select class="select" id="vf-store" style="flex:1;min-width:200px"><option value="">매장 고르기(선택)</option>${stores.map((s) => `<option value="${s.id}" ${s.id === pre ? 'selected' : ''}>${TR.esc(s.name)} · ${TR.esc(s.hubName)}</option>`).join('')}</select></div>
    <div class="verify-card">
      <div class="row between"><span class="strong" style="color:#fff">오늘러닝</span><span class="small"><span class="pulse"></span><span id="vf-clock"></span></span></div>
      <div class="k mt16">${TR.esc(u.nick)}님의 오늘의 러닝</div>
      <div class="v"><span id="vf-km"></span><small style="font-size:20px"> km</small></div>
      <div class="small" id="vf-meta" style="opacity:.9"></div>
      <div class="qr"><div id="vf-qr"></div><div class="code" id="vf-code">000000</div><div class="xsmall muted">30초마다 바뀌어요</div></div>
      <div class="live"><span id="vf-left"></span></div>
    </div>
    <div class="mt16" id="vf-check"></div>`;
  let timer = null;
  function cur() { return proofs[+$('#vf-rec').value]; }
  function tick() {
    const p = cur(); const rc = TR.rollingCode('vf:' + u.id);
    $('#vf-clock').textContent = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if ($('#vf-code').textContent !== rc.code || !$('#vf-qr').innerHTML) {
      $('#vf-code').textContent = rc.code;
      const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ n: u.nick, u: u.id, km: p.km, e: p.end, s: p.src, c: rc.code }))));
      const url = new URL('partner-center.html', location.href); url.hash = 'scan=' + payload;
      $('#vf-qr').innerHTML = TR.qrSvg(url.toString());
    }
    $('#vf-left').style.width = (rc.left / 30 * 100) + '%';
  }
  function check() {
    const p = cur();
    $('#vf-km').textContent = p.km.toFixed(2);
    $('#vf-meta').textContent = `${fmt.hm(p.end)} 기록 · ${p.src}`;
    $('#vf-qr').innerHTML = ''; tick();
    const s = data.store($('#vf-store').value);
    if (!s) { $('#vf-check').innerHTML = '<p class="small muted center">매장을 고르면 혜택 조건을 바로 확인해 드려요.</p>'; return; }
    const need = (s.benefit.cond.match(/([\d.]+)\s*km/) || [])[1];
    const ok = !need || p.km >= +need;
    const used = TR.ls.get('benefits', []).some((b) => b.store === s.id && new Date(b.at).toDateString() === new Date().toDateString());
    $('#vf-check').innerHTML = `<div class="card"><div class="row between wrap"><div><b class="strong">${TR.esc(s.name)}</b><div class="small point-text strong">${TR.esc(s.benefit.title)}</div><div class="xsmall muted">조건 ${TR.esc(s.benefit.cond)} · ${TR.esc(s.benefit.limit)}</div></div>
      ${used ? '<span class="chip">오늘 이미 받았어요</span>' : ok ? `<button class="btn" id="vf-use">혜택 받기</button>` : `<span class="chip warn">${need}km 이상 필요</span>`}</div>
      ${p.src.includes('수기') ? '<p class="xsmall warn-text mt8">수기 입력 기록은 매장에 따라 인정하지 않을 수 있어요.</p>' : ''}</div>`;
    const b = $('#vf-use');
    if (b) b.onclick = () => TR.confirm('혜택을 받을까요?', `직원이 확인했다면 눌러 주세요. ${TR.esc(s.name)}에서 하루 한 번만 받을 수 있어요.`, '받았어요', () => {
      const list = TR.ls.get('benefits', []); list.push({ store: s.id, name: s.name, title: s.benefit.title, km: p.km, at: new Date().toISOString() }); TR.ls.set('benefits', list);
      TR.toast('혜택 받기를 기록했어요'); check(); drawWallet();
    });
  }
  $('#vf-rec').onchange = check; $('#vf-store').onchange = check;
  check(); timer = setInterval(tick, 1000);
  drawWallet();

  function drawWallet() {
    const list = TR.ls.get('benefits', []).slice().reverse();
    $('#wallet').innerHTML = `<div class="section-title"><h2 style="font-size:20px">혜택 지갑</h2><a class="more" href="stores.html">매장 찾기 →</a></div>
      ${list.length ? `<div class="list">${list.map((b) => `<a class="list-item" href="store.html?id=${b.store}"><span class="ico">${TR.icon('cup')}</span><div class="grow"><div class="title">${TR.esc(b.title)}</div><div class="meta">${TR.esc(b.name)} · ${fmt.dateTime(b.at)} · ${b.km.toFixed(1)}km</div></div></a>`).join('')}</div>` : '<div class="empty small">아직 받은 혜택이 없어요. 달린 뒤 근처 러너 프렌들리 매장에 들러 보세요.</div>'}
      <div class="notice gray small mt16"><b>인증을 속이지 않게</b> QR과 숫자는 30초마다 바뀌고, 카드 위 시계가 계속 움직여요. 캡처나 지난 기록 화면으로는 혜택을 받을 수 없어요.</div>`;
  }
})();
