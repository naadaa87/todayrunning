/* 크루 페이지 (C-01, C-03, C-12, P-18) */
(function () {
  const { $, $$, data, ui, fmt } = TR;
  const id = TR.qs('id') || 'c1';
  const c = data.crew(id);
  if (!c) { $('#main').innerHTML = `<div class="container section">${ui.empty('크루를 찾을 수 없어요', '', '<a class="btn" href="crews.html">크루 찾기</a>')}</div>`; return; }
  const hub = data.hub(c.hubId);
  document.title = `${c.name} · 오늘러닝`;
  $('#c-name').textContent = c.name;
  $('#c-sub').innerHTML = `${TR.esc(hub.region)} · ${TR.esc(hub.name)} · 멤버 <b class="strong">${c.members}명</b> · ${c.since}년부터`;
  $('#c-tags').innerHTML = (c.manner ? '<span class="chip good">매너 크루</span>' : '') + (c.beginner ? '<span class="chip point">입문 환영</span>' : '') + (c.tags || []).map((t) => `<span class="chip">${TR.esc(t)}</span>`).join('');
  $('#c-intro').textContent = c.intro;
  $('#c-kv').innerHTML = `<dt>정기 일정</dt><dd>${TR.esc(c.schedule)}</dd><dt>페이스</dt><dd>${c.paces}/km</dd><dt>주 활동지</dt><dd>${TR.esc(hub.name)}</dd><dt>운영 방식</dt><dd>${c.manner ? '소그룹 운영·귀환 확인' : '정기런'}</dd>`;
  $('#new-meet').href = `meetup-new.html`;
  $('#btn-admin').href = `crew-admin.html?crew=${c.id}`;

  const ms = data.meetups().filter((m) => m.crewId === c.id && !m.cancelled);
  $('#c-meetups').innerHTML = ms.length ? ms.map(ui.meetCard).join('') : `<div style="grid-column:1/-1">${ui.empty('예정된 모임이 없어요', '운영진이 곧 일정을 올릴 거예요.')}</div>`;

  // 가입
  const joined = TR.ls.get('joined', {});
  function drawJoin() {
    const st = joined[c.id];
    $('#btn-join').textContent = st ? (st === '대기' ? '가입 확인 중' : '가입한 크루') : '가입 신청';
    $('#btn-join').className = 'btn ' + (st ? 'line' : '');
  }
  $('#btn-join').onclick = () => TR.user.require(() => {
    if (joined[c.id]) {
      TR.confirm('가입 신청을 취소할까요?', `${TR.esc(c.name)} 가입 신청을 취소합니다.`, '취소하기', () => { delete joined[c.id]; TR.ls.set('joined', joined); drawJoin(); });
      return;
    }
    TR.modal({
      title: `${c.name} 가입 신청`,
      html: `<p class="small muted mb12">운영진이 확인하면 가입이 완료돼요. 처음이라면 게스트런에 한 번 와 보는 것도 좋아요.</p>
        <label class="field"><span>한마디(선택)</span><input class="input" id="j-msg" placeholder="예: 6분 30초 페이스로 달려요"></label>
        <label class="check mt16"><input type="checkbox" id="j-agree"><span>크루 규칙과 함께 달리기 원칙을 지키겠습니다.</span></label>`,
      actions: [{ label: '취소', cls: 'line' }, {
        label: '신청', onClick: (close) => {
          if (!$('#j-agree').checked) { TR.toast('원칙 확인에 체크해 주세요'); return false; }
          joined[c.id] = '대기'; TR.ls.set('joined', joined); close(); drawJoin(); TR.toast('가입 신청을 보냈어요');
        },
      }],
    });
  }, '크루에 가입하려면 닉네임이 필요해요.');
  drawJoin();
  $('#btn-share').onclick = () => TR.share(c.name, `${c.name} · ${c.schedule}`, location.href);

  // 공지
  const extra = TR.ls.get('notices', {})[c.id] || [];
  const notices = extra.concat((c.notices || []).map((t) => ({ text: t, at: null })));
  $('#tab-notice').innerHTML = notices.length ? `<div class="list">${notices.map((n) => `<div class="list-item"><span class="ico gray">${TR.icon('bell')}</span><div class="grow"><div class="title">${TR.esc(n.text)}</div><div class="meta">${n.at ? fmt.dateTime(n.at) : '운영진'}</div></div></div>`).join('')}</div>` : ui.empty('공지가 없어요');

  // 코스
  const cs = data.courses().filter((k) => k.hubId === c.hubId);
  $('#tab-course').innerHTML = cs.length ? `<div class="grid c2">${cs.map((k) => `<a class="card hover" href="course.html?id=${k.id}"><h3>${TR.esc(k.name)}</h3><p class="small muted mt8">${k.type} · ${k.km.toFixed(1)}km · 오르막 ${k.elev}m · ${k.surface}</p>${k.rule ? `<p class="small warn-text mt8">${TR.esc(k.rule)}</p>` : ''}</a>`).join('')}</div>` : ui.empty('등록된 코스가 없어요');

  // 제휴 매장
  const ss = data.stores().filter((s) => s.crew === c.id || s.hubId === c.hubId);
  $('#tab-store').innerHTML = ss.length ? `<div class="grid c3">${ss.map((s) => ui.storeCard(s) + (s.crew === c.id ? '' : '')).join('')}</div><p class="small muted mt12">크루와 제휴한 매장은 정기런 집결지로 쓰거나 단체 짐 보관을 받을 수 있어요.</p>` : ui.empty('제휴 매장이 없어요');

  $$('#tabs button').forEach((b) => b.onclick = () => {
    $$('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
    ['home', 'notice', 'course', 'store'].forEach((t) => $('#tab-' + t).classList.toggle('hide', t !== b.dataset.t));
  });
})();
