/* 매장 입점 안내 (P-01 입점 신청, P-02 러너 프렌들리 기준 점검) */
(function () {
  const { $, $$, ui } = TR;
  $('#ap-hub').innerHTML = ui.hubOptions('', '');
  const prev = TR.ls.get('application', null);
  if (prev) $('#ap-result').innerHTML = `<div class="notice good small"><b>${TR.esc(prev.name)}</b> 신청이 접수돼 있어요(${TR.fmt.ymd(prev.at)}). <a class="point-text strong" href="partner-center.html">파트너 센터 보기 →</a></div>`;
  function checkReq() {
    const n = $$('.ap-req').filter((x) => x.checked).length;
    return n === 3;
  }
  $$('.ap-req').forEach((x) => x.onchange = () => { $('#ap-result').innerHTML = checkReq() ? '<div class="notice good small"><b>필수 기준을 모두 갖췄어요.</b></div>' : ''; });
  $('#apply').onsubmit = (e) => {
    e.preventDefault();
    const name = $('#ap-name').value.trim();
    if (!name) { TR.toast('매장 이름을 입력해 주세요'); $('#ap-name').focus(); return; }
    if (!$('#ap-benefit').value.trim()) { TR.toast('러닝 인증 혜택을 적어 주세요'); $('#ap-benefit').focus(); return; }
    if (!checkReq()) { $('#ap-result').innerHTML = '<div class="notice warn small"><b>필수 기준 세 가지를 확인해 주세요.</b> 어려운 부분이 있으면 신청 후 매니저와 상의할 수 있어요.</div>'; return; }
    const app = { name, type: $('#ap-type').value, hubId: $('#ap-hub').value, addr: $('#ap-addr').value.trim(), benefit: $('#ap-benefit').value.trim(), cap: +$('#ap-cap').value || 0, contact: $('#ap-contact').value.trim(), opt: $$('.ap-opt').filter((x) => x.checked).map((x) => x.value), at: new Date().toISOString(), status: '현장 확인 대기' };
    TR.ls.set('application', app);
    TR.modal({ title: '입점 신청을 받았어요', html: `<p><b class="strong">${TR.esc(name)}</b> 신청이 접수됐어요. 지역 매니저가 현장 확인 일정을 잡으려고 연락드려요.</p><p class="small muted mt8">그동안 파트너 센터에서 혜택과 보관 설정을 미리 해 볼 수 있어요.</p>`,
      actions: [{ label: '닫기', cls: 'line' }, { label: '파트너 센터로', onClick: () => { location.href = 'partner-center.html'; } }] });
  };
})();
