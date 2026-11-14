/* 러너 프렌들리 매장 찾기 (S-01, S-05) — 노출 순서: 거리·영업 여부·보관 가능·평가 (돈으로 바꾸지 않음) */
(function () {
  const { $, $$, data, ui } = TR;
  const u = TR.user.get();
  $('#f-region').innerHTML = ui.regionOptions('', true);
  const fillHub = () => { $('#f-hub').innerHTML = ui.hubOptions($('#f-region').value, '', true); };
  fillHub();
  if (TR.qs('hub')) { const h = data.hub(TR.qs('hub')); if (h) { $('#f-region').value = h.region; fillHub(); $('#f-hub').value = h.id; } }
  const map = TR.map.create($('#map'), { center: [36.4, 127.8], zoom: 7, wheel: true });
  let layer = null, me = null; const marks = {};

  function score(s) {
    let sc = 0;
    if (me) sc -= TR.dist(me, [s.lat, s.lng]) * 2;
    if (s.status.open) sc += 3;
    if (s.status.storage.cls === 'ok') sc += 2;
    sc += s.rating;
    return sc;
  }
  function render() {
    const r = $('#f-region').value, h = $('#f-hub').value, t = $('#f-type').value;
    const list = data.stores().filter((s) => (!r || s.region === r) && (!h || s.hubId === h) && (!t || s.type === t)
      && (!$('#f-storage').checked || s.status.storage.cls === 'ok') && (!$('#f-open').checked || s.status.open)
      && (!$('#f-shower').checked || s.amen.includes('샤워') || s.amen.includes('탈의실'))).sort((a, b) => score(b) - score(a));
    $('#list').innerHTML = list.length ? list.map((s) => ui.storeCard(s, { amen: true }).replace('<div class="row between"><span class="name">', `<div class="row between"><span class="name">${me ? `<span class="xsmall muted" style="font-weight:600">${TR.dist(me, [s.lat, s.lng]).toFixed(1)}km · </span>` : ''}`)).join('')
      : ui.empty('조건에 맞는 매장이 없어요', '보관 가능 조건을 끄거나 다른 지역을 골라 보세요.');
    if (!map) return;
    if (layer) layer.remove(); layer = L.layerGroup().addTo(map);
    const pts = [];
    list.forEach((s) => {
      const cls = s.status.storage.cls === 'ok' ? 'good' : s.status.open ? '' : 'gray';
      marks[s.id] = L.marker([s.lat, s.lng], { icon: TR.map.pin(s.status.storage.cls === 'ok' ? s.status.left : '', cls) }).addTo(layer)
        .bindPopup(`<b>${TR.esc(s.name)}</b><br>${TR.esc(s.benefit.title)}<br><span class="${s.status.storage.cls === 'ok' ? 'good-text' : 'muted'}">${s.status.storage.text}</span><br><a href="store.html?id=${s.id}">매장 보기</a>`);
      pts.push([s.lat, s.lng]);
    });
    if (me) { L.circleMarker(me, { radius: 8, color: '#fff', weight: 3, fillColor: '#2F6FB0', fillOpacity: 1 }).addTo(layer); pts.push(me); }
    if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
    $$('#list [data-id]').forEach((el) => el.addEventListener('mouseenter', () => { const m = marks[el.dataset.id]; if (m) m.openPopup(); }));
  }
  $('#f-region').addEventListener('change', () => { fillHub(); render(); });
  $$('#filters select, #filters input').forEach((el) => el.addEventListener('change', render));
  $('#near').onclick = () => {
    if (!navigator.geolocation) return TR.toast('이 브라우저는 위치를 지원하지 않아요');
    navigator.geolocation.getCurrentPosition((p) => { me = [p.coords.latitude, p.coords.longitude]; $('#f-region').value = ''; fillHub(); render(); TR.toast('가까운 순으로 정렬했어요'); }, () => TR.toast('위치 권한을 허용해 주세요'), { timeout: 10000 });
  };
  render();
})();
