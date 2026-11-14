/* 크루 관리 콘솔 (C-02 멤버, C-03 공지·투표, C-04 출석부, C-05 명단 가져오기, C-06 회비, C-10 리포트,
   D-01 QR 출석, D-02 수동 체크, D-04 출발 인원 확정, D-05 귀환 확인, B-11·G-02 날씨 기준과 결정 기록) */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  const u = TR.user.get();
  const crews = data.crews();
  let crewId = TR.qs('crew') || (u && u.adminCrew) || 'c1';
  if (!data.crew(crewId)) crewId = 'c1';
  $('#ca-crew').innerHTML = crews.map((c) => `<option value="${c.id}" ${c.id === crewId ? 'selected' : ''}>${TR.esc(c.name)}</option>`).join('');
  $('#ca-crew').onchange = () => { location.href = `crew-admin.html?crew=${$('#ca-crew').value}`; };

  const crew = data.crew(crewId);
  const hub = data.hub(crew.hubId);
  $('#ca-title').textContent = `${crew.name} 운영`;
  $('#side-title').textContent = crew.name;

  // 예시 멤버(실제 서비스에서는 가입 명단)
  const NAMES = ['김도윤', '이서준', '최유나', '박하은', '정민재', '한소윤', '오지후', '윤서아', '장하준', '임채원', '강지민', '조예린', '신우진', '배수아', '송태오', '홍다인', '유건우', '문서연', '권도현', '안시우', '황지아', '서이준', '남가은', '노윤호'];
  const key = (k) => `${k}.${crewId}`;
  let members = TR.ls.get(key('members'), null);
  if (!members) {
    members = NAMES.map((n, i) => ({ name: n, role: i === 0 ? '크루장' : i < 4 ? '운영진' : i < 8 ? '페이서' : '멤버', rate: 95 - ((i * 13) % 55), last: i % 5 }));
    if (u) members.splice(1, 0, { name: u.nick, role: '운영진', rate: 100, last: 0, me: true });
  }
  const saveMembers = () => TR.ls.set(key('members'), members);

  const meetups = () => data.meetups().filter((m) => m.crewId === crewId);
  const sections = {};

  /* ---------- 대시보드 ---------- */
  sections.dash = (p) => {
    const ms = meetups();
    p.innerHTML = `
      <div class="grid c4">
        <div class="stat"><div class="k">이번 달 모임</div><div class="v">14<small>회</small></div><div class="d">정기 10 · 번개 4 (예시)</div></div>
        <div class="stat"><div class="k">모임당 평균 출석</div><div class="v">17.6<small>명</small></div><div class="d">지난달 15.9명</div></div>
        <div class="stat"><div class="k">노쇼율</div><div class="v">6.1<small>%</small></div><div class="d">지난달 11.4%</div></div>
        <div class="stat"><div class="k">신규 정착률</div><div class="v">42<small>%</small></div><div class="d">첫 참석 후 30일 안 재참석</div></div>
      </div>
      <div class="section-title mt32"><h2 style="font-size:19px">다가오는 모임과 날씨 기준</h2><a class="more" href="meetup-new.html">모임 열기 →</a></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>일시</th><th>모임</th><th class="num">신청/정원</th><th>날씨 기준</th><th></th></tr></thead><tbody id="dash-rows">
        ${ms.map((m) => `<tr data-id="${m.id}"><td>${fmt.rel(m.at)} ${fmt.hm(m.at)}<div class="xsmall muted">${fmt.date(m.at)}</div></td><td><a class="strong" href="meetup.html?id=${m.id}">${TR.esc(m.title)}</a>${m.cancelled ? ' <span class="chip danger">취소됨</span>' : ''}</td><td class="num">${m.filled}/${m.cap}</td><td class="wx-cell small muted">확인 중…</td><td><button class="btn line sm" data-decide="${m.id}">결정 기록</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted">예정된 모임이 없어요.</td></tr>'}
      </tbody></table></div>
      <p class="xsmall muted mt8">날씨 기준(주의·경고·중단 권고)은 운영 판단을 돕는 참고 정보예요. 결정은 운영진이 하고, 오늘러닝은 결정 내용을 기록해 참가자에게 알립니다.</p>
      <div class="grid c2 mt24">
        <div class="card"><h3>이번 달 새로 온 사람</h3><p class="mt8">9명 · 그중 4명이 두 번째 참석</p><p class="small muted mt8">안내 담당 페이서를 정해 두면 정착률이 올라가요.</p></div>
        <div class="card"><h3>최근 결정 기록</h3><div id="dec-log" class="mt8 small"></div></div>
      </div>`;
    // 날씨 단계 채우기(3일 안)
    $$('#dash-rows tr[data-id]').forEach(async (tr) => {
      const m = data.meetup(tr.dataset.id); const cell = tr.querySelector('.wx-cell');
      if (m.at - Date.now() > 60 * 3600 * 1000) { cell.textContent = '3일 전부터 확인'; return; }
      try { const w = await TR.weather.get(m.lat, m.lng); const st = TR.weather.stage(TR.weather.at(w, m.at)); cell.innerHTML = `<span class="stage stage-${st.cls}" style="font-size:13.5px"><i></i>${st.label}</span>${st.reasons.length ? `<div class="xsmall">${st.reasons.map((r) => r.why).join(', ')}</div>` : ''}`; }
      catch (e) { cell.textContent = '불러오지 못함'; }
    });
    $$('[data-decide]').forEach((b) => b.onclick = () => decide(data.meetup(b.dataset.decide)));
    drawLog();
  };
  function drawLog() {
    const el = $('#dec-log'); if (!el) return;
    const log = TR.ls.get(key('decisions'), []);
    el.innerHTML = log.length ? log.slice(-4).reverse().map((d) => `<div class="mb8"><b class="strong">${TR.esc(d.choice)}</b> · ${TR.esc(d.title)}<div class="xsmall muted">${fmt.dateTime(d.at)} · ${TR.esc(d.reason || '')}</div></div>`).join('') : '<span class="muted">아직 기록이 없어요.</span>';
  }
  // 기준 초과 시 절차(G-02)
  function decide(m) {
    const opts = ['그대로 진행', '시간 앞당기기', '거리 줄이기', '실내로 대체', '모임 취소'];
    TR.modal({
      title: `${m.title} · 결정 기록`,
      html: `<p class="small muted mb12">${fmt.dateTime(m.at)} · 신청 ${m.filled}명. 고른 내용은 신청자에게 알림으로 전송되고 모임 기록에 남아요.</p>
        <div class="stack">${opts.map((o, i) => `<label class="check"><input type="radio" name="dc" value="${o}" ${i === 0 ? 'checked' : ''}><span><b class="strong">${o}</b></span></label>`).join('')}</div>
        <label class="field mt16"><span>사유(참가자에게 보여요)</span><input class="input" id="dc-reason" placeholder="예: 내일 19:30 체감온도 34℃ 예상"></label>`,
      actions: [{ label: '닫기', cls: 'line' }, {
        label: '결정하고 알리기', onClick: (close) => {
          const choice = (TR.$('input[name=dc]:checked') || {}).value; const reason = $('#dc-reason').value.trim();
          const log = TR.ls.get(key('decisions'), []); log.push({ id: m.id, title: m.title, choice, reason, at: new Date().toISOString() }); TR.ls.set(key('decisions'), log);
          const cc = TR.ls.get('cancelled', {});
          if (choice === '모임 취소') cc[m.id] = { reason: reason || '운영진 결정', at: new Date().toISOString() }; else delete cc[m.id];
          TR.ls.set('cancelled', cc);
          close(); TR.toast(`신청자 ${m.filled}명에게 알렸어요`); show('dash');
        },
      }],
    });
  }

  /* ---------- 출석·귀환 ---------- */
  let attTimer = null;
  sections.attendance = (p) => {
    const ms = meetups().filter((m) => !m.cancelled);
    if (!ms.length) { p.innerHTML = ui.empty('예정된 모임이 없어요', '', '<a class="btn" href="meetup-new.html">모임 열기</a>'); return; }
    const sel = TR.qs('meetup') && ms.find((m) => m.id === TR.qs('meetup')) ? TR.qs('meetup') : ms[0].id;
    p.innerHTML = `
      <div class="row between wrap mb16"><select class="select" id="att-m" style="width:auto">${ms.map((m) => `<option value="${m.id}" ${m.id === sel ? 'selected' : ''}>${fmt.rel(m.at)} ${fmt.hm(m.at)} · ${TR.esc(m.title)}</option>`).join('')}</select>
        <div class="seg" id="att-phase"><button class="on" data-ph="check">출석</button><button data-ph="depart">출발</button><button data-ph="return">귀환</button></div></div>
      <div class="grid c2" style="grid-template-columns:340px minmax(0,1fr);align-items:start" id="att-grid">
        <div class="card center" id="att-code-card">
          <div class="small muted">참가자가 찍을 QR</div>
          <div id="att-qr" style="width:220px;height:220px;margin:12px auto"></div>
          <div class="big-num md" id="att-code" style="letter-spacing:.12em">000000</div>
          <div class="cap-bar mt12"><span id="att-left" style="width:100%"></span></div>
          <p class="xsmall muted mt8">30초마다 새 코드로 바뀌어요. 캡처해서 보내도 쓸 수 없어요.</p>
        </div>
        <div>
          <div class="grid c3" id="att-stats"></div>
          <div class="list mt16" id="att-list"></div>
          <div class="row wrap mt16" id="att-actions"></div>
        </div>
      </div>`;
    if (window.matchMedia('(max-width: 920px)').matches) $('#att-grid').style.gridTemplateColumns = '1fr';
    let phase = 'check';
    const m = () => data.meetup($('#att-m').value);
    const stKey = () => key('att.' + $('#att-m').value);
    function roster() {
      const mm = m(); let i = 0; const r = [];
      mm.groups.forEach((g) => { for (let k = 0; k < g.filled; k++) { const mem = members[(i++ + 3) % members.length]; r.push({ name: mem.name, group: g.name }); } });
      if (mm.mine && u && !r.some((x) => x.name === u.nick)) r.push({ name: u.nick, group: mm.mine.group, me: true });
      return r;
    }
    function state() { return TR.ls.get(stKey(), { present: {}, departed: {}, returned: {}, departAt: null }); }
    function draw() {
      const mm = m(); const r = roster(); const s = state();
      const myAtt = TR.ls.get('attended', {})[mm.id]; if (myAtt && u) s.present[u.nick] = true;
      const nP = r.filter((x) => s.present[x.name]).length, nD = r.filter((x) => s.departed[x.name]).length, nR = r.filter((x) => s.returned[x.name]).length;
      $('#att-stats').innerHTML = [['신청', r.length], ['출석', nP], [phase === 'return' ? '귀환' : '미도착', phase === 'return' ? `${nR}/${nD}` : r.length - nP]].map(([k, v], i) => `<div class="stat center"><div class="k">${k}</div><div class="v ${i === 1 ? 'point-text' : ''}">${v}</div></div>`).join('');
      const groups = [...new Set(r.map((x) => x.group))];
      $('#att-list').innerHTML = groups.map((g) => {
        const rows = r.filter((x) => x.group === g);
        return `<div class="list-item" style="background:var(--bg)"><b class="strong">${TR.esc(g)}그룹</b><span class="small muted">${rows.length}명</span></div>` + rows.map((x) => {
          const k = phase === 'check' ? 'present' : phase === 'depart' ? 'departed' : 'returned';
          const disabled = phase === 'return' && !s.departed[x.name];
          return `<div class="att-row"><span>${TR.esc(x.name)}${x.me ? ' <span class="chip point">나</span>' : ''}</span><span class="small muted">${s.present[x.name] ? '출석' : '미도착'}</span>
            <label class="row" style="justify-content:flex-end;gap:8px"><span class="small">${phase === 'check' ? '출석' : phase === 'depart' ? '출발' : '귀환'}</span><span class="switch"><input type="checkbox" data-n="${TR.esc(x.name)}" data-k="${k}" ${s[k][x.name] ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span></span></span></label></div>`;
        }).join('');
      }).join('');
      $$('#att-list input').forEach((inp) => inp.onchange = () => { const st = state(); st[inp.dataset.k][inp.dataset.n] = inp.checked; TR.ls.set(stKey(), st); draw(); });
      const act = $('#att-actions');
      if (phase === 'check') act.innerHTML = `<button class="btn line" id="all-present">모두 출석 처리</button><span class="small muted">QR을 못 찍는 사람은 이름 옆 스위치로 출석시켜요.</span>`;
      if (phase === 'depart') act.innerHTML = `<button class="btn" id="confirm-depart">출석 인원 ${nP}명으로 출발 확정</button><span class="small muted">그룹별로 2분 간격 출발을 안내해요.</span>`;
      if (phase === 'return') {
        const missing = r.filter((x) => s.departed[x.name] && !s.returned[x.name]);
        act.innerHTML = missing.length ? `<div class="notice warn" style="flex:1"><b>아직 돌아오지 않은 사람 ${missing.length}명</b><br>${missing.map((x) => TR.esc(x.name)).join(', ')} <button class="btn sm dark mt8" id="call-missing">연락하기</button></div>` : (nD ? '<div class="notice good" style="flex:1"><b>모두 돌아왔어요.</b> 수고하셨어요!</div>' : '<span class="small muted">출발을 먼저 확정해 주세요.</span>');
      }
      const ap = $('#all-present'); if (ap) ap.onclick = () => { const st = state(); r.forEach((x) => st.present[x.name] = true); TR.ls.set(stKey(), st); draw(); };
      const cd = $('#confirm-depart'); if (cd) cd.onclick = () => { const st = state(); r.forEach((x) => { if (st.present[x.name]) st.departed[x.name] = true; }); st.departAt = new Date().toISOString(); TR.ls.set(stKey(), st); TR.toast(`${nP}명 출발을 확정했어요`); setPhase('return'); };
      const cm = $('#call-missing'); if (cm) cm.onclick = () => TR.modal({ title: '미귀환 연락', html: '<p>정식 서비스에서는 이 버튼으로 미귀환자에게 바로 전화하고, 위치 공유를 켠 사람은 마지막 위치를 볼 수 있어요. 10분이 지나도 연락이 닿지 않으면 119 신고를 안내합니다.</p>' });
    }
    function setPhase(ph) { phase = ph; $$('#att-phase button').forEach((b) => b.classList.toggle('on', b.dataset.ph === ph)); $('#att-code-card').classList.toggle('hide', ph !== 'check'); draw(); }
    $$('#att-phase button').forEach((b) => b.onclick = () => setPhase(b.dataset.ph));
    function tick() {
      const mm = m(); const rc = TR.rollingCode('att:' + mm.id);
      if ($('#att-code').textContent !== rc.code) {
        $('#att-code').textContent = rc.code;
        const url = new URL('meetup.html', location.href); url.searchParams.set('id', mm.id); url.searchParams.set('att', rc.code);
        $('#att-qr').innerHTML = TR.qrSvg(url.toString());
      }
      $('#att-left').style.width = (rc.left / 30 * 100) + '%';
    }
    $('#att-m').onchange = () => { draw(); tick(); };
    clearInterval(attTimer); attTimer = setInterval(tick, 1000); tick(); draw();
  };

  /* ---------- 모임 관리 ---------- */
  sections.meet = (p) => {
    const ms = meetups();
    p.innerHTML = `<div class="row between mb16"><h2 style="font-size:20px">모임 ${ms.length}개</h2><a class="btn sm" href="meetup-new.html">${TR.icon('plus')}모임 열기</a></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>모임</th><th>일정</th><th>그룹</th><th class="num">신청</th><th>신청 링크</th></tr></thead><tbody>
      ${ms.map((m) => `<tr><td><a class="strong" href="meetup.html?id=${m.id}">${TR.esc(m.title)}</a><div class="xsmall muted">${m.kind}${m.weekday != null ? ' · 매주 ' + fmt.weekday(m.weekday) : ''}</div></td><td>${fmt.dateTime(m.at)}</td><td class="small">${m.groups.map((g) => `${TR.esc(g.name)} ${g.pace} (${g.filled}/${g.cap})`).join('<br>')}</td><td class="num">${m.filled}/${m.cap}</td><td><button class="btn line sm" data-link="${m.id}">${TR.icon('link')}복사</button></td></tr>`).join('')}
      </tbody></table></div>
      <div class="notice gray mt16 small">신청 링크를 단톡방·밴드·인스타그램에 붙이면 앱 없이 웹에서 바로 신청할 수 있어요. 노쇼 관리(B-14)와 모임 대화방(B-13)은 2단계에 추가돼요.</div>`;
    $$('[data-link]').forEach((b) => b.onclick = () => TR.copy(new URL(`meetup.html?id=${b.dataset.link}`, location.href).toString()));
  };

  /* ---------- 멤버 ---------- */
  sections.members = (p) => {
    p.innerHTML = `<div class="row between wrap mb16"><h2 style="font-size:20px">멤버 <span id="mem-n"></span></h2>
      <div class="row wrap"><input class="input sm" id="mem-q" type="search" placeholder="이름 찾기" style="width:180px"><button class="btn line sm" id="mem-import">명단 가져오기</button></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>이름</th><th>역할</th><th class="num">출석률(3개월)</th><th>최근 참석</th></tr></thead><tbody id="mem-rows"></tbody></table></div>
      <p class="xsmall muted mt8">역할: 크루장(모든 권한) · 운영진(모임·출석·공지) · 페이서(그룹 인솔, 출석 체크) · 멤버. 권한을 바꾸면 작업 기록에 남아요.</p>`;
    function draw() {
      const q = $('#mem-q').value.trim();
      const list = members.filter((x) => !q || x.name.includes(q));
      $('#mem-n').textContent = `${members.length}명`;
      $('#mem-rows').innerHTML = list.map((x) => `<tr><td class="strong">${TR.esc(x.name)}${x.me ? ' <span class="chip point">나</span>' : ''}</td>
        <td><select class="select sm" data-n="${TR.esc(x.name)}" style="width:110px">${['크루장', '운영진', '페이서', '멤버'].map((r) => `<option ${r === x.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
        <td class="num">${x.rate}%</td><td class="small muted">${x.last === 0 ? '이번 주' : x.last + '주 전'}</td></tr>`).join('');
      $$('#mem-rows select').forEach((s) => s.onchange = () => { members.find((x) => x.name === s.dataset.n).role = s.value; saveMembers(); TR.toast('역할을 바꿨어요'); });
    }
    $('#mem-q').oninput = draw; draw();
    $('#mem-import').onclick = () => TR.modal({
      title: '명단 가져오기',
      html: '<p class="small muted mb12">밴드나 엑셀에서 이름을 복사해 붙여 넣으세요. 한 줄에 한 명, 또는 쉼표로 구분해요.</p><textarea class="textarea" id="imp" rows="6" placeholder="홍길동\n김러너, 이페이스"></textarea>',
      actions: [{ label: '취소', cls: 'line' }, { label: '추가', onClick: (close) => {
        const names = $('#imp').value.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).filter((n) => !members.some((x) => x.name === n));
        names.forEach((n) => members.push({ name: n, role: '멤버', rate: 0, last: 99 })); saveMembers(); close(); TR.toast(`${names.length}명을 추가했어요`); draw();
      } }],
    });
  };

  /* ---------- 공지·투표 ---------- */
  sections.notice = (p) => {
    const all = TR.ls.get('notices', {});
    const list = all[crewId] || [];
    const polls = TR.ls.get(key('polls'), [{ q: '12월 송년런 코스는?', opts: [['반포·잠수교', 9], ['여의도 왕복', 6], ['남산 둘레길', 4]], mine: null }]);
    p.innerHTML = `<div class="grid c2" style="align-items:start">
      <div class="card"><h3>공지 쓰기</h3><textarea class="textarea mt12" id="n-text" placeholder="예: 이번 주 목요일은 비 예보로 실내 트랙에서 모입니다."></textarea>
        <label class="check mt12"><input type="checkbox" id="n-push" checked><span>멤버에게 알림 보내기</span></label>
        <button class="btn mt12" id="n-save">공지 올리기</button>
        <div class="list mt16" id="n-list"></div></div>
      <div class="card"><h3>투표</h3><div id="poll" class="mt12"></div></div></div>`;
    function drawList() { $('#n-list').innerHTML = (all[crewId] || []).slice().reverse().map((n) => `<div class="list-item"><div class="grow"><div class="title">${TR.esc(n.text)}</div><div class="meta">${fmt.dateTime(n.at)}</div></div></div>`).join('') || '<div class="list-item small muted">올린 공지가 없어요. 크루 페이지 공지 탭에 함께 보여요.</div>'; }
    $('#n-save').onclick = () => { const t = $('#n-text').value.trim(); if (!t) return; (all[crewId] = all[crewId] || []).push({ text: t, at: new Date().toISOString() }); TR.ls.set('notices', all); $('#n-text').value = ''; TR.toast($('#n-push').checked ? `멤버 ${members.length}명에게 알렸어요` : '공지를 올렸어요'); drawList(); };
    drawList();
    function drawPoll() {
      const pl = polls[0]; const total = pl.opts.reduce((s, o) => s + o[1], 0);
      $('#poll').innerHTML = `<b class="strong">${TR.esc(pl.q)}</b>` + pl.opts.map((o, i) => `<button class="btn line block mt8" data-o="${i}" style="justify-content:space-between;${pl.mine === i ? 'border-color:var(--point);color:var(--point-dark)' : ''}"><span>${TR.esc(o[0])}</span><span>${o[1]}표 · ${Math.round(o[1] / total * 100)}%</span></button>`).join('') + `<p class="xsmall muted mt8">총 ${total}명 참여</p>`;
      $$('#poll [data-o]').forEach((b) => b.onclick = () => { const i = +b.dataset.o; if (pl.mine != null) pl.opts[pl.mine][1]--; pl.opts[i][1]++; pl.mine = i; TR.ls.set(key('polls'), polls); drawPoll(); });
    }
    drawPoll();
  };

  /* ---------- 회비 기록 ---------- */
  sections.dues = (p) => {
    const ym = new Date().toISOString().slice(0, 7);
    const dues = TR.ls.get(key('dues'), {});
    const cur = dues[ym] || (dues[ym] = { paid: Object.fromEntries(members.slice(0, 14).map((x) => [x.name, true])), spend: [{ d: ym + '-05', item: '대회 단체 접수 간식', amt: 48000 }] });
    p.innerHTML = `<div class="notice gray mb16 small"><b>돈은 오늘러닝을 거치지 않아요.</b> 크루가 쓰던 모임통장은 그대로 두고, 누가 냈는지와 어디에 썼는지만 기록해 멤버에게 투명하게 보여 줘요.</div>
      <div class="grid c3"><div class="stat"><div class="k">${ym.replace('-', '년 ')}월 납부</div><div class="v" id="d-n"></div></div><div class="stat"><div class="k">이번 달 지출</div><div class="v" id="d-s"></div></div><div class="stat"><div class="k">월 회비</div><div class="v">10,000<small>원</small></div></div></div>
      <div class="grid c2 mt16" style="align-items:start">
        <div class="list" id="d-list" style="max-height:420px;overflow:auto"></div>
        <div class="card"><h3>지출 기록</h3><div id="d-spend" class="mt8"></div>
          <div class="row wrap mt12"><input class="input sm" id="sp-item" placeholder="항목" style="flex:1;min-width:120px"><input class="input sm" id="sp-amt" type="number" placeholder="금액" style="width:110px"><button class="btn sm" id="sp-add">추가</button></div>
          <button class="btn line sm mt12" id="d-remind">미납자에게 알림 보내기</button></div></div>`;
    function draw() {
      const n = members.filter((x) => cur.paid[x.name]).length;
      $('#d-n').innerHTML = `${n}<small>/${members.length}명</small>`;
      $('#d-s').innerHTML = `${cur.spend.reduce((s, x) => s + x.amt, 0).toLocaleString()}<small>원</small>`;
      $('#d-list').innerHTML = members.map((x) => `<div class="att-row" style="grid-template-columns:1fr auto"><span>${TR.esc(x.name)}</span><label class="row" style="gap:8px"><span class="small ${cur.paid[x.name] ? 'good-text' : 'muted'}">${cur.paid[x.name] ? '납부' : '미납'}</span><span class="switch"><input type="checkbox" data-n="${TR.esc(x.name)}" ${cur.paid[x.name] ? 'checked' : ''}><span></span></span></label></div>`).join('');
      $$('#d-list input').forEach((i) => i.onchange = () => { cur.paid[i.dataset.n] = i.checked; TR.ls.set(key('dues'), dues); draw(); });
      $('#d-spend').innerHTML = cur.spend.map((s) => `<div class="row between small" style="padding:6px 0;border-bottom:1px solid var(--line2)"><span>${s.d.slice(5).replace('-', '/')} ${TR.esc(s.item)}</span><b>${s.amt.toLocaleString()}원</b></div>`).join('') || '<span class="small muted">기록이 없어요.</span>';
    }
    $('#sp-add').onclick = () => { const item = $('#sp-item').value.trim(), amt = +$('#sp-amt').value; if (!item || !amt) return; cur.spend.push({ d: new Date().toISOString().slice(0, 10), item, amt }); TR.ls.set(key('dues'), dues); $('#sp-item').value = ''; $('#sp-amt').value = ''; draw(); };
    $('#d-remind').onclick = () => TR.toast(`미납 ${members.filter((x) => !cur.paid[x.name]).length}명에게 알림을 보냈어요`);
    TR.ls.set(key('dues'), dues); draw();
  };

  /* ---------- 리포트 ---------- */
  sections.report = (p) => {
    const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(); d.setMonth(d.getMonth() - i); months.push(d.getMonth() + 1); }
    const att = [11.2, 12.8, 14.1, 13.0, 15.9, 17.6], ns = [14.0, 12.5, 11.8, 12.9, 11.4, 6.1];
    const max = Math.max(...att);
    p.innerHTML = `<div class="grid c2" style="align-items:start">
      <div class="card"><h3>모임당 평균 출석(명)</h3><div class="bars mt12">${att.map((v, i) => `<div class="b"><em>${v}</em><i style="height:${v / max * 100}%"></i><span>${months[i]}월</span></div>`).join('')}</div></div>
      <div class="card"><h3>노쇼율(%)</h3><div class="bars mt12">${ns.map((v, i) => `<div class="b"><em>${v}</em><i style="height:${v / 15 * 100}%;background:var(--ink)"></i><span>${months[i]}월</span></div>`).join('')}</div></div></div>
      <div class="card mt16"><h3>요약(예시)</h3><ul class="mt8 small" style="padding-left:18px;line-height:1.9">
        <li>평균 출석이 6개월 사이 11.2명에서 17.6명으로 늘었어요.</li><li>신청 마감 1시간 전 알림을 켠 뒤 노쇼율이 절반 가까이 줄었어요.</li><li>새로 온 사람 9명 중 4명이 두 번째로 왔어요. 입문 그룹 페이서를 한 명 더 두면 좋겠어요.</li></ul>
        <button class="btn line sm mt12" id="rep-dl">${TR.icon('download')}리포트 내려받기(CSV)</button></div>`;
    $('#rep-dl').onclick = () => TR.download(`${crew.name}-리포트.csv`, '﻿월,평균 출석,노쇼율\n' + months.map((mo, i) => `${mo}월,${att[i]},${ns[i]}`).join('\n'), 'text/csv');
  };

  function show(s) {
    clearInterval(attTimer);
    $$('#side button').forEach((b) => b.classList.toggle('on', b.dataset.s === s));
    sections[s]($('#panel'));
    if (location.hash.slice(1) !== s) history.replaceState(null, '', '#' + s + (location.search ? '' : ''));
  }
  $$('#side button').forEach((b) => b.onclick = () => show(b.dataset.s));
  show(sections[location.hash.slice(1)] ? location.hash.slice(1) : 'dash');
})();
