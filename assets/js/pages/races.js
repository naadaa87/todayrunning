/* 대회 캘린더 (J-01), 접수 알림 (J-02), 공정 원칙 (J-04) */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  $('#f-region').innerHTML = ui.regionOptions('', true);
  const saved = TR.ls.get('races', {});
  const day = (s) => new Date(s + 'T00:00:00');
  function status(r) {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    if (day(r.date) < now) return ['종료', ''];
    if (day(r.regOpen) > now) return ['접수 예정', 'blue'];
    if (day(r.regClose) >= now) return ['접수 중', 'point'];
    return ['접수 마감', ''];
  }
  function render() {
    const rg = $('#f-region').value, ds = $('#f-dist').value, st = $('#f-status').value, only = $('#f-saved').checked;
    const list = data.races().map((r) => Object.assign(r, { st: status(r) })).filter((r) => (!rg || r.region === rg) && (!ds || r.dist.includes(ds)) && (!st || r.st[0] === st) && (!only || saved[r.id]) && r.st[0] !== '종료');
    const byMonth = {};
    list.forEach((r) => { const k = r.date.slice(0, 7); (byMonth[k] = byMonth[k] || []).push(r); });
    $('#list').innerHTML = list.length ? Object.entries(byMonth).map(([k, rs]) => `
      <h2 style="font-size:19px;margin:24px 0 12px">${k.slice(0, 4)}년 ${+k.slice(5)}월</h2>
      <div class="list">${rs.map((r) => {
        const dd = Math.round((day(r.date) - new Date().setHours(0, 0, 0, 0)) / 86400000);
        return `<div class="list-item">
          <div class="center" style="width:58px;flex:0 0 58px"><div style="font-size:24px;font-weight:800;color:var(--ink)">${+r.date.slice(8)}</div><div class="xsmall muted">${fmt.weekday(day(r.date).getDay())}요일</div></div>
          <div class="grow"><div class="title">${TR.esc(r.name)}</div><div class="meta">${r.region} · ${TR.esc(r.place)} · ${r.dist.join(' · ')} · ${r.fee}</div>
            <div class="meta">접수 ${fmt.ymd(r.regOpen)} ~ ${fmt.ymd(r.regClose)} · 대회까지 D-${dd}</div></div>
          <span class="chip ${r.st[1]}">${r.st[0]}</span>
          <button class="btn ${saved[r.id] ? '' : 'line'} sm" data-save="${r.id}">${TR.icon('bell')}${saved[r.id] ? '알림 받는 중' : '알림 받기'}</button>
        </div>`;
      }).join('')}</div>`).join('') : ui.empty('조건에 맞는 대회가 없어요', '다른 조건으로 찾아보세요.');
    $$('[data-save]').forEach((b) => b.onclick = () => TR.user.require(() => {
      const id = b.dataset.save;
      if (saved[id]) delete saved[id]; else saved[id] = { at: new Date().toISOString() };
      TR.ls.set('races', saved);
      TR.toast(saved[id] ? '접수 시작과 마감 사흘 전에 알려 드릴게요' : '알림을 껐어요');
      render();
    }, '대회 알림을 받으려면 닉네임이 필요해요.'));
  }
  $$('#filters select, #filters input').forEach((el) => el.addEventListener('change', render));
  render();
})();
