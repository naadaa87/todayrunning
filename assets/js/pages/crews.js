/* 크루 찾기 (B-08), 크루 만들기 (C-01) */
(function () {
  const { $, $$, data, ui } = TR;
  const u = TR.user.get();
  $('#f-region').innerHTML = ui.regionOptions(u && ['서울', '경기', '부산'].includes(u.region) ? u.region : '', true);

  function render() {
    const r = $('#f-region').value, q = $('#f-q').value.trim(), t = $('#f-time').value;
    const list = data.crews().filter((c) => {
      const hub = data.hub(c.hubId) || {};
      if (r && hub.region !== r) return false;
      if ($('#f-beginner').checked && !c.beginner) return false;
      if ($('#f-manner').checked && !c.manner) return false;
      if (t === 'dawn' && !/0[5-8]:|06|07/.test(c.schedule)) return false;
      if (t === 'night' && !/(월|화|수|목|금)[^토일]*(19|20|21):/.test(c.schedule)) return false;
      if (t === 'weekend' && !/[토일]/.test(c.schedule)) return false;
      if (q && ![c.name, hub.name, c.intro].join(' ').includes(q)) return false;
      return true;
    }).sort((a, b) => b.members - a.members);
    $('#count').textContent = `크루 ${list.length}곳`;
    $('#list').innerHTML = list.length ? list.map(ui.crewCard).join('') : `<div style="grid-column:1/-1">${ui.empty('조건에 맞는 크루가 없어요', '조건을 바꾸거나 직접 크루를 만들어 보세요.')}</div>`;
  }
  $$('#filters select, #filters input').forEach((el) => el.addEventListener(el.type === 'search' ? 'input' : 'change', render));
  render();

  $('#btn-new').onclick = () => TR.user.require((user) => {
    TR.modal({
      title: '크루 만들기',
      html: `<label class="field"><span>크루 이름</span><input class="input" id="c-name" maxlength="20" placeholder="예: 망원 저녁런"></label>
        <div class="form-grid mt16"><label class="field"><span>주 활동 장소</span><select class="select" id="c-hub">${ui.hubOptions('', '')}</select></label>
        <label class="field"><span>정기 일정</span><input class="input" id="c-sch" placeholder="예: 화·목 20:00"></label></div>
        <label class="field mt16"><span>소개</span><textarea class="textarea" id="c-intro" placeholder="어떤 분위기인지, 처음 오는 사람이 알아야 할 것을 적어 주세요."></textarea></label>
        <label class="check mt12"><input type="checkbox" id="c-beg" checked><span>입문 환영</span></label>`,
      actions: [{ label: '취소', cls: 'line' }, {
        label: '만들기', onClick: (close) => {
          const name = $('#c-name').value.trim(); if (!name) { TR.toast('크루 이름을 입력해 주세요'); return false; }
          const c = { id: 'uc' + TR.uid(), name, hubId: $('#c-hub').value, members: 1, since: new Date().getFullYear(), schedule: $('#c-sch').value.trim() || '일정 미정', paces: user.pace, beginner: $('#c-beg').checked, manner: false, intro: $('#c-intro').value.trim() || '새로 만든 크루예요.', tags: ['새 크루'], notices: [] };
          const list = TR.ls.get('crews', []); list.push(c); TR.ls.set('crews', list);
          user.adminCrew = c.id; TR.user.set(user);
          close(); TR.toast('크루를 만들었어요'); location.href = `crew.html?id=${c.id}`;
        },
      }],
    });
  }, '크루를 만들려면 닉네임이 필요해요.');
})();
