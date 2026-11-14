/* 가이드 (K-01 매너 가이드, I-01 입문 프로그램, G-06 안전 가이드, G-01 날씨 기준, K-07 공공 러닝 행사, K-03 신고) */
(function () {
  const { $, data } = TR;
  $('#pr-rows').innerHTML = data.principles().map((p, i) => `<tr><td><b class="strong">${i + 1}.</b> ${TR.esc(p.t)}</td><td class="muted">${TR.esc(p.a)}</td></tr>`).join('');
  $('#report-btn').onclick = () => TR.user.require(() => TR.modal({
    title: '신고하기',
    html: `<label class="field"><span>무엇에 대한 신고인가요</span><select class="select" id="rp-k"><option>모임 중 매너 위반</option><option>괴롭힘·원치 않는 연락</option><option>사진 무단 게시</option><option>잘못된 장소·코스 정보</option><option>매장 혜택·보관 문제</option><option>기타</option></select></label>
      <label class="field mt16"><span>대상(모임·크루·매장 이름)</span><input class="input" id="rp-t"></label>
      <label class="field mt16"><span>내용</span><textarea class="textarea" id="rp-d"></textarea></label>`,
    actions: [{ label: '취소', cls: 'line' }, { label: '보내기', onClick: (c) => { if (!$('#rp-d').value.trim()) { TR.toast('내용을 적어 주세요'); return false; } c(); TR.toast('신고를 받았어요. 운영팀이 확인 후 알려 드릴게요'); } }],
  }), '신고하려면 닉네임이 필요해요.');
  if (location.hash) setTimeout(() => { const el = document.querySelector(location.hash); if (el) el.scrollIntoView(); }, 50);
})();
