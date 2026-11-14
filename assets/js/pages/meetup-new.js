/* 모임 만들기 (B-01 모임 만들기, B-02 페이스 그룹, B-03 소그룹 자동 편성, B-05 반복 일정, B-06 번개런, B-11 날씨 점검) */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  const u = TR.user.get();
  let kind = '정기';
  let wxTimer = null;
  const groups = [];
  const userPace = u ? TR.parsePace(u.pace) : 390;
  [userPace - 60, userPace, userPace + 60].forEach((p, i) => groups.push({ name: 'ABC'[i], pace: fmt.pace(p), cap: 5 }));

  // 운영 주체
  const crews = data.crews();
  $('#crew').innerHTML = `<option value="">개인으로 열기${u ? ` (${TR.esc(u.nick)})` : ''}</option>` + crews.map((c) => `<option value="${c.id}">${TR.esc(c.name)}${u && u.adminCrew === c.id ? ' (내 크루)' : ''}</option>`).join('');
  if (u && u.adminCrew) $('#crew').value = u.adminCrew;

  // 요일
  $('#weekdays').innerHTML = [1, 2, 3, 4, 5, 6, 0].map((d) => `<label class="toggle-chip"><input type="checkbox" value="${d}" ${d === 2 ? 'checked' : ''}>${fmt.weekday(d)}</label>`).join('');
  const tmr = new Date(); tmr.setDate(tmr.getDate() + 1);
  $('#date').value = `${tmr.getFullYear()}-${TR.pad(tmr.getMonth() + 1)}-${TR.pad(tmr.getDate())}`;
  $('#date').min = new Date().toISOString().slice(0, 10);

  // 장소·코스
  const pre = TR.qs('course') ? data.course(TR.qs('course')) : null;
  const preHub = pre ? data.hub(pre.hubId) : null;
  $('#region').innerHTML = ui.regionOptions(preHub ? preHub.region : (u && ['서울', '경기', '부산'].includes(u.region) ? u.region : '서울'));
  function fillHubs(sel) { $('#hub').innerHTML = ui.hubOptions($('#region').value, sel); fillCourses(); }
  function fillCourses(sel) {
    const cs = data.courses().filter((c) => c.hubId === $('#hub').value);
    $('#course').innerHTML = '<option value="">정해진 코스 없음</option>' + cs.map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${TR.esc(c.name)} (${c.km.toFixed(1)}km)</option>`).join('');
    syncCourse();
  }
  function syncCourse() {
    const c = data.course($('#course').value);
    if (c) $('#distance').value = c.km.toFixed(1);
    update();
  }
  fillHubs(preHub ? preHub.id : '');
  if (pre) fillCourses(pre.id);
  $('#region').onchange = () => fillHubs();
  $('#hub').onchange = () => fillCourses();
  $('#course').onchange = syncCourse;

  $('#note').value = '공공 보행로에서는 5명 이하 소그룹으로 나눠 2분 간격으로 출발합니다. 보행자가 먼저예요. 물병과 쓰레기는 꼭 챙겨 가 주세요.';

  // 종류
  $$('#kind button').forEach((b) => b.onclick = () => {
    kind = b.dataset.v; $$('#kind button').forEach((x) => x.classList.toggle('on', x === b));
    $('#repeat-box').classList.toggle('hide', kind !== '정기');
    $('#date-field').classList.toggle('hide', kind === '정기');
    if (kind === '입문') { $('#beginner').checked = true; $('#level').value = '입문'; }
    if (kind === '번개' && groups.length > 1) { groups.splice(1); groups[0].name = '번개'; drawGroups(); }
    update();
  });
  $('#date-field').classList.add('hide');

  // 그룹 편집
  function drawGroups() {
    $('#groups').innerHTML = groups.map((g, i) => `
      <div class="row mb8" data-i="${i}">
        <input class="input sm" style="width:90px" value="${TR.esc(g.name)}" data-k="name" aria-label="그룹 이름">
        <input class="input sm" style="width:110px" value="${TR.esc(g.pace)}" data-k="pace" aria-label="페이스" placeholder="6'30&quot;">
        <span class="small muted">/km</span>
        <input class="input sm" style="width:80px" type="number" min="1" max="60" value="${g.cap}" data-k="cap" aria-label="정원">
        <span class="small muted">명</span>
        <button type="button" class="btn ghost sm" data-del="${i}" aria-label="그룹 삭제" ${groups.length === 1 ? 'disabled' : ''}>${TR.icon('trash')}</button>
      </div>`).join('');
    $$('#groups input').forEach((inp) => inp.oninput = () => {
      const g = groups[+inp.closest('[data-i]').dataset.i];
      g[inp.dataset.k] = inp.dataset.k === 'cap' ? Math.max(1, +inp.value || 1) : inp.value;
      update();
    });
    $$('#groups [data-del]').forEach((b) => b.onclick = () => { groups.splice(+b.dataset.del, 1); drawGroups(); update(); });
  }
  $('#add-group').onclick = () => { const last = groups[groups.length - 1]; groups.push({ name: String.fromCharCode(65 + groups.length), pace: fmt.pace(TR.parsePace(last.pace) + 45), cap: 5 }); drawGroups(); update(); };
  drawGroups();

  // 소그룹 자동 편성 안내 (원칙 1)
  function splitInfo() {
    const total = groups.reduce((s, g) => s + g.cap, 0);
    const over = groups.filter((g) => g.cap > 5);
    const course = data.course($('#course').value);
    let html = '';
    if (over.length) {
      const plan = over.map((g) => { const n = Math.ceil(g.cap / 5); return `${TR.esc(g.name)}그룹 ${g.cap}명 → ${Array.from({ length: n }, (_, i) => `${TR.esc(g.name)}-${i + 1}`).join('·')}`; }).join('<br>');
      html += `<div class="notice ${total > 30 ? 'danger' : 'warn'}"><b>${total > 30 ? '30명이 넘는 모임은 소그룹 편성이 꼭 필요해요' : '5명이 넘는 그룹은 소그룹으로 나눠 출발해요'}</b><br>${plan}<br><span class="small">소그룹 사이 출발 간격은 2분으로 안내돼요.</span></div>`;
    } else {
      html += `<div class="notice good small"><b>좋아요.</b> 모든 그룹이 5명 이하라 그대로 출발할 수 있어요. 총 정원 ${total}명.</div>`;
    }
    if (course && course.rule && groups.some((g) => g.cap > 4)) html += `<div class="notice warn mt8 small"><b>장소 규칙 확인</b> ${TR.esc(course.rule)}</div>`;
    $('#split-info').innerHTML = html;
    $('#rule-warn').innerHTML = course && course.rule ? `<div class="notice warn small"><b>이 코스의 장소 규칙</b><br>${TR.esc(course.rule)}</div>` : '';
  }

  function draft() {
    const hub = data.hub($('#hub').value);
    const crewId = $('#crew').value || null;
    const wd = $$('#weekdays input:checked').map((x) => +x.value);
    const base = {
      title: $('#title').value.trim() || '이름을 정해 주세요', kind, crewId, host: crewId ? null : (u ? u.nick : '나'),
      time: $('#time').value || '19:30', hubId: hub.id, place: $('#place').value.trim() || hub.name, distance: +$('#distance').value || 5,
      courseId: $('#course').value || null, level: $('#level').value, beginner: $('#beginner').checked, guest: $('#guest').checked,
      note: $('#note').value.trim(), groups: groups.map((g) => ({ name: g.name || '-', pace: fmt.pace(TR.parsePace(g.pace)), cap: g.cap, filled: 0 })),
    };
    if (kind === '정기') return wd.map((d) => Object.assign({}, base, { weekday: d }));
    return [Object.assign({}, base, { date: $('#date').value })];
  }

  function update() {
    splitInfo();
    const ds = draft();
    if (!ds.length) { $('#preview').innerHTML = '<div class="notice warn small">반복할 요일을 하나 이상 골라 주세요.</div>'; return; }
    const d = Object.assign({ id: 'preview' }, ds[0]);
    const hub = data.hub(d.hubId);
    const at = d.date ? new Date(d.date + 'T' + d.time) : (function () { const [h, mi] = d.time.split(':').map(Number); for (let i = 0; i < 8; i++) { const x = new Date(); x.setDate(x.getDate() + i); x.setHours(h, mi, 0, 0); if (x.getDay() === d.weekday && x > new Date()) return x; } return new Date(); })();
    const pv = Object.assign({}, d, { at, hubName: hub.name, region: hub.region, cap: d.groups.reduce((s, g) => s + g.cap, 0), filled: 0 });
    $('#preview').innerHTML = ui.meetCard(pv).replace('<a ', '<div ').replace(/<\/a>$/, '</div>') + (ds.length > 1 ? `<p class="small muted mt8">매주 ${ds.map((x) => fmt.weekday(x.weekday)).join('·')}요일, 모임 ${ds.length}개가 만들어져요.</p>` : '');
    clearTimeout(wxTimer);
    wxTimer = setTimeout(() => {
      if (at - Date.now() < 60 * 3600 * 1000 && at > Date.now()) TR.weatherCard($('#wx'), { lat: hub.lat, lng: hub.lng, name: hub.name, when: at });
      else $('#wx').innerHTML = '<div class="small muted">3일 안 일정이면 그 시각의 날씨 기준을 미리 확인해 드려요. 모임 전날에도 운영진에게 다시 알려요.</div>';
    }, 400);
  }
  $$('#form input, #form select, #form textarea').forEach((el) => el.addEventListener('input', update));
  $('#weekdays').addEventListener('change', update);

  $('#form').onsubmit = (e) => {
    e.preventDefault();
    if (!$('#title').value.trim()) { TR.toast('모임 이름을 입력해 주세요'); $('#title').focus(); return; }
    const ds = draft();
    if (!ds.length) { TR.toast('반복할 요일을 골라 주세요'); return; }
    if (kind !== '정기' && new Date(ds[0].date + 'T' + ds[0].time) < new Date()) { TR.toast('지난 시간으로는 모임을 열 수 없어요'); return; }
    TR.user.require((user) => {
      const list = TR.ls.get('meetups', []);
      const ids = ds.map((d) => { d.id = 'u' + TR.uid(); if (!d.crewId) d.host = user.nick; list.push(d); return d.id; });
      TR.ls.set('meetups', list);
      TR.toast('모임을 열었어요. 신청 링크를 공유해 보세요');
      setTimeout(() => { location.href = `meetup.html?id=${ids[0]}`; }, 600);
    }, '모임을 열려면 닉네임이 필요해요.');
  };
  update();
})();
