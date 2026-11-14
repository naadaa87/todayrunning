/* 매장 상세 (S-02 매장 상세, S-06 짐 보관 예약, S-10 즐겨찾기·소식, S-11 매장 후기) */
(function () {
  const { $, data, ui, fmt } = TR;
  const s = data.store(TR.qs('id') || 's3');
  if (!s) { $('#main').innerHTML = `<div class="container section">${ui.empty('매장을 찾을 수 없어요', '', '<a class="btn" href="stores.html">매장 찾기</a>')}</div>`; return; }
  document.title = `${s.name} · 오늘러닝`;
  const crew = s.crew ? data.crew(s.crew) : null;
  $('#st-name').textContent = s.name;
  $('#st-sub').textContent = `${s.region} · ${s.hubName} · ${s.addr}`;
  $('#st-chips').innerHTML = `<span class="chip">${s.type}</span>${s.founding ? '<span class="chip point">파운딩 스토어</span>' : ''}<span class="chip">★ ${s.rating} (${s.reviews})</span><span class="chip ${s.status.open ? 'good' : ''}">${s.status.label}</span>`;
  $('#st-benefit').textContent = s.benefit.title;
  $('#st-cond').innerHTML = `조건: <b class="strong">${TR.esc(s.benefit.cond)}</b> · ${TR.esc(s.benefit.limit)} · 오늘러닝 앱 기록, 연동한 워치 기록, 크루 모임 출석으로 인증해요.`;
  const st = s.storage;
  $('#st-storage').innerHTML = st.cap ? `<div class="storage ${s.status.storage.cls}"><i></i>${s.status.storage.text}</div><div class="small muted mt8">전체 ${st.cap}자리 · ${TR.esc(st.size)}까지 · ${st.free ? '무료' : TR.esc(st.fee || '유료')}</div>` : '<div class="small muted">이 매장은 짐 보관을 하지 않아요.</div>';
  $('#st-hours').innerHTML = `<b class="strong">${s.open} ~ ${s.close}</b><div class="small muted mt8">${s.closedDay ? `매주 ${s.closedDay}요일 휴무` : '연중무휴'}</div>`;
  $('#st-amen').innerHTML = ['화장실', '물', '짐 보관', '탈의실', '샤워', '주차'].map((a) => `<span class="chip ${s.amen.includes(a) ? 'dark' : ''}" style="${s.amen.includes(a) ? '' : 'opacity:.45;text-decoration:line-through'}">${a}</span>`).join('');

  const map = TR.map.create($('#st-map'), { center: [s.lat, s.lng], zoom: 15 });
  if (map) {
    L.marker([s.lat, s.lng], { icon: TR.map.label(s.name, 'point') }).addTo(map);
    data.courses().filter((k) => k.hubId === s.hubId).forEach((k) => L.polyline(k.path, { color: '#1F2328', weight: 3, opacity: .45, dashArray: '6 6' }).addTo(map).bindPopup(TR.esc(k.name)));
  }

  // 소식
  const news = (s.news || []);
  if (news.length) $('#st-news').innerHTML = `<div class="card"><h3>매장 소식</h3>${news.map((n) => `<div class="row mt12"><span class="ico gray">${TR.icon('bell')}</span><div>${TR.esc(typeof n === 'string' ? n : n.text)}</div></div>`).join('')}</div>`;

  // 후기
  const base = [['한소윤', '짐 맡기고 서울숲 한 바퀴 돌고 와서 커피까지. 직원분들이 러너를 정말 반겨 줘요.', 5], ['오지후', '보관함이 넉넉해서 크루 정기런 끝나고 다 같이 들러요.', 5], ['윤서아', '주말 아침엔 자리가 금방 차요. 조금 일찍 오세요.', 4]];
  function drawReviews() {
    const mine = (TR.ls.get('reviews', {})[s.id] || []);
    const replies = TR.ls.get('replies', {})[s.id] || {};
    const all = mine.map((r) => [r.nick, r.text, r.rating, true]).concat(base);
    $('#st-rv-n').textContent = `${s.reviews + mine.length}개`;
    $('#st-reviews').innerHTML = all.map(([n, t, r, me], i) => `<div style="padding:12px 0;border-bottom:1px solid var(--line2)"><div class="row between"><b class="strong">${TR.esc(n)}${me ? ' <span class="chip point">내 후기</span>' : ''}</b><span class="small" style="color:var(--point)">${'★'.repeat(r)}<span style="color:var(--line)">${'★'.repeat(5 - r)}</span></span></div><p class="small mt8">${TR.esc(t)}</p>${replies[i] ? `<div class="notice gray small mt8"><b>매장 답글</b> ${TR.esc(replies[i])}</div>` : ''}</div>`).join('');
  }
  drawReviews();
  $('#st-rv-btn').onclick = () => TR.user.require((u) => TR.modal({
    title: '후기 쓰기',
    html: `<div class="field"><span class="label">별점</span><div class="seg" id="rv-star">${[5, 4, 3, 2, 1].map((n) => `<button class="${n === 5 ? 'on' : ''}" data-n="${n}">${'★'.repeat(n)}</button>`).join('')}</div></div>
      <label class="field mt16"><span>후기</span><textarea class="textarea" id="rv-text" placeholder="혜택, 보관, 분위기는 어땠나요?"></textarea></label>
      <p class="xsmall muted mt8">이 매장에서 인증 혜택을 받은 사람만 후기를 쓸 수 있어요(정식 서비스 기준).</p>`,
    onOpen: () => TR.$$('#rv-star button').forEach((b) => b.onclick = () => TR.$$('#rv-star button').forEach((x) => x.classList.toggle('on', x === b))),
    actions: [{ label: '취소', cls: 'line' }, { label: '올리기', onClick: (c) => {
      const t = $('#rv-text').value.trim(); if (!t) { TR.toast('후기를 적어 주세요'); return false; }
      const all = TR.ls.get('reviews', {}); (all[s.id] = all[s.id] || []).unshift({ nick: u.nick, text: t, rating: +TR.$('#rv-star .on').dataset.n, at: new Date().toISOString() });
      TR.ls.set('reviews', all); c(); drawReviews(); TR.toast('후기를 올렸어요');
    } }],
  }), '후기를 쓰려면 닉네임이 필요해요.');

  // 버튼
  $('#st-verify').href = `verify.html?store=${s.id}`;
  $('#st-route').href = `https://map.kakao.com/link/to/${encodeURIComponent(s.name)},${s.lat},${s.lng}`;
  $('#st-share').onclick = () => TR.share(s.name, s.benefit.title, location.href);
  const favs = TR.ls.get('storeFav', {});
  const drawFav = () => { $('#st-fav').innerHTML = `${TR.icon('star')}${favs[s.id] ? '소식 받는 중' : '소식 받기'}`; $('#st-fav').className = 'btn ' + (favs[s.id] ? '' : 'line'); };
  drawFav();
  $('#st-fav').onclick = () => TR.user.require(() => { if (favs[s.id]) delete favs[s.id]; else favs[s.id] = true; TR.ls.set('storeFav', favs); drawFav(); TR.toast(favs[s.id] ? '새 소식과 이벤트를 알려 드릴게요' : '소식 받기를 껐어요'); });
  if (!st.cap) $('#st-reserve').classList.add('hide');
  $('#st-reserve').onclick = () => TR.user.require((u) => {
    if (s.status.storage.cls === 'full') { TR.toast('지금은 보관 자리가 없어요'); return; }
    const t = new Date(Date.now() + 30 * 60000);
    if (!s.status.open) t.setHours(+s.open.split(':')[0] + 1, 0, 0, 0);
    TR.modal({
      title: `${s.name} 짐 보관 예약`,
      html: `<div class="form-grid"><label class="field"><span>도착 예정</span><input class="input" type="time" id="rs-t" value="${fmt.hm(t)}"></label><label class="field"><span>짐 크기</span><select class="select" id="rs-size"><option>작은 가방</option><option selected>백팩</option><option>운동가방</option>${/캐리어/.test(st.size) ? '<option>캐리어</option>' : ''}</select></label></div>
        <p class="small muted mt12">도착 예정 시간에서 30분이 지나면 예약이 풀려요. 짐을 찾을 땐 보관표 번호를 보여 주세요.</p>`,
      actions: [{ label: '취소', cls: 'line' }, { label: '예약', onClick: (c) => {
        const tt = $('#rs-t').value; const toMin = (x) => { const [h, mi] = x.split(':').map(Number); return h * 60 + mi; };
        if (!tt || toMin(tt) < toMin(s.open) || toMin(tt) >= toMin(s.close === '24:00' ? '23:59' : s.close)) { TR.toast(`영업시간(${s.open}~${s.close}) 안으로 골라 주세요`); return false; }
        const no = String(Math.floor(100 + Math.random() * 900));
        const r = TR.ls.get('reservations', []); r.push({ id: TR.uid(), store: s.id, nick: u.nick, time: $('#rs-t').value, size: $('#rs-size').value, no, status: '예약', at: new Date().toISOString() }); TR.ls.set('reservations', r);
        c(); TR.modal({ title: '예약했어요', html: `<div class="center"><div class="small muted">보관표 번호</div><div class="big-num md">${no}</div><p class="small mt8">${$('#rs-t') ? '' : ''}${TR.esc(s.name)}에 도착하면 직원에게 이 번호를 보여 주세요.</p></div>` });
      } }],
    });
  }, '보관 예약을 하려면 닉네임이 필요해요.');
  $('#st-crew').innerHTML = crew ? `<b class="strong">${TR.esc(crew.name)} 제휴 매장</b><p class="muted mt8">${TR.esc(crew.schedule)} 정기런 집결지예요. 크루원은 단체 보관을 우선 받을 수 있어요.</p><a class="point-text strong" href="crew.html?id=${crew.id}">크루 보기 →</a>` : '<b class="strong">크루 제휴 가능</b><p class="muted mt8">근처 크루와 제휴하면 정기런 집결지로 소개돼요.</p>';

  const ks = data.courses().filter((k) => k.hubId === s.hubId);
  if (ks.length) $('#st-courses').innerHTML = `<div class="section-title" style="margin:8px 0 12px"><h2 style="font-size:19px">근처 코스</h2></div><div class="grid c2">${ks.map((k) => `<a class="card hover" href="course.html?id=${k.id}"><h3>${TR.esc(k.name)}</h3><p class="small muted mt8">${k.type} · ${k.km.toFixed(1)}km · 오르막 ${k.elev}m</p></a>`).join('')}</div>`;
})();
