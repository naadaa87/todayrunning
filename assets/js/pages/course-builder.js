/* 코스 짜기 (A-01), 공유·내보내기 (A-06), 파일 가져오기 (H-08) */
(function () {
  const { $, data, ui, fmt } = TR;
  const u = TR.user.get();
  const from = TR.qs('from') ? data.course(TR.qs('from')) : null;
  let pts = from ? from.path.map((p) => p.slice()) : [];
  let editId = from && from.mine ? from.id : null;
  if (from) $('#name').value = from.mine ? from.name : `${from.name} (수정)`;

  const startHub = from ? data.hub(from.hubId) : data.hub(u && u.region === '경기' ? 'gwanggyo' : u && u.region === '부산' ? 'gwangalli' : 'yeouido');
  $('#jump').innerHTML = '<option value="">장소로 이동</option>' + data.hubs().map((h) => `<option value="${h.id}">${h.region} · ${TR.esc(h.name)}</option>`).join('');
  const map = TR.map.create($('#map'), { center: [startHub.lat, startHub.lng], zoom: 15, wheel: true });
  if (!map) return;
  const line = L.polyline([], { color: '#E8452C', weight: 6, opacity: .9 }).addTo(map);
  const wpLayer = L.layerGroup().addTo(map);
  let facLayer = TR.map.facilities(map, startHub.id);

  const paces = ["5'00\"", "5'30\"", "6'00\"", "6'30\"", "7'00\"", "7'30\"", "8'00\""];
  $('#pace').innerHTML = paces.map((p) => `<option ${p === (u ? u.pace : "6'30\"") ? 'selected' : ''}>${p}</option>`).join('');

  function shape() {
    if (pts.length < 2) return '-';
    if (TR.dist(pts[0], pts[pts.length - 1]) < 0.05) {
      const n = pts.length; const half = Math.floor(n / 2);
      const isBack = n > 4 && pts.slice(0, half).every((p, i) => TR.dist(p, pts[n - 1 - i]) < 0.02);
      return isBack ? '왕복' : '순환';
    }
    return '편도';
  }
  function nearestHub() {
    if (!pts.length) return startHub;
    return data.hubs().map((h) => [h, TR.dist([h.lat, h.lng], pts[0])]).sort((a, b) => a[1] - b[1])[0][0];
  }
  function facCount(hub) {
    const c = { wc: 0, aed: 0, water: 0, locker: 0 };
    data.facilities(hub.id).forEach((f) => { if (pts.some((p) => TR.dist(p, [f.lat, f.lng]) < 0.35)) c[f.kind]++; });
    return c;
  }
  function draw() {
    line.setLatLngs(pts);
    wpLayer.clearLayers();
    if (pts.length <= 60) pts.forEach((p, i) => {
      const last = i === pts.length - 1;
      const mk = L.marker(p, { draggable: true, icon: L.divIcon({ className: '', html: `<div class="wp ${i === 0 ? 'start' : ''}">${i === 0 ? 'S' : last ? 'F' : i}</div>`, iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(wpLayer);
      mk.on('drag', (e) => { const ll = e.target.getLatLng(); pts[i] = [+ll.lat.toFixed(6), +ll.lng.toFixed(6)]; line.setLatLngs(pts); stats(); });
      mk.on('dragend', draw);
      mk.on('contextmenu', () => { pts.splice(i, 1); draw(); });
    });
    stats();
  }
  function stats() {
    const km = TR.pathKm(pts);
    $('#s-km').innerHTML = `${km.toFixed(2)}<small>km</small>`;
    $('#s-type').textContent = shape();
    $('#s-time').textContent = fmt.time(TR.parsePace($('#pace').value) * km);
    const hub = nearestHub();
    const far = pts.length ? TR.dist([hub.lat, hub.lng], pts[0]) : 0;
    const rule = (data.courses().find((k) => k.hubId === hub.id && k.rule && !k.mine) || {}).rule;
    const fc = facCount(hub);
    $('#s-near').innerHTML = pts.length < 2 ? '<span class="muted">지도를 눌러 출발점부터 찍어 보세요.</span>'
      : `<div class="muted">${far < 3 ? `가까운 장소: <b class="strong">${TR.esc(hub.name)}</b>` : '등록된 장소와 멀어요'}</div>
         ${far < 3 ? `<div class="mt8">코스 가까이 화장실 ${fc.wc} · AED ${fc.aed} · 급수 ${fc.water} · 보관함 ${fc.locker}</div>` : ''}
         ${rule && far < 3 ? `<div class="notice warn mt8 small"><b>근처 장소 규칙</b><br>${TR.esc(rule)}</div>` : ''}`;
  }
  map.on('click', (e) => { pts.push([+e.latlng.lat.toFixed(6), +e.latlng.lng.toFixed(6)]); draw(); });
  $('#pace').onchange = stats;
  $('#b-undo').onclick = () => { pts.pop(); draw(); };
  $('#b-clear').onclick = () => { if (!pts.length) return; TR.confirm('코스를 지울까요?', '찍은 지점이 모두 사라져요.', '지우기', () => { pts = []; draw(); }); };
  $('#b-loop').onclick = () => { if (pts.length < 3) { TR.toast('지점을 세 개 이상 찍어 주세요'); return; } if (TR.dist(pts[0], pts[pts.length - 1]) > 0.01) pts.push(pts[0].slice()); draw(); };
  $('#b-back').onclick = () => { if (pts.length < 2) { TR.toast('지점을 두 개 이상 찍어 주세요'); return; } pts = pts.concat(pts.slice(0, -1).reverse()); draw(); };
  $('#jump').onchange = () => { const h = data.hub($('#jump').value); if (!h) return; map.setView([h.lat, h.lng], 15); facLayer.remove(); facLayer = TR.map.facilities(map, h.id); if (!$('#lay-fac').checked) facLayer.remove(); };
  $('#lay-fac').onchange = (e) => { if (e.target.checked) facLayer.addTo(map); else facLayer.remove(); };
  $('#b-loc').onclick = () => {
    if (!navigator.geolocation) { TR.toast('이 브라우저는 위치를 지원하지 않아요'); return; }
    navigator.geolocation.getCurrentPosition((p) => { map.setView([p.coords.latitude, p.coords.longitude], 16); }, () => TR.toast('위치 권한을 허용해 주세요'), { enableHighAccuracy: true, timeout: 10000 });
  };
  $('#b-gpx').onclick = () => { if (pts.length < 2) { TR.toast('먼저 코스를 그려 주세요'); return; } const n = $('#name').value.trim() || '오늘러닝 코스'; TR.download(`${n}.gpx`, TR.gpx(n, pts), 'application/gpx+xml'); };
  $('#f-gpx').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const g = TR.parseGpx(await f.text());
    if (g.path.length < 2) { TR.toast('GPX에서 경로를 찾지 못했어요'); return; }
    pts = g.path; if (g.name && !$('#name').value) $('#name').value = g.name;
    draw(); map.fitBounds(pts, { padding: [30, 30] }); TR.toast(`지점 ${pts.length}개를 불러왔어요`);
  };
  $('#b-save').onclick = () => {
    if (pts.length < 2) { TR.toast('지점을 두 개 이상 찍어 주세요'); return; }
    const name = $('#name').value.trim(); if (!name) { TR.toast('코스 이름을 정해 주세요'); $('#name').focus(); return; }
    TR.user.require(() => {
      const hub = nearestHub();
      const t = shape();
      const rule = (data.courses().find((k) => k.hubId === hub.id && k.rule && !k.mine) || {}).rule || '';
      const list = TR.ls.get('courses', []);
      const c = { id: editId || 'uk' + TR.uid(), name, hubId: hub.id, type: t === '-' ? '편도' : t, elev: 0, surface: '미확인', night: false, rep: false, mine: true, facilities: facCount(hub), rule, path: pts };
      const i = list.findIndex((x) => x.id === c.id); if (i >= 0) list[i] = c; else list.push(c);
      TR.ls.set('courses', list); editId = c.id;
      TR.toast('내 코스로 저장했어요');
      const b = $('#b-meet'); b.href = `meetup-new.html?course=${c.id}`; b.classList.remove('hide');
    }, '코스를 저장하려면 닉네임이 필요해요.');
  };
  draw();
  if (pts.length > 1) map.fitBounds(pts, { padding: [30, 30] });
})();
