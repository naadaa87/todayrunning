/* 모임 상세·신청 (B-02, B-04, B-10, B-11, B-12, D-01) */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  const id = TR.qs('id') || 'm1';
  let m = data.meetup(id);
  if (!m) { $('#main').innerHTML = `<div class="container section">${ui.empty('모임을 찾을 수 없어요', '삭제되었거나 주소가 바뀌었을 수 있어요.', '<a class="btn" href="meetups.html">모임 찾기</a>')}</div>`; return; }
  const crew = m.crewId ? data.crew(m.crewId) : null;
  const course = m.courseId ? data.course(m.courseId) : null;
  const hub = data.hub(m.hubId);
  document.title = `${m.title} · 오늘러닝`;

  $('#m-title').textContent = m.title;
  $('#m-sub').innerHTML = `${crew ? `<a class="point-text strong" href="crew.html?id=${crew.id}">${TR.esc(crew.name)}</a>` : `<b class="strong">${TR.esc(m.host || '개인')}</b> 님이 연 모임`} · ${TR.esc(hub.region)} ${TR.esc(hub.name)}`;
  $('#m-chips').innerHTML = [`<span class="chip ${m.kind === '번개' ? 'blue' : m.kind === '입문' ? 'good' : 'dark'}">${m.kind}</span>`, `<span class="chip">${m.level}</span>`, m.beginner ? '<span class="chip point">입문 환영</span>' : '', m.guest ? '<span class="chip">게스트 가능</span>' : '<span class="chip">크루원만</span>'].join('');
  if (m.cancelled) $('#m-banner').innerHTML = `<div class="notice danger mb16"><b>운영진이 이 모임을 취소했어요.</b> 사유: ${TR.esc((TR.ls.get('cancelled', {})[m.id] || {}).reason || '날씨 기준 초과')}</div>`;

  // 지도
  const map = TR.map.create($('#m-map'), { center: [m.lat, m.lng], zoom: 15 });
  if (map) {
    if (course) {
      const line = L.polyline(course.path, { color: '#E8452C', weight: 5, opacity: .9 }).addTo(map);
      map.fitBounds(line.getBounds(), { padding: [30, 30] });
    }
    L.marker([m.lat, m.lng], { icon: TR.map.label('집결') }).addTo(map).bindPopup(`<b>집결</b><br>${TR.esc(m.place)}`);
    TR.map.facilities(map, m.hubId);
  }

  // 코스 요약
  const fac = course ? course.facilities : { wc: '-', aed: '-', locker: '-' };
  $('#m-stats').innerHTML = [
    ['거리', `${m.distance}<small>km</small>`, course ? course.type + ' 코스' : '자유 코스'],
    ['오르막', course ? `${course.elev}<small>m</small>` : '-', course ? course.surface : ''],
    ['화장실·AED', `${fac.wc}·${fac.aed}`, '코스 위 시설'],
    ['보관함', `${fac.locker}`, '근처 매장 보관은 아래'],
  ].map(([k, v, d]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div><div class="d">${d}</div></div>`).join('');

  const notes = [];
  if (m.note) notes.push(`<div class="notice"><b>운영진 안내</b><br>${TR.esc(m.note)}</div>`);
  if (course && course.rule) notes.push(`<div class="notice warn"><b>장소 규칙</b><br>${TR.esc(course.rule)} <span class="xsmall muted">· 현장 안내문이 우선입니다.</span></div>`);
  $('#m-note').innerHTML = notes.join('<div class="mt8"></div>');

  // 원칙
  $('#m-principles ol').innerHTML = data.principles().map((p) => `<li>${TR.esc(p.t)}</li>`).join('');

  // 그룹 + 신청
  let pick = m.mine ? m.mine.group : (m.groups.find((g) => g.filled < g.cap) || m.groups[0]).name;
  function drawGroups() {
    $('#m-groups').innerHTML = m.groups.map((g) => {
      const full = g.filled >= g.cap;
      const seats = Array.from({ length: g.cap }, (_, i) => `<i class="${i < g.filled ? 'on' : ''}"></i>`).join('');
      return `<div class="group-row"><label>
        <span class="row" style="gap:8px"><input type="radio" name="grp" value="${TR.esc(g.name)}" ${g.name === pick ? 'checked' : ''} ${m.mine ? 'disabled' : ''} style="accent-color:var(--point);width:18px;height:18px"><b class="strong">${TR.esc(g.name)}</b></span>
        <span>${g.pace}/km</span><span class="seats">${seats}</span>
        <span class="small ${full ? 'danger-text' : 'strong'}">${full ? '마감·대기 가능' : `${g.filled}/${g.cap}명`}</span></label></div>`;
    }).join('');
    $$('#m-groups input').forEach((r) => r.onchange = () => { pick = r.value; drawApply(); });
  }
  function drawApply() {
    const box = $('#apply-box');
    if (m.cancelled) { box.innerHTML = '<button class="btn block" disabled>취소된 모임이에요</button>'; return; }
    if (m.mine) {
      box.innerHTML = `<div class="notice good"><b>${m.mine.status === '대기' ? '대기 신청' : '신청 완료'} · ${TR.esc(m.mine.group)}그룹</b><br>모임 2시간 전에 다시 알려 드려요. 못 가게 되면 꼭 미리 취소해 주세요.</div>
        <div class="row mt12"><button class="btn line" id="btn-cancel">신청 취소</button><a class="btn ghost" href="mypage.html#meetups">내 모임 보기</a></div>`;
      $('#agree').closest('label').classList.add('hide');
      $('#btn-cancel').onclick = () => TR.confirm('신청을 취소할까요?', '자리가 다음 대기자에게 넘어가요.', '신청 취소', () => {
        const apps = TR.myApps(); delete apps[m.id]; TR.ls.set('apps', apps); TR.toast('신청을 취소했어요'); reload();
      });
      return;
    }
    $('#agree').closest('label').classList.remove('hide');
    const g = m.groups.find((x) => x.name === pick);
    const full = g.filled >= g.cap;
    box.innerHTML = `<button class="btn block lg" id="btn-apply">${TR.esc(pick)}그룹(${g.pace}) ${full ? '대기 신청' : '신청하기'}</button>`;
    $('#btn-apply').onclick = () => {
      if (!$('#agree').checked) { TR.toast('함께 달리기 원칙 확인에 체크해 주세요'); $('#agree').focus(); return; }
      TR.user.require(() => {
        const apps = TR.myApps();
        apps[m.id] = { group: pick, status: full ? '대기' : '신청', at: new Date().toISOString() };
        TR.ls.set('apps', apps);
        TR.toast(full ? '대기 신청했어요. 자리가 나면 알려 드릴게요' : '신청했어요. 모임에서 만나요!');
        reload();
      }, '모임에 신청하려면 닉네임만 정해 주세요.');
    };
  }
  function reload() { m = data.meetup(id); drawGroups(); drawApply(); drawKv(); }

  function drawKv() {
    const until = new Date(m.at.getTime() - 60 * 60000);
    $('#m-kv').innerHTML = `
      <dt>언제</dt><dd>${fmt.rel(m.at)} · ${fmt.dateTime(m.at)}</dd>
      <dt>집결</dt><dd>${TR.esc(m.place)}</dd>
      <dt>거리</dt><dd>${m.distance}km${course ? ` · <a class="point-text" href="course.html?id=${course.id}">${TR.esc(course.name)}</a>` : ''}</dd>
      <dt>운영</dt><dd>${crew ? `<a href="crew.html?id=${crew.id}">${TR.esc(crew.name)}</a>` : TR.esc(m.host || '개인')}</dd>
      <dt>신청</dt><dd>${m.filled}/${m.cap}명 · ${fmt.hm(until)}까지</dd>`;
  }

  // 날씨
  TR.weatherCard($('#m-wx'), { lat: m.lat, lng: m.lng, name: hub.name, when: m.at });

  // 공유·캘린더
  $('#btn-share').onclick = () => TR.share(m.title, `${fmt.dateTime(m.at)} ${m.place}`, location.href);
  $('#btn-ics').onclick = () => TR.ics(`[오늘러닝] ${m.title}`, m.at, Math.round(m.distance * 9 + 30), m.place);

  // 출석(참가자 쪽 코드 입력)
  const isToday = new Date(m.at).toDateString() === new Date().toDateString();
  const att = TR.ls.get('attended', {});
  if (att[m.id]) $('#att-result').innerHTML = `<span class="good-text strong">${TR.icon('check', 'i14')} 출석 완료 (${fmt.hm(att[m.id])})</span>`;
  else if (!isToday) $('#att-result').innerHTML = '<span class="muted">출석은 모임 당일에 할 수 있어요.</span>';
  $('#att-btn').onclick = () => {
    if (!m.mine) { TR.toast('먼저 모임에 신청해 주세요'); return; }
    const v = $('#att-code').value.trim();
    if (TR.checkCode('att:' + m.id, v)) {
      att[m.id] = new Date().toISOString(); TR.ls.set('attended', att);
      $('#att-result').innerHTML = `<span class="good-text strong">${TR.icon('check', 'i14')} 출석했어요. 즐겁게 달리세요!</span>`;
    } else {
      $('#att-result').innerHTML = '<span class="danger-text">코드가 맞지 않아요. 운영진 화면의 최신 코드를 확인해 주세요.</span>';
    }
  };
  $('#m-admin').href = `crew-admin.html?meetup=${m.id}${m.crewId ? '&crew=' + m.crewId : ''}#attendance`;
  // 운영진 QR을 찍고 들어온 경우 코드 자동 입력
  if (TR.qs('att')) { $('#att-code').value = TR.qs('att'); if (m.mine && !att[m.id]) $('#att-btn').click(); else $('#m-attend').scrollIntoView({ block: 'center' }); }

  // 근처 러너 프렌들리 매장
  const stores = data.stores().filter((s) => s.hubId === m.hubId);
  if (stores.length) $('#m-stores').innerHTML = `<div class="section-title" style="margin:8px 0 12px"><h2 style="font-size:19px">달린 뒤 들르기 좋은 곳</h2><a class="more" href="stores.html">러너 매장 →</a></div><div class="grid c2">${stores.map((s) => ui.storeCard(s)).join('')}</div>`;

  drawGroups(); drawApply(); drawKv();
})();
