/* 홈 */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  const meetups = data.meetups().filter((m) => !m.cancelled);

  // 오늘의 달리기 조건(지역 선택)
  const wxEl = $('#wx-home');
  function loadWx(hubId) {
    const h = data.hub(hubId);
    TR.weatherCard(wxEl, { lat: h.lat, lng: h.lng, name: h.name, compact: true });
  }
  const u = TR.user.get();
  const startHub = u && u.region === '경기' ? 'gwanggyo' : u && u.region === '부산' ? 'gwangalli' : 'yeouido';
  $$('#wx-region button').forEach((b) => {
    b.classList.toggle('on', b.dataset.r === startHub);
    b.onclick = () => { $$('#wx-region button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); loadWx(b.dataset.r); };
  });
  loadWx(startHub);

  // 곧 열리는 모임(48시간 안)
  const soon = meetups.filter((m) => m.at - Date.now() < 48 * 3600 * 1000).slice(0, 4);
  $('#soon').innerHTML = soon.length ? soon.map(ui.meetRow).join('') : '<div class="list-item muted small">48시간 안에 열리는 모임이 없어요.</div>';

  // 이번 주 모임
  $('#week-meetups').innerHTML = meetups.slice(0, 6).map(ui.meetCard).join('');

  // 매장
  const stores = data.stores().filter((s) => s.founding).sort((a, b) => (b.status.left > 0) - (a.status.left > 0) || b.rating - a.rating).slice(0, 3);
  $('#home-stores').innerHTML = stores.map((s) => ui.storeCard(s)).join('');

  // 원칙
  $('#home-principles').innerHTML = data.principles().map((p) => `<li>${TR.esc(p.t)}</li>`).join('');
})();
