/* 코스 찾기 (A-04), 지역 대표 코스 (A-05), 야간 안심 코스 (A-10) */
(function () {
  const { $, $$, data, ui } = TR;
  const u = TR.user.get();
  $('#f-region').innerHTML = ui.regionOptions(u && ['서울', '경기', '부산'].includes(u.region) ? u.region : '', true);
  const map = TR.map.create($('#map'), { center: [36.4, 127.8], zoom: 7, wheel: true });
  let layer = null; const lines = {};

  function card(k) {
    const hub = data.hub(k.hubId) || {};
    return `<a class="card hover" href="course.html?id=${k.id}" data-id="${k.id}">
      <div class="row between"><h3>${TR.esc(k.name)}</h3>${k.mine ? '<span class="chip blue">내 코스</span>' : k.rep ? '<span class="chip point">지역 대표</span>' : ''}</div>
      <p class="small muted mt8">${TR.esc(hub.region || '')} · ${TR.esc(hub.name || '')}</p>
      <div class="chips mt8"><span class="chip dark">${k.km.toFixed(1)}km</span><span class="chip">${k.type}</span><span class="chip">오르막 ${k.elev}m</span><span class="chip">${TR.esc(k.surface)}</span>${k.night ? '<span class="chip">야간 조명</span>' : ''}</div>
      <p class="small mt8">화장실 ${k.facilities.wc} · AED ${k.facilities.aed} · 급수 ${k.facilities.water} · 보관함 ${k.facilities.locker}</p>
      ${k.rule ? `<p class="small warn-text mt8">${TR.icon('flag', 'i14')} ${TR.esc(k.rule)}</p>` : ''}
    </a>`;
  }
  function render() {
    const r = $('#f-region').value, t = $('#f-type').value, d = $('#f-dist').value;
    const list = data.courses().filter((k) => {
      const hub = data.hub(k.hubId) || {};
      if (r && hub.region !== r) return false;
      if (t && k.type !== t) return false;
      if (d) { const [a, b] = d.split('-').map(Number); if (k.km < a || k.km > b) return false; }
      if ($('#f-night').checked && !k.night) return false;
      if ($('#f-locker').checked && !k.facilities.locker) return false;
      if ($('#f-mine').checked && !k.mine) return false;
      return true;
    });
    $('#list').innerHTML = list.length ? list.map(card).join('') : ui.empty('조건에 맞는 코스가 없어요', '', '<a class="btn" href="course-builder.html">직접 그리기</a>');
    if (!map) return;
    if (layer) layer.remove();
    layer = L.layerGroup().addTo(map);
    const all = [];
    list.forEach((k) => {
      const pl = L.polyline(k.path, { color: k.mine ? '#2F6FB0' : '#E8452C', weight: 4, opacity: .85 }).addTo(layer).bindPopup(`<b>${TR.esc(k.name)}</b><br>${k.km.toFixed(1)}km · ${k.type}<br><a href="course.html?id=${k.id}">자세히 보기</a>`);
      lines[k.id] = pl; all.push(...k.path);
    });
    if (all.length) map.fitBounds(all, { padding: [30, 30], maxZoom: 14 });
    $$('#list [data-id]').forEach((el) => {
      el.addEventListener('mouseenter', () => { const pl = lines[el.dataset.id]; if (pl) { pl.setStyle({ weight: 7 }); pl.bringToFront(); } });
      el.addEventListener('mouseleave', () => { const pl = lines[el.dataset.id]; if (pl) pl.setStyle({ weight: 4 }); });
    });
  }
  $$('#filters select, #filters input').forEach((el) => el.addEventListener('change', render));
  render();
})();
