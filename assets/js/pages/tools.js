/* 러닝 도구 (E-01 스톱워치, E-03 페이스 미터, E-05 인터벌, E-06 페이스 계산기, E-07 나침반, E-08 화면 꺼짐 방지,
   E-09 날씨, E-13 심박 구간, E-14 메트로놈, E-15 기록 예측, E-16 페이스 밴드, E-20 트레드밀 환산) */
(function () {
  const { $, $$, fmt, esc } = TR;
  const nav = $('#tool-nav'), panel = $('#tool-panel');
  let cleanup = null;

  const RACES = [['5K', 5], ['10K', 10], ['하프', 21.0975], ['풀', 42.195]];
  const timeInputs = (id, h, m, s) => `<div class="time-inputs" id="${id}"><input class="input" type="number" min="0" max="99" value="${h}" aria-label="시"><span>:</span><input class="input" type="number" min="0" max="59" value="${m}" aria-label="분"><span>:</span><input class="input" type="number" min="0" max="59" value="${s}" aria-label="초"></div>`;
  const readTime = (id) => { const [h, m, s] = $$(`#${id} input`).map((i) => +i.value || 0); return h * 3600 + m * 60 + s; };
  const paceInputs = (id, m, s) => `<div class="time-inputs" id="${id}"><input class="input" type="number" min="1" max="20" value="${m}" aria-label="분"><span>'</span><input class="input" type="number" min="0" max="59" value="${s}" aria-label="초"><span>"/km</span></div>`;
  const readPace = (id) => { const [m, s] = $$(`#${id} input`).map((i) => +i.value || 0); return m * 60 + s; };
  const head = (t, d) => `<div class="row between wrap" style="align-items:flex-start"><div><h2>${t}</h2><p class="desc">${d}</p></div><label class="toggle-chip no-print" title="화면 꺼짐 방지"><input type="checkbox" id="wake" ${TR.wake.active ? 'checked' : ''}>화면 켜 두기</label></div>`;
  function bindWake() {
    const w = $('#wake'); if (!w) return;
    if (!TR.wake.supported) { w.closest('label').title = '이 브라우저는 지원하지 않아요'; }
    w.onchange = async () => { if (w.checked) { const ok = await TR.wake.on(); if (!ok) { w.checked = false; TR.toast('이 브라우저에서는 화면 켜 두기를 쓸 수 없어요'); } } else TR.wake.off(); };
  }

  const tools = [
    /* ---------- 스톱워치 ---------- */
    { id: 'stopwatch', name: '스톱워치·랩', icon: 'clock', render(p) {
      p.innerHTML = head('스톱워치·랩', '랩을 누르면 구간 기록이 쌓여요. 스페이스 키로 시작·정지할 수 있어요.') + `
        <div class="big-num mt24" id="sw">00:00.00</div>
        <div class="row mt24" style="justify-content:center"><button class="btn lg" id="sw-start" style="min-width:140px">시작</button><button class="btn lg line" id="sw-lap" style="min-width:120px" disabled>랩</button><button class="btn lg ghost" id="sw-reset">초기화</button></div>
        <div class="list lap-list mt24 hide" id="laps"></div>`;
      bindWake();
      let start = 0, acc = 0, run = false, raf = 0, laps = [];
      const now = () => acc + (run ? performance.now() - start : 0);
      const tick = () => { $('#sw').textContent = fmt.clock(now()); raf = requestAnimationFrame(tick); };
      const toggle = () => {
        run = !run;
        if (run) { start = performance.now(); tick(); if ($('#wake') && !TR.wake.active) { TR.wake.on().then((ok) => { if (ok && $('#wake')) $('#wake').checked = true; }); } } else { acc += performance.now() - start; cancelAnimationFrame(raf); $('#sw').textContent = fmt.clock(acc); }
        $('#sw-start').textContent = run ? '정지' : '계속'; $('#sw-start').className = 'btn lg ' + (run ? 'dark' : ''); $('#sw-lap').disabled = !run;
      };
      const drawLaps = () => {
        $('#laps').classList.toggle('hide', !laps.length);
        const best = Math.min(...laps.map((l) => l.split));
        $('#laps').innerHTML = laps.map((l, i) => `<div class="list-item"><b class="strong" style="width:40px">${i + 1}</b><span class="grow ${l.split === best && laps.length > 1 ? 'good-text strong' : ''}">${fmt.clock(l.split)}</span><span class="muted">${fmt.clock(l.total)}</span></div>`).reverse().join('');
      };
      $('#sw-start').onclick = toggle;
      $('#sw-lap').onclick = () => { const t = now(); const prev = laps.length ? laps[laps.length - 1].total : 0; laps.push({ split: t - prev, total: t }); TR.beep(1000, 80); drawLaps(); };
      $('#sw-reset').onclick = () => { if (run) toggle(); acc = 0; laps = []; $('#sw').textContent = '00:00.00'; $('#sw-start').textContent = '시작'; drawLaps(); };
      const key = (e) => { if (e.code === 'Space' && e.target === document.body) { e.preventDefault(); toggle(); } };
      document.addEventListener('keydown', key);
      return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', key); };
    } },

    /* ---------- 인터벌 ---------- */
    { id: 'interval', name: '인터벌 타이머', icon: 'bell', render(p) {
      const presets = [['입문 걷뛰', 0, 60, 120, 8, 0], ['1분/1분 ×10', 5, 60, 60, 10, 5], ['3분/2분 ×5', 10, 180, 120, 5, 5], ['400m 느낌 ×8', 10, 90, 60, 8, 5]];
      p.innerHTML = head('인터벌 타이머', '달리기와 쉬기를 번갈아 알려 줘요. 바뀔 때 소리·진동·음성으로 안내해요.') + `
        <div class="chips mt16">${presets.map((x, i) => `<button class="chip" data-pre="${i}" style="border:0;cursor:pointer">${x[0]}</button>`).join('')}</div>
        <div class="grid c3 mt16" id="iv-set">
          <label class="field"><span>준비 운동(분)</span><input class="input" type="number" id="iv-wu" min="0" value="5"></label>
          <label class="field"><span>달리기(초)</span><input class="input" type="number" id="iv-on" min="5" value="60"></label>
          <label class="field"><span>쉬기(초)</span><input class="input" type="number" id="iv-off" min="0" value="60"></label>
          <label class="field"><span>반복</span><input class="input" type="number" id="iv-n" min="1" value="10"></label>
          <label class="field"><span>마무리(분)</span><input class="input" type="number" id="iv-cd" min="0" value="5"></label>
          <div class="field"><span class="label">전체 시간</span><div class="strong" id="iv-total" style="height:46px;display:flex;align-items:center;font-size:20px"></div></div>
        </div>
        <div class="result mt24 hide" id="iv-run"><div class="k" id="iv-phase">준비</div><div class="big-num" id="iv-clock">0:00</div><div class="small muted" id="iv-meta"></div><div class="cap-bar mt12"><span id="iv-bar" style="width:0"></span></div></div>
        <div class="row mt24" style="justify-content:center"><button class="btn lg" id="iv-go" style="min-width:160px">시작</button><button class="btn lg line hide" id="iv-stop">그만하기</button></div>`;
      bindWake();
      const total = () => +$('#iv-wu').value * 60 + (+$('#iv-on').value + +$('#iv-off').value) * +$('#iv-n').value + +$('#iv-cd').value * 60;
      const showTotal = () => { $('#iv-total').textContent = fmt.time(total()); };
      $$('#iv-set input').forEach((i) => i.oninput = showTotal); showTotal();
      $$('[data-pre]').forEach((b) => b.onclick = () => { const x = presets[+b.dataset.pre]; ['wu', 'on', 'off', 'n', 'cd'].forEach((k, i) => { $('#iv-' + k).value = x[i + 1]; }); showTotal(); });
      let plan = [], idx = 0, left = 0, timer = null, paused = false;
      function build() {
        plan = [];
        if (+$('#iv-wu').value) plan.push(['준비 운동', +$('#iv-wu').value * 60]);
        for (let i = 1; i <= +$('#iv-n').value; i++) { plan.push([`달리기 ${i}/${$('#iv-n').value}`, +$('#iv-on').value]); if (+$('#iv-off').value && i < +$('#iv-n').value) plan.push([`쉬기 ${i}/${$('#iv-n').value}`, +$('#iv-off').value]); }
        if (+$('#iv-cd').value) plan.push(['마무리', +$('#iv-cd').value * 60]);
      }
      function enter(i) {
        idx = i; if (idx >= plan.length) { finish(true); return; }
        left = plan[idx][1]; const name = plan[idx][0];
        $('#iv-phase').textContent = name; $('#iv-phase').style.color = name.startsWith('달리기') ? 'var(--point)' : 'var(--gray)';
        TR.beep(name.startsWith('달리기') ? 1046 : 660, 300); TR.vibrate([200, 80, 200]); TR.say(name.replace(/ \d+\/\d+/, ''));
        draw();
      }
      function draw() {
        $('#iv-clock').textContent = fmt.time(left);
        const rest = plan.slice(idx + 1).reduce((s, x) => s + x[1], 0) + left;
        $('#iv-meta').textContent = `남은 전체 ${fmt.time(rest)} · 다음: ${plan[idx + 1] ? plan[idx + 1][0] : '끝'}`;
        $('#iv-bar').style.width = (100 - left / plan[idx][1] * 100) + '%';
      }
      function finish(done) {
        clearInterval(timer); timer = null; paused = false;
        $('#iv-go').textContent = '시작'; $('#iv-go').className = 'btn lg'; $('#iv-stop').classList.add('hide'); $('#iv-set').classList.remove('hide');
        if (done) { $('#iv-phase').textContent = '끝! 수고했어요'; $('#iv-clock').textContent = fmt.time(total()); TR.say('인터벌 끝. 수고했어요'); TR.beep(1318, 500); } else $('#iv-run').classList.add('hide');
      }
      $('#iv-go').onclick = () => {
        TR.audio();
        if (!timer && !paused) { build(); $('#iv-run').classList.remove('hide'); $('#iv-set').classList.add('hide'); $('#iv-stop').classList.remove('hide'); enter(0); }
        if (timer) { clearInterval(timer); timer = null; paused = true; $('#iv-go').textContent = '계속'; $('#iv-go').className = 'btn lg'; return; }
        paused = false; $('#iv-go').textContent = '일시정지'; $('#iv-go').className = 'btn lg dark';
        timer = setInterval(() => { left -= 1; if (left <= 3 && left > 0) TR.beep(880, 90); if (left <= 0) enter(idx + 1); else draw(); }, 1000);
      };
      $('#iv-stop').onclick = () => finish(false);
      return () => clearInterval(timer);
    } },

    /* ---------- 페이스 계산기 ---------- */
    { id: 'pace', name: '페이스 계산기', icon: 'tool', render(p) {
      p.innerHTML = head('페이스 계산기', '거리·시간·페이스 중 두 가지를 넣으면 나머지를 계산해요.') + `
        <div class="seg mt16" id="pc-mode"><button class="on" data-m="pace">페이스 구하기</button><button data-m="time">완주 시간 구하기</button><button data-m="dist">거리 구하기</button></div>
        <div class="field mt16" id="pc-dist-f"><span class="label">거리</span><div class="row wrap"><input class="input" type="number" id="pc-dist" step="0.01" value="10" style="width:120px"><span class="muted">km</span>${RACES.map(([n, d]) => `<button class="chip" data-d="${d}" style="border:0;cursor:pointer">${n}</button>`).join('')}</div></div>
        <div class="field mt16" id="pc-time-f"><span class="label">시간</span>${timeInputs('pc-time', 0, 55, 0)}</div>
        <div class="field mt16 hide" id="pc-pace-f"><span class="label">페이스</span>${paceInputs('pc-pace', 5, 30)}</div>
        <div class="grid c3 mt24" id="pc-out"></div>`;
      bindWake();
      let mode = 'pace';
      function calc() {
        const d = +$('#pc-dist').value, t = readTime('pc-time'), pc = readPace('pc-pace');
        let pace, time, dist;
        if (mode === 'pace') { dist = d; time = t; pace = t / d; }
        if (mode === 'time') { dist = d; pace = pc; time = pc * d; }
        if (mode === 'dist') { pace = pc; time = t; dist = t / pc; }
        const ok = isFinite(pace) && pace > 0 && isFinite(dist) && dist > 0;
        $('#pc-out').innerHTML = [
          [mode === 'pace' ? '페이스' : mode === 'time' ? '완주 시간' : '거리', ok ? (mode === 'pace' ? fmt.pace(pace) : mode === 'time' ? fmt.time(time) : dist.toFixed(2) + 'km') : '-'],
          ['속도', ok ? (3600 / pace).toFixed(1) + 'km/h' : '-'],
          ['트랙 400m 한 바퀴', ok ? fmt.time(pace * 0.4) : '-'],
        ].map(([k, v], i) => `<div class="result"><div class="k">${k}</div><div class="v" style="${i ? 'font-size:28px' : ''}">${v}</div></div>`).join('');
      }
      $$('#pc-mode button').forEach((b) => b.onclick = () => {
        mode = b.dataset.m; $$('#pc-mode button').forEach((x) => x.classList.toggle('on', x === b));
        $('#pc-dist-f').classList.toggle('hide', mode === 'dist'); $('#pc-time-f').classList.toggle('hide', mode === 'time'); $('#pc-pace-f').classList.toggle('hide', mode === 'pace'); calc();
      });
      $$('[data-d]').forEach((b) => b.onclick = () => { $('#pc-dist').value = b.dataset.d; calc(); });
      $$('#tool-panel input').forEach((i) => i.oninput = calc); calc();
    } },

    /* ---------- 기록 예측 ---------- */
    { id: 'predict', name: '기록 예측', icon: 'chart', render(p) {
      p.innerHTML = head('기록 예측', '최근 대회나 기록 측정 결과로 다른 거리의 완주 시간을 예측해요(리겔 공식).') + `
        <div class="form-grid mt16"><label class="field"><span>최근 기록 거리</span><select class="select" id="pr-d">${RACES.map(([n, d]) => `<option value="${d}" ${n === '10K' ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <div class="field"><span class="label">기록</span>${timeInputs('pr-t', 0, 55, 0)}</div></div>
        <div class="table-wrap mt24"><table class="table"><thead><tr><th>거리</th><th class="num">예상 기록</th><th class="num">평균 페이스</th></tr></thead><tbody id="pr-out"></tbody></table></div>
        <p class="xsmall muted mt12">긴 거리일수록 실제 기록과 차이가 커질 수 있어요. 풀코스는 장거리 훈련을 충분히 했을 때 가까워져요.</p>`;
      bindWake();
      const calc = () => {
        const d1 = +$('#pr-d').value, t1 = readTime('pr-t');
        $('#pr-out').innerHTML = RACES.map(([n, d]) => { const t = t1 * Math.pow(d / d1, 1.06); return `<tr><td class="strong">${n}</td><td class="num strong">${t1 ? fmt.time(t, true) : '-'}</td><td class="num">${t1 ? fmt.pace(t / d) : '-'}</td></tr>`; }).join('');
      };
      $$('#tool-panel input, #tool-panel select').forEach((i) => i.oninput = calc); calc();
    } },

    /* ---------- 페이스 밴드 ---------- */
    { id: 'band', name: '페이스 밴드', icon: 'flag', render(p) {
      p.innerHTML = head('페이스 밴드', '목표 기록에 맞춘 구간 통과 시간표예요. 인쇄해서 손목에 감거나 사진으로 저장하세요.') + `
        <div class="form-grid mt16 no-print"><label class="field"><span>거리</span><select class="select" id="bd-d">${RACES.map(([n, d]) => `<option value="${d}" ${n === '하프' ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
          <div class="field"><span class="label">목표 기록</span>${timeInputs('bd-t', 1, 59, 0)}</div>
          <div class="field full"><span class="label">전략</span><div class="seg" id="bd-s"><button class="on" data-s="0">일정하게</button><button data-s="2">후반 2% 빠르게</button><button data-s="4">후반 4% 빠르게</button></div></div></div>
        <div class="row between mt16"><b class="strong" id="bd-sum"></b><button class="btn line sm no-print" onclick="window.print()">${TR.icon('download')}인쇄</button></div>
        <div class="band-print mt12" id="bd-out"></div>`;
      bindWake();
      let neg = 0;
      const calc = () => {
        const D = +$('#bd-d').value, T = readTime('bd-t'); if (!T) return;
        const avg = T / D; const half = D / 2;
        // 전반은 avg*(1+neg/2%), 후반은 avg*(1-neg/2%)
        const a = avg * (1 + neg / 200), b = avg * (1 - neg / 200);
        const rows = []; let cum = 0;
        const step = D > 25 ? 1 : 1;
        for (let k = step; k < D + 0.001; k += step) {
          const seg = Math.min(step, D - (k - step));
          const pace = (k - step) < half ? a : b;
          cum += pace * seg; rows.push([`${k}km`, fmt.time(cum), fmt.pace(pace)]);
        }
        const rest = D - Math.floor(D);
        if (rest > 0.01) { cum += b * rest; rows.push([`${D === 42.195 ? '풀' : '하프'} 완주`, fmt.time(cum), fmt.pace(b)]); }
        $('#bd-sum').textContent = `평균 ${fmt.pace(avg)} · 전반 ${fmt.pace(a)} / 후반 ${fmt.pace(b)}`;
        const cols = rows.length > 22 ? 2 : 1; const per = Math.ceil(rows.length / cols);
        $('#bd-out').innerHTML = `<div style="display:grid;grid-template-columns:repeat(${cols},1fr)">${Array.from({ length: cols }, (_, c) => `<table>${rows.slice(c * per, (c + 1) * per).map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td class="muted small">${r[2]}</td></tr>`).join('')}</table>`).join('')}</div>`;
      };
      $$('#bd-s button').forEach((b) => b.onclick = () => { neg = +b.dataset.s; $$('#bd-s button').forEach((x) => x.classList.toggle('on', x === b)); calc(); });
      $('#bd-d').onchange = () => { const d = +$('#bd-d').value; const def = { 5: [0, 30, 0], 10: [0, 59, 0], 21.0975: [1, 59, 0], 42.195: [4, 29, 0] }[d]; $$('#bd-t input').forEach((i, j) => { i.value = def[j]; }); calc(); };
      $$('#bd-t input').forEach((i) => i.oninput = calc); calc();
    } },

    /* ---------- 심박 구간 ---------- */
    { id: 'zones', name: '심박 구간', icon: 'heart', render(p) {
      p.innerHTML = head('심박 구간', '나이와 안정 시 심박수로 훈련 구간을 계산해요(여유 심박 방식).') + `
        <div class="grid c3 mt16"><label class="field"><span>나이</span><input class="input" type="number" id="hz-age" value="35" min="10" max="90"></label>
          <label class="field"><span>안정 시 심박</span><input class="input" type="number" id="hz-rest" value="60" min="30" max="110"></label>
          <label class="field"><span>최대 심박(아는 경우)</span><input class="input" type="number" id="hz-max" placeholder="자동 계산"></label></div>
        <div class="mt24" id="hz-out"></div>
        <p class="xsmall muted mt12">최대 심박은 ‘208 − 0.7 × 나이’로 어림해요. 실제 값과 차이가 클 수 있으니 측정값이 있다면 넣어 주세요. 심장 질환이 있거나 약을 먹고 있다면 의사와 상의하세요.</p>`;
      bindWake();
      const Z = [['1구간 회복', .5, .6, '#9AA1AA', '대화가 편한 속도, 회복런'], ['2구간 기초 지구력', .6, .7, '#2F6FB0', '대부분의 쉬운 달리기'], ['3구간 템포', .7, .8, '#1E8E5A', '조금 숨이 찬 일정한 속도'], ['4구간 역치', .8, .9, '#B26A00', '10K~하프 대회 속도'], ['5구간 최대', .9, 1, '#E8452C', '짧은 인터벌, 전력']];
      const calc = () => {
        const age = +$('#hz-age').value, rest = +$('#hz-rest').value; const max = +$('#hz-max').value || Math.round(208 - 0.7 * age); const hrr = max - rest;
        $('#hz-out').innerHTML = `<div class="small muted mb8">최대 심박 ${max} · 여유 심박 ${hrr}</div>` + Z.map(([n, a, b, c, d]) => `<div class="zone"><b class="strong small">${n.split(' ')[0]}</b><div><div class="small strong">${n.split(' ').slice(1).join(' ')}</div><div class="xsmall muted">${d}</div><div class="bar mt8" style="background:${c};width:${a * 100}%"></div></div><b class="strong" style="text-align:right">${Math.round(rest + hrr * a)}~${Math.round(rest + hrr * b)} bpm</b></div>`).join('');
      };
      $$('#tool-panel input').forEach((i) => i.oninput = calc); calc();
    } },

    /* ---------- 단위·트레드밀 ---------- */
    { id: 'convert', name: '속도·트레드밀 환산', icon: 'route', render(p) {
      p.innerHTML = head('속도·트레드밀 환산', '페이스(분/km), 속도(km/h), 마일 페이스를 서로 바꿔요. 트레드밀 속도를 페이스로 볼 때 쓰세요.') + `
        <div class="grid c3 mt16"><div class="field"><span class="label">페이스(분/km)</span>${paceInputs('cv-pace', 6, 0)}</div>
          <label class="field"><span>속도(km/h)</span><input class="input" type="number" id="cv-kmh" step="0.1" value="10"></label>
          <div class="field"><span class="label">마일 페이스</span><div class="strong" id="cv-mile" style="height:46px;display:flex;align-items:center;font-size:20px"></div></div></div>
        <h3 class="mt24">트레드밀 속도표</h3>
        <div class="table-wrap mt12"><table class="table"><thead><tr><th class="num">km/h</th><th class="num">페이스</th><th class="num">5km</th><th class="num">10km</th></tr></thead><tbody id="cv-tb"></tbody></table></div>
        <p class="xsmall muted mt8">트레드밀은 바람 저항이 없어 경사를 1%쯤 주면 바깥 달리기와 비슷한 힘이 들어요.</p>`;
      bindWake();
      const fromPace = () => { const s = readPace('cv-pace'); if (s > 0) $('#cv-kmh').value = (3600 / s).toFixed(1); mile(); };
      const fromKmh = () => { const v = +$('#cv-kmh').value; if (v > 0) { const s = 3600 / v; const ins = $$('#cv-pace input'); ins[0].value = Math.floor(s / 60); ins[1].value = Math.round(s % 60) % 60; } mile(); };
      const mile = () => { const v = +$('#cv-kmh').value; $('#cv-mile').textContent = v > 0 ? fmt.pace(3600 / v * 1.609344).replace('"', '"/mi') : '-'; };
      $$('#cv-pace input').forEach((i) => i.oninput = fromPace); $('#cv-kmh').oninput = fromKmh; fromKmh();
      const sp = []; for (let v = 7; v <= 18; v += 0.5) sp.push(v);
      $('#cv-tb').innerHTML = sp.map((v) => `<tr><td class="num strong">${v.toFixed(1)}</td><td class="num">${fmt.pace(3600 / v)}</td><td class="num">${fmt.time(5 * 3600 / v)}</td><td class="num">${fmt.time(10 * 3600 / v)}</td></tr>`).join('');
    } },

    /* ---------- 메트로놈 ---------- */
    { id: 'metronome', name: '케이던스 메트로놈', icon: 'run', render(p) {
      p.innerHTML = head('케이던스 메트로놈', '1분에 몇 걸음을 디딜지 소리로 맞춰요. 보폭을 줄이고 발걸음을 빠르게 하면 무릎 부담을 줄이는 데 도움이 돼요.') + `
        <div class="big-num mt24"><span id="mt-bpm">170</span><small>spm</small></div>
        <div class="row mt16" style="justify-content:center"><button class="btn line" data-step="-5">−5</button><button class="btn line" data-step="-1">−1</button><input type="range" id="mt-range" min="140" max="200" value="170" style="width:220px;accent-color:var(--point)"><button class="btn line" data-step="1">+1</button><button class="btn line" data-step="5">+5</button></div>
        <div class="row mt24" style="justify-content:center"><div id="mt-dot" style="width:28px;height:28px;border-radius:14px;background:var(--line)"></div></div>
        <div class="row mt24" style="justify-content:center"><button class="btn lg" id="mt-go" style="min-width:160px">시작</button></div>
        <p class="small muted center mt16">처음에는 지금 케이던스에서 5% 정도만 올려 보세요.</p>`;
      bindWake();
      let bpm = 170, on = false, next = 0, n = 0, timer = null;
      const set = (v) => { bpm = TR.clamp(v, 140, 200); $('#mt-bpm').textContent = bpm; $('#mt-range').value = bpm; };
      $$('[data-step]').forEach((b) => b.onclick = () => set(bpm + +b.dataset.step));
      $('#mt-range').oninput = (e) => set(+e.target.value);
      function schedule() {
        const a = TR.audio(); if (!a) return;
        while (next < a.currentTime + 0.12) {
          const accent = n % 2 === 0; TR.beep(accent ? 1200 : 900, 40, accent ? 0.35 : 0.2, next);
          const delay = Math.max(0, (next - a.currentTime) * 1000);
          setTimeout(() => { const d = $('#mt-dot'); if (d) { d.style.background = 'var(--point)'; setTimeout(() => { if (d) d.style.background = 'var(--line)'; }, 60); } }, delay);
          next += 60 / bpm; n++;
        }
      }
      $('#mt-go').onclick = () => {
        on = !on; const a = TR.audio();
        if (on && a) { next = a.currentTime + 0.05; n = 0; timer = setInterval(schedule, 25); } else clearInterval(timer);
        $('#mt-go').textContent = on ? '멈추기' : '시작'; $('#mt-go').className = 'btn lg ' + (on ? 'dark' : '');
      };
      return () => clearInterval(timer);
    } },

    /* ---------- 나침반 ---------- */
    { id: 'compass', name: '나침반', icon: 'compass', render(p) {
      p.innerHTML = head('나침반', '휴대폰을 평평하게 들고 보세요. 처음 가는 코스에서 방향을 잡을 때 좋아요.') + `
        <div class="compass mt24"><div class="dial" id="cp-dial"><span style="left:50%;top:6px;transform:translateX(-50%);color:var(--point)">N</span><span style="right:10px;top:50%;transform:translateY(-50%)">E</span><span style="left:50%;bottom:6px;transform:translateX(-50%)">S</span><span style="left:10px;top:50%;transform:translateY(-50%)">W</span></div><div class="needle"></div></div>
        <div class="big-num md" id="cp-deg">-</div><div class="center strong" id="cp-dir"></div>
        <div class="row mt16" style="justify-content:center"><button class="btn" id="cp-go">나침반 켜기</button></div>
        <p class="small muted center mt12" id="cp-msg">컴퓨터에서는 방향 센서가 없어 쓸 수 없어요. 휴대폰에서 열어 주세요.</p>`;
      bindWake();
      const names = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
      const on = (e) => {
        let h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.absolute || e.type === 'deviceorientationabsolute') && e.alpha != null ? 360 - e.alpha : null;
        if (h == null) return;
        h = (h + 360) % 360;
        $('#cp-deg').textContent = Math.round(h) + '°'; $('#cp-dir').textContent = names[Math.round(h / 45) % 8] + '쪽';
        $('#cp-dial').style.transform = `rotate(${-h}deg)`; $('#cp-msg').textContent = '';
      };
      $('#cp-go').onclick = async () => {
        try { if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') { const r = await DeviceOrientationEvent.requestPermission(); if (r !== 'granted') { TR.toast('방향 센서 권한을 허용해 주세요'); return; } } } catch (e) { /* 무시 */ }
        window.addEventListener('deviceorientationabsolute', on); window.addEventListener('deviceorientation', on);
        $('#cp-go').textContent = '켜짐'; $('#cp-go').disabled = true;
      };
      return () => { window.removeEventListener('deviceorientationabsolute', on); window.removeEventListener('deviceorientation', on); };
    } },

    /* ---------- 속도계·페이스 미터 ---------- */
    { id: 'speed', name: '속도계·페이스 미터', icon: 'watch', render(p) {
      p.innerHTML = head('속도계·페이스 미터', 'GPS로 지금 속도와 페이스를 보여 줘요. 기록을 남기려면 ‘달리기’에서 시작하세요.') + `
        <div class="grid c2 mt24"><div class="result"><div class="k">지금 페이스</div><div class="v" id="sp-pace" style="font-size:52px">--'--"</div></div><div class="result"><div class="k">지금 속도</div><div class="v" id="sp-kmh" style="font-size:52px">0.0</div><div class="k">km/h</div></div></div>
        <div class="row mt16" style="justify-content:center"><button class="btn lg" id="sp-go" style="min-width:160px">측정 시작</button></div>
        <p class="small muted center mt12" id="sp-msg">위치 권한이 필요해요. 건물 안에서는 정확하지 않을 수 있어요.</p>
        <div class="center mt8"><a class="point-text strong" href="run.html">기록하며 달리기 →</a></div>`;
      bindWake();
      let wid = null, last = null, hist = [];
      $('#sp-go').onclick = () => {
        if (wid != null) { navigator.geolocation.clearWatch(wid); wid = null; $('#sp-go').textContent = '측정 시작'; $('#sp-go').className = 'btn lg'; return; }
        if (!navigator.geolocation) { TR.toast('이 브라우저는 위치를 지원하지 않아요'); return; }
        wid = navigator.geolocation.watchPosition((pos) => {
          const c = pos.coords; let v = c.speed;
          const pt = [c.latitude, c.longitude, pos.timestamp];
          if ((v == null || isNaN(v)) && last) { const d = TR.dist(last, pt) * 1000; const dt = (pt[2] - last[2]) / 1000; v = dt > 0 ? d / dt : 0; }
          last = pt; hist.push(v || 0); if (hist.length > 5) hist.shift();
          const avg = hist.reduce((s, x) => s + x, 0) / hist.length;
          $('#sp-kmh').textContent = (avg * 3.6).toFixed(1); $('#sp-pace').textContent = avg > 0.5 ? fmt.pace(1000 / avg) : "--'--\"";
          $('#sp-msg').textContent = `GPS 정확도 약 ${Math.round(c.accuracy)}m`;
        }, () => { TR.toast('위치 권한을 허용해 주세요'); }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
        $('#sp-go').textContent = '측정 멈추기'; $('#sp-go').className = 'btn lg dark';
      };
      return () => { if (wid != null) navigator.geolocation.clearWatch(wid); };
    } },

    /* ---------- 날씨 ---------- */
    { id: 'weather', name: '날씨 한눈에', icon: 'sun', render(p) {
      p.innerHTML = head('날씨 한눈에', '체감온도, 초미세먼지, 강수 확률, 바람을 오늘러닝 안내 단계로 보여 줘요.') + `
        <div class="row wrap mt16"><select class="select" id="wx-hub" style="width:auto">${TR.data.hubs().map((h) => `<option value="${h.id}">${h.region} · ${esc(h.name)}</option>`).join('')}</select><button class="btn line sm" id="wx-me">${TR.icon('pin')}내 위치</button></div>
        <div class="card mt16" id="wx-card"></div>
        <div class="table-wrap mt16"><table class="table"><thead><tr><th>시각</th><th class="num">체감</th><th class="num">강수</th><th>단계</th></tr></thead><tbody id="wx-hours"></tbody></table></div>`;
      bindWake();
      const load = async (lat, lng, name) => {
        TR.weatherCard($('#wx-card'), { lat, lng, name });
        try {
          const w = await TR.weather.get(lat, lng); const rows = [];
          for (let i = 1; i <= 12; i += 1) { const t = new Date(); t.setMinutes(0, 0, 0); t.setHours(t.getHours() + i * 2); const x = TR.weather.at(w, t); const st = TR.weather.stage(x); rows.push(`<tr><td>${fmt.rel(t)} ${fmt.hm(t)}</td><td class="num">${x.feels != null ? Math.round(x.feels) + '℃' : '-'}</td><td class="num">${x.pop != null ? x.pop + '%' : '-'}</td><td><span class="stage stage-${st.cls}" style="font-size:13.5px"><i></i>${st.label}</span></td></tr>`); }
          $('#wx-hours').innerHTML = rows.join('');
        } catch (e) { $('#wx-hours').innerHTML = '<tr><td colspan="4" class="muted">시간별 예보를 불러오지 못했어요.</td></tr>'; }
      };
      const byHub = () => { const h = TR.data.hub($('#wx-hub').value); load(h.lat, h.lng, h.name); };
      $('#wx-hub').onchange = byHub; byHub();
      $('#wx-me').onclick = () => navigator.geolocation && navigator.geolocation.getCurrentPosition((pp) => load(+pp.coords.latitude.toFixed(3), +pp.coords.longitude.toFixed(3), '내 위치'), () => TR.toast('위치 권한을 허용해 주세요'));
    } },
  ];

  // 도구함(즐겨찾기)
  const fav = () => TR.ls.get('toolFav', ['stopwatch', 'pace', 'interval']);
  function drawNav(cur) {
    const f = fav();
    nav.innerHTML = tools.map((t) => `<button data-t="${t.id}" class="${t.id === cur ? 'on' : ''}">${TR.icon(t.icon, 'i18')}<span>${t.name}</span><span class="star ${f.includes(t.id) ? 'on' : ''}" data-star="${t.id}" role="button" aria-label="도구함에 담기">${f.includes(t.id) ? '★' : '☆'}</span></button>`).join('');
    $$('#tool-nav [data-t]').forEach((b) => b.onclick = (e) => {
      if (e.target.dataset.star) { const f2 = fav(); const i = f2.indexOf(e.target.dataset.star); if (i >= 0) f2.splice(i, 1); else f2.push(e.target.dataset.star); TR.ls.set('toolFav', f2); TR.toast(i >= 0 ? '도구함에서 뺐어요' : '도구함에 담았어요'); drawNav(cur); return; }
      location.hash = b.dataset.t;
    });
  }
  function open() {
    const id = location.hash.slice(1); const t = tools.find((x) => x.id === id) || tools[0];
    if (cleanup) { try { cleanup(); } catch (e) { /* 무시 */ } cleanup = null; }
    drawNav(t.id);
    cleanup = t.render(panel) || null;
    document.title = `${t.name} · 러닝 도구 · 오늘러닝`;
    const used = TR.ls.get('toolRecent', []).filter((x) => x !== t.id); used.unshift(t.id); TR.ls.set('toolRecent', used.slice(0, 5));
  }
  window.addEventListener('hashchange', open);
  open();
})();
