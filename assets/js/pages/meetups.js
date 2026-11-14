/* 모임 찾기 (B-07) */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  const all = data.meetups();
  const u = TR.user.get();
  const saved = TR.ss.get('meetFilter', {});

  $('#f-region').innerHTML = ui.regionOptions(saved.region || '', true);
  const fillHub = () => { $('#f-hub').innerHTML = ui.hubOptions($('#f-region').value, saved.hub || '', true); };
  fillHub();
  ['when', 'pace', 'dist', 'q'].forEach((k) => { if (saved[k]) $('#f-' + k).value = saved[k]; });
  ['beginner', 'guest', 'open'].forEach((k) => { $('#f-' + k).checked = !!saved[k]; });
  // 처음 방문하면 내 지역으로
  if (!saved.region && u && ['서울', '경기', '부산'].includes(u.region)) { $('#f-region').value = u.region; fillHub(); }

  let view = 'list', map = null, layer = null;

  function match(m) {
    const f = {
      region: $('#f-region').value, hub: $('#f-hub').value, when: $('#f-when').value, pace: $('#f-pace').value, dist: $('#f-dist').value,
      beginner: $('#f-beginner').checked, guest: $('#f-guest').checked, open: $('#f-open').checked, q: $('#f-q').value.trim(),
    };
    TR.ss.set('meetFilter', f);
    if (m.cancelled) return false;
    if (f.region && m.region !== f.region) return false;
    if (f.hub && m.hubId !== f.hub) return false;
    const d = m.at, now = new Date();
    const dayDiff = Math.floor((new Date(d).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    if (f.when === 'today' && dayDiff !== 0) return false;
    if (f.when === 'tomorrow' && dayDiff !== 1) return false;
    if (f.when === 'week' && dayDiff > 6) return false;
    if (f.when === 'weekend' && !(dayDiff <= 6 && (d.getDay() === 0 || d.getDay() === 6))) return false;
    if (f.when === 'morning' && d.getHours() >= 10) return false;
    if (f.when === 'evening' && d.getHours() < 18) return false;
    if (f.pace) {
      const target = +f.pace;
      const paces = m.groups.map((g) => TR.parsePace(g.pace));
      if (target === 330 && !paces.some((p) => p <= 345)) return false;
      if (target === 390 && !paces.some((p) => Math.abs(p - 390) <= 30)) return false;
      if (target === 450 && !paces.some((p) => Math.abs(p - 450) <= 30)) return false;
      if (target === 510 && !paces.some((p) => p >= 480)) return false;
    }
    if (f.dist) { const [a, b] = f.dist.split('-').map(Number); if (m.distance < a || m.distance > b) return false; }
    if (f.beginner && !m.beginner) return false;
    if (f.guest && !m.guest) return false;
    if (f.open && m.filled >= m.cap) return false;
    if (f.q) {
      const crew = m.crewId ? (data.crew(m.crewId) || {}).name : m.host;
      const hay = [m.title, crew, m.hubName, m.place].join(' ');
      if (!hay.includes(f.q)) return false;
    }
    return true;
  }

  function render() {
    const list = all.filter(match);
    $('#count').textContent = `모임 ${list.length}개`;
    $('#list').innerHTML = list.length ? list.map(ui.meetCard).join('') : `<div style="grid-column:1/-1">${ui.empty('조건에 맞는 모임이 없어요', '조건을 줄이거나 직접 모임을 열어 보세요.', '<a class="btn" href="meetup-new.html">모임 만들기</a>')}</div>`;
    if (view === 'map') drawMap(list);
  }

  function drawMap(list) {
    if (!map) { map = TR.map.create($('#map'), { center: [36.4, 127.8], zoom: 7, wheel: true }); }
    if (!map) return;
    if (layer) layer.remove();
    layer = L.layerGroup().addTo(map);
    const byHub = {};
    list.forEach((m) => { (byHub[m.hubId] = byHub[m.hubId] || []).push(m); });
    const pts = [];
    Object.entries(byHub).forEach(([hubId, ms]) => {
      const h = data.hub(hubId); if (!h) return;
      pts.push([h.lat, h.lng]);
      L.marker([h.lat, h.lng], { icon: TR.map.pin(ms.length) }).addTo(layer).bindPopup(
        `<b>${TR.esc(h.name)}</b><br>${ms.map((m) => `<a href="meetup.html?id=${m.id}">${fmt.rel(m.at)} ${fmt.hm(m.at)} ${TR.esc(m.title)}</a>`).join('<br>')}`);
    });
    setTimeout(() => { map.invalidateSize(); if (pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 13 }); }, 50);
  }

  $('#f-region').addEventListener('change', () => { saved.hub = ''; fillHub(); render(); });
  $$('#filters select, #filters input').forEach((el) => el.addEventListener(el.type === 'search' ? 'input' : 'change', render));
  $$('#view button').forEach((b) => b.onclick = () => {
    view = b.dataset.v; $$('#view button').forEach((x) => x.classList.toggle('on', x === b));
    $('#list').classList.toggle('hide', view !== 'list'); $('#mapwrap').classList.toggle('hide', view !== 'map');
    render();
  });
  render();
})();
