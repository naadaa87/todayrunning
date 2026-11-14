/* 코스 상세 (A-02 시설, A-03 장소 규칙, A-06 공유·내보내기) */
(function () {
  const { $, data, ui, fmt } = TR;
  const k = data.course(TR.qs('id') || 'k1');
  if (!k) { $('#main').innerHTML = `<div class="container section">${ui.empty('코스를 찾을 수 없어요', '', '<a class="btn" href="courses.html">코스 찾기</a>')}</div>`; return; }
  const hub = data.hub(k.hubId) || {};
  document.title = `${k.name} · 오늘러닝`;
  $('#k-name').textContent = k.name;
  $('#k-sub').textContent = `${hub.region || ''} · ${hub.name || ''}`;
  $('#k-chips').innerHTML = (k.mine ? '<span class="chip blue">내 코스</span>' : k.rep ? '<span class="chip point">지역 대표 코스</span>' : '') + `<span class="chip">${k.type}</span>${k.night ? '<span class="chip">야간 조명</span>' : ''}`;
  $('#k-stats').innerHTML = [['거리', `${k.km.toFixed(2)}<small>km</small>`], ['오르막', `${k.elev}<small>m</small>`], ['화장실·AED', `${k.facilities.wc}·${k.facilities.aed}`], ['급수·보관함', `${k.facilities.water}·${k.facilities.locker}`]]
    .map(([a, b]) => `<div class="stat"><div class="k">${a}</div><div class="v" style="font-size:24px">${b}</div></div>`).join('');
  $('#k-rule').innerHTML = k.rule ? `<div class="notice warn"><b>장소 규칙</b><br>${TR.esc(k.rule)}<br><span class="xsmall muted">현장 안내문이 우선입니다. 바뀐 규칙을 알고 계시면 제보해 주세요.</span></div>` : '<div class="notice gray small">등록된 장소 규칙이 없어요. 현장 안내문을 확인해 주세요.</div>';

  const map = TR.map.create($('#k-map'), { center: k.path[0], zoom: 15, wheel: true });
  let facLayer = null;
  if (map) {
    const line = L.polyline(k.path, { color: '#E8452C', weight: 6 }).addTo(map);
    L.marker(k.path[0], { icon: TR.map.label('출발', 'point') }).addTo(map);
    if (k.type === '왕복') L.marker(k.path[Math.floor(k.path.length / 2)], { icon: TR.map.label('반환') }).addTo(map);
    map.fitBounds(line.getBounds(), { padding: [30, 30] });
    facLayer = TR.map.facilities(map, k.hubId);
    $('#lay-fac').onchange = (e) => { if (e.target.checked) facLayer.addTo(map); else facLayer.remove(); };
  }

  const paces = ["5'00\"", "5'30\"", "6'00\"", "6'30\"", "7'00\"", "7'30\"", "8'00\""];
  const u = TR.user.get();
  $('#k-pace').innerHTML = paces.map((p) => `<option ${p === (u ? u.pace : "6'30\"") ? 'selected' : ''}>${p}</option>`).join('');
  const calc = () => { $('#k-time').textContent = fmt.time(TR.parsePace($('#k-pace').value) * k.km); };
  $('#k-pace').onchange = calc; calc();

  $('#k-meet').href = `meetup-new.html?course=${k.id}`;
  $('#k-edit').href = `course-builder.html?from=${k.id}`;
  $('#k-gpx').onclick = () => TR.download(`${k.name}.gpx`, TR.gpx(k.name, k.path), 'application/gpx+xml');
  $('#k-share').onclick = () => TR.share(k.name, `${k.km.toFixed(1)}km ${k.type} 코스`, location.href);

  const ms = data.meetups().filter((m) => m.courseId === k.id && !m.cancelled);
  if (ms.length) $('#k-meetups').innerHTML = `<div class="section-title" style="margin:8px 0 12px"><h2 style="font-size:19px">이 코스에서 열리는 모임</h2></div><div class="list">${ms.map(ui.meetRow).join('')}</div>`;
  const ss = data.stores().filter((s) => s.hubId === k.hubId);
  if (ss.length) $('#k-stores').innerHTML = `<div class="section-title" style="margin:8px 0 12px"><h2 style="font-size:19px">근처 러너 프렌들리 매장</h2></div><div class="grid c2">${ss.map((s) => ui.storeCard(s)).join('')}</div>`;
})();
