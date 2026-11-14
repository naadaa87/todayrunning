/* 귀가 공유 받는 화면 (F-04, F-05) — 앱 없이 웹 링크로 확인 */
(function () {
  const { $, fmt } = TR;
  let d = null;
  try { d = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1))))); } catch (e) { d = null; }
  if (!d) {
    $('#sh-title').textContent = '링크를 열 수 없어요';
    $('#sh-sub').textContent = '주소가 잘렸거나 잘못된 링크예요. 보낸 사람에게 다시 받아 주세요.';
    $('#sh-map').classList.add('hide');
    return;
  }
  const start = new Date(d.s), eta = new Date(d.e), sent = new Date(d.t);
  const now = new Date();
  const late = Math.round((now - eta) / 60000);
  $('#sh-title').textContent = d.a ? `${d.n}님이 도착했어요` : `${d.n}님이 귀가 공유 중이에요`;
  $('#sh-sub').textContent = `${fmt.dateTime(start)}에 달리기를 시작했어요.`;
  let st;
  if (d.a) st = `<div class="notice good"><b>무사히 도착했어요.</b> ${fmt.hm(sent)}에 도착을 알렸어요.</div>`;
  else if (late > 10) st = `<div class="notice danger"><b>도착 예정 시간이 ${late}분 지났어요.</b> 전화해서 괜찮은지 확인해 보세요.</div>`;
  else if (late > 0) st = `<div class="notice warn"><b>도착 예정 시간이 조금 지났어요.</b> 곧 도착할 수 있어요.</div>`;
  else st = `<div class="notice"><b>${fmt.hm(eta)}쯤 도착 예정이에요.</b> ${Math.max(0, -late)}분 남았어요.</div>`;
  $('#sh-status').innerHTML = st;
  $('#sh-stats').innerHTML = [['출발', fmt.hm(start)], ['도착 예정', fmt.hm(eta)], ['위치 보낸 시각', `${fmt.hm(sent)}<div class="xsmall muted">${Math.max(0, Math.round((now - sent) / 60000))}분 전</div>`]]
    .map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v" style="font-size:24px">${v}</div></div>`).join('');
  if (d.la != null) {
    const map = TR.map.create($('#sh-map'), { center: [d.la, d.lo], zoom: d.b ? 13 : 16 });
    if (map) {
      if (d.b) L.circle([d.la, d.lo], { radius: 700, color: '#E8452C', weight: 1, fillOpacity: .12 }).addTo(map).bindPopup('집 주변이라 대략적인 위치만 보여요');
      else L.marker([d.la, d.lo], { icon: TR.map.label(`${d.n} · ${fmt.hm(sent)}`, 'point') }).addTo(map);
    }
  } else {
    $('#sh-map').innerHTML = '<div class="empty" style="height:100%;display:flex;align-items:center;justify-content:center">위치를 받지 못했어요</div>';
  }
})();
