// Sign Bridge 웹 화면 (역할 4). 데이터 형식은 web/README.md 참고.
const $ = (s) => document.querySelector(s);
const HANDS = [
  { id: 1, dir: '세움' }, { id: 2, dir: '왼쪽' }, { id: 3, dir: '오른쪽' }, { id: 4, dir: '뒤집기' },
];
const STEP_MS = 1200;

// ---------- 데이터 연결: ?ws=ws://주소 가 있으면 진짜 서버, 없으면 가짜 데이터 ----------
function wsBus(url) {
  const fns = []; let ws; const queue = [];
  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => { setConn(true); while (queue.length) ws.send(queue.shift()); };
    ws.onmessage = (e) => { try { const m = JSON.parse(e.data); fns.forEach((f) => f(m)); } catch {} };
    ws.onclose = () => { setConn(false); setTimeout(open, 2000); };
  };
  open();
  return { on: (f) => fns.push(f), send: (m) => { const s = JSON.stringify(m); ws.readyState === 1 ? ws.send(s) : queue.push(s); }, real: true };
}

// 가짜 PC + 가짜 인식기: 역할 1·3이 보낼 메시지를 같은 형식으로 흉내 낸다
function mockBus() {
  const fns = []; const emit = (m) => setTimeout(() => fns.forEach((f) => f(m)), 0);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const handFor = (j) => (j.charCodeAt(0) % 4) + 1; // shortcut: 가짜 배정, 역할 1의 글자별 담당 표로 교체
  let run = 0;
  async function play(seq) {
    const my = ++run, t0 = performance.now();
    for (let i = 0; i < seq.length; i++) {
      if (my !== run) return;
      const hand = Hangul.SCREEN_ONLY.has(seq[i]) ? null : handFor(seq[i]);
      emit({ type: 'step', i, jamo: seq[i], hand, state: 'start' });
      await wait(STEP_MS);
      emit({ type: 'step', i, jamo: seq[i], hand, state: 'end' });
      await wait(250);
    }
    if (my === run) emit({ type: 'done', ms: Math.round(performance.now() - t0) });
  }
  return {
    on: (f) => fns.push(f),
    send: async (m) => {
      if (m.type === 'express') play(m.seq);
      if (m.type === 'demo') play([m.jamo]);
      if (m.type === 'cancel') run++;
      if (m.type === 'recognize') { // 사용자가 손을 2초쯤 들고 있다고 치고 70% 확률로 정답
        await wait(2200);
        const ok = Math.random() < 0.7;
        const letter = ok ? m.jamo : Hangul.BASIC[Math.floor(Math.random() * 24)];
        emit({ type: 'recog', jamo: letter, prob: +(0.6 + Math.random() * 0.39).toFixed(2), ms: 300 + Math.round(Math.random() * 500) });
      }
    },
    real: false,
  };
}

const params = new URLSearchParams(location.search);
const bus = params.get('ws') ? wsBus(params.get('ws')) : mockBus();
function setConn(ok) {
  const el = $('#conn');
  el.textContent = !bus || !bus.real ? '가짜 데이터' : ok ? 'PC 연결됨' : 'PC 연결 끊김';
  el.className = 'text-xs px-2.5 py-1 rounded-full border ' +
    (!bus || !bus.real ? 'border-white/15 text-zinc-400' : ok ? 'border-emerald-400/40 text-emerald-300' : 'border-rose-400/40 text-rose-300');
}
setConn(false);

// ---------- 기록 (S-05): 이 브라우저에만 저장 ----------
let log = [];
try { log = JSON.parse(localStorage.getItem('sb-log') || '[]'); } catch {}
function addLog(kind, text, ms, ok) {
  log.unshift({ t: Date.now(), kind, text, ms, ok });
  log = log.slice(0, 200);
  try { localStorage.setItem('sb-log', JSON.stringify(log)); } catch {}
  renderDash();
}

// ---------- 손 상태 (F-08) ----------
const handState = Object.fromEntries(HANDS.map((h) => [h.id, { state: 'idle', jamo: '' }]));
let listener = null; // 지금 화면이 받는 step/done/recog 처리기
bus.on((m) => {
  if (m.type === 'step' && m.hand) handState[m.hand] = { state: m.state === 'start' ? 'moving' : 'idle', jamo: m.jamo };
  if (m.type === 'error') { handState[m.hand] = { state: 'error', jamo: m.msg || '' }; addLog('오류', `손 ${m.hand}: ${m.msg || ''}`, null, false); }
  renderHands();
  if (listener) listener(m);
});

// ---------- 탭 ----------
let tab = 'express';
function show(name) {
  tab = name;
  document.querySelectorAll('.view').forEach((v) => (v.hidden = v.dataset.view !== name));
  document.querySelectorAll('.tab').forEach((b) => {
    b.className = 'tab px-4 py-1.5 rounded-full ' + (b.dataset.tab === name ? 'bg-accent text-zinc-950 font-semibold' : 'text-zinc-300 hover:bg-white/5');
  });
  if (name !== 'learn') stopCam();
  if (name === 'dash') renderDash();
  try { localStorage.setItem('sb-tab', name); } catch {}
}
$('#tabs').addEventListener('click', (e) => e.target.dataset.tab && show(e.target.dataset.tab));

// ---------- 표현 모드 ----------
function jamoChip(j, robot, cls = '') {
  return `<span class="jamo ${cls} inline-grid place-items-center w-12 h-14 rounded-xl text-2xl font-bold border ${robot ? 'border-white/10 bg-white/5' : 'border-dashed border-white/25'}">${j}</span>`;
}
function stageHTML(item, hand) {
  if (!item) return '';
  const handTxt = hand ? `손 ${hand} · ${HANDS[hand - 1].dir}` : '화면에 그림으로 표시';
  return `
    <div class="rounded-2xl border border-white/10 bg-white/[.03] p-6 flex items-center gap-6">
      <span class="text-7xl md:text-8xl font-bold text-accent leading-none">${item.jamo}</span>
      <div><p class="text-zinc-400 text-sm">지금 표현 중</p><p class="text-lg font-semibold mt-1">${handTxt}</p>
      <p class="text-zinc-500 text-sm mt-1">'${item.syllable}' 글자의 자모</p></div>
    </div>
    <div class="rounded-2xl border ${hand ? 'border-white/10' : 'border-dashed border-accent/50'} p-6 grid place-items-center text-center text-zinc-400 text-sm min-h-[8rem]">
      ${hand ? `<span><iconify-icon icon="solar:hand-shake-linear" class="text-3xl text-zinc-300"></iconify-icon><br>AI Hand ${hand}번이 동작 중입니다</span>`
             : `<span><iconify-icon icon="solar:gallery-linear" class="text-3xl text-accent"></iconify-icon><br>'${item.jamo}' 지문자 그림 자리<br><span class="text-zinc-500">AI Hand로 표현하기 어려운 글자입니다</span></span>`}
    </div>`;
}
let expressing = false;
$('#expressForm').addEventListener('submit', (e) => {
  e.preventDefault();
  if (expressing) return;
  const word = $('#wordInput').value.trim();
  const { seq, skipped } = Hangul.toJamo(word);
  if (!seq.length) { $('#expressMsg').textContent = '한글 단어를 입력해 주세요.'; return; }
  $('#expressMsg').textContent = skipped.length ? `한글이 아닌 글자(${skipped.join(' ')})는 건너뜁니다.` : `${seq.length}개 자모를 차례로 보여 줍니다.`;
  $('#strip').innerHTML = seq.map((s, i) => jamoChip(s.jamo, s.robot, `j${i}`)).join('');
  $('#stage').innerHTML = '';
  expressing = true; $('#expressBtn').disabled = true;
  listener = (m) => {
    if (m.type === 'step') {
      const chip = $('#strip .j' + m.i);
      if (m.state === 'start') { chip.classList.add('now', 'bg-accent', 'text-zinc-950'); $('#stage').innerHTML = stageHTML(seq[m.i], m.hand); }
      else { chip.classList.remove('now', 'bg-accent', 'text-zinc-950'); chip.classList.add('opacity-50'); }
    }
    if (m.type === 'done') {
      expressing = false; $('#expressBtn').disabled = false; $('#stage').innerHTML = '';
      $('#expressMsg').textContent = `완료했습니다. ${(m.ms / 1000).toFixed(1)}초 걸렸어요.`;
      addLog('표현', word, m.ms, true);
    }
  };
  bus.send({ type: 'express', word, seq: seq.map((s) => s.jamo) });
});

// 음성 입력 (F-02): 크롬 내장 음성 인식, 인터넷 필요
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
$('#micBtn').addEventListener('click', () => {
  if (!SR) { $('#expressMsg').textContent = '이 브라우저는 음성 입력을 지원하지 않습니다. 크롬에서 열어 주세요.'; return; }
  const rec = new SR(); rec.lang = 'ko-KR'; rec.interimResults = false;
  $('#micLabel').textContent = '듣는 중…';
  rec.onresult = (e) => { $('#wordInput').value = e.results[0][0].transcript.replace(/[.?!\s]/g, ''); };
  rec.onerror = (e) => { $('#expressMsg').textContent = e.error === 'not-allowed' ? '마이크 권한을 허용해 주세요.' : '음성을 인식하지 못했습니다. 다시 말해 주세요.'; };
  rec.onend = () => { $('#micLabel').textContent = '음성 입력'; };
  rec.start();
});

// ---------- 학습 모드 ----------
let stream = null;
async function startCam() {
  if (stream) return true;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    $('#cam').srcObject = stream; $('#camMsg').hidden = true; return true;
  } catch { $('#camMsg').hidden = false; $('#camMsg').textContent = '카메라를 켤 수 없습니다. 브라우저 권한을 확인해 주세요.'; return false; }
}
function stopCam() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; $('#camMsg').hidden = false; $('#camMsg').textContent = '글자를 고르면 카메라가 켜집니다'; } }
const STEPS = ['시범 보기', '따라 하기', '결과'];
function setStep(n) {
  $('#learnSteps').innerHTML = STEPS.map((s, i) =>
    `<li class="px-3 py-1.5 rounded-full border ${i === n ? 'border-accent text-accent' : i < n ? 'border-white/10 text-zinc-300' : 'border-white/10 text-zinc-500'}">${i + 1}. ${s}</li>`).join('');
}
function learnResult(html) { $('#learnResult').innerHTML = html; }
$('#letterGrid').innerHTML = Hangul.BASIC.map((j) =>
  `<button data-j="${j}" class="aspect-square rounded-xl border ${Hangul.SCREEN_ONLY.has(j) ? 'border-dashed border-white/25' : 'border-white/10 bg-white/5'} text-xl font-bold hover:border-accent focus-visible:outline focus-visible:outline-accent">${j}</button>`).join('');
setStep(-1);
learnResult('<p class="text-zinc-500">점선 글자는 AI Hand 대신 화면 그림으로 시범을 보입니다.</p>');
let learning = false;
$('#letterGrid').addEventListener('click', async (e) => {
  const j = e.target.dataset.j; if (!j || learning) return;
  learning = true; setStep(0);
  learnResult(`<div><p class="text-8xl font-bold text-accent">${j}</p><p class="text-zinc-400 mt-2">AI Hand 시범을 잘 보세요</p></div>`);
  listener = async (m) => {
    if (m.type === 'done') {
      setStep(1);
      learnResult(`<div><p class="text-6xl font-bold">${j}</p><p class="text-zinc-300 mt-2">카메라 앞에서 손 모양을 만들고 잠시 멈춰 주세요</p></div>`);
      await startCam();
      bus.send({ type: 'recognize', jamo: j });
    }
    if (m.type === 'recog') {
      const ok = m.jamo === j; setStep(2); learning = false;
      learnResult(ok
        ? `<div><iconify-icon icon="solar:check-circle-bold" class="text-6xl text-emerald-400"></iconify-icon><p class="text-2xl font-bold mt-2">정답입니다</p><p class="text-zinc-400 text-sm mt-1">확신도 ${Math.round(m.prob * 100)}% · ${m.ms}ms</p></div>`
        : `<div><iconify-icon icon="solar:close-circle-bold" class="text-6xl text-rose-400"></iconify-icon><p class="text-2xl font-bold mt-2">다시 해 볼까요</p><p class="text-zinc-300 mt-1">'${m.jamo}'(으)로 인식됐어요</p><p class="text-zinc-500 text-sm mt-1">같은 글자를 다시 누르면 시범부터 다시 봅니다</p></div>`);
      addLog('학습', j, m.ms, ok);
    }
  };
  bus.send({ type: 'demo', jamo: j });
});

// ---------- 맞히기 (S-04) ----------
const QUIZ_WORDS = ['사랑', '나라', '하늘', '가지', '오리', '우유', '거리', '바지', '자리', '소리', '구두', '노래'];
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
$('#quizBtn').addEventListener('click', () => {
  const [answer, ...rest] = shuffle(QUIZ_WORDS);
  const choices = shuffle([answer, ...rest.slice(0, 3)]);
  $('#quizBtn').disabled = true; $('#quizChoices').innerHTML = '';
  $('#quizMsg').textContent = 'AI Hand를 보세요…';
  const t0 = performance.now();
  listener = (m) => {
    if (m.type === 'step' && m.state === 'start') $('#quizMsg').textContent = m.hand ? `손 ${m.hand}이(가) 움직이는 중` : '화면 그림을 보세요';
    if (m.type !== 'done') return;
    $('#quizMsg').textContent = '어떤 단어였을까요?';
    $('#quizChoices').innerHTML = choices.map((c) => `<button data-c="${c}" class="py-4 rounded-xl border border-white/10 bg-white/5 text-xl font-bold hover:border-accent">${c}</button>`).join('');
    $('#quizChoices').onclick = (e) => {
      const c = e.target.dataset.c; if (!c) return;
      const ok = c === answer;
      $('#quizMsg').textContent = ok ? '정답입니다!' : `아쉬워요. 정답은 '${answer}'입니다.`;
      $('#quizChoices').onclick = null; $('#quizBtn').disabled = false;
      addLog('맞히기', answer, Math.round(performance.now() - t0), ok);
    };
  };
  bus.send({ type: 'express', word: answer, seq: Hangul.toJamo(answer).seq.map((s) => s.jamo) });
});

// ---------- 대시보드 ----------
function renderHands() {
  $('#hands').innerHTML = HANDS.map((h) => {
    const s = handState[h.id];
    const pill = { idle: ['대기', 'bg-zinc-700 text-zinc-200'], moving: ['동작 중', 'bg-accent text-zinc-950'], error: ['오류', 'bg-rose-500 text-white'] }[s.state];
    return `<div class="rounded-2xl border border-white/10 p-4">
      <div class="flex items-center justify-between"><span class="font-semibold">손 ${h.id}</span><span class="text-xs px-2 py-0.5 rounded-full ${pill[1]}">${pill[0]}</span></div>
      <p class="text-zinc-500 text-sm">${h.dir}</p>
      <p class="text-4xl font-bold mt-3 h-10">${s.state === 'moving' ? s.jamo : ''}</p></div>`;
  }).join('');
}
function renderDash() {
  if (tab !== 'dash') return;
  renderHands();
  const ex = log.filter((r) => r.kind === '표현');
  const learn = log.filter((r) => r.kind === '학습');
  const avg = ex.length ? (ex.reduce((a, r) => a + r.ms, 0) / ex.length / 1000).toFixed(1) + '초' : '–';
  const rate = learn.length ? Math.round((learn.filter((r) => r.ok).length / learn.length) * 100) + '%' : '–';
  const stats = [['표현한 단어', ex.length], ['평균 표현 시간', avg], ['학습 정답률', rate], ['오류', log.filter((r) => r.kind === '오류').length]];
  $('#stats').innerHTML = stats.map(([k, v]) => `<div class="rounded-2xl bg-white/[.03] border border-white/10 p-4"><p class="text-zinc-400 text-sm">${k}</p><p class="text-2xl font-bold mt-1 tabular-nums">${v}</p></div>`).join('');
  $('#logBody').innerHTML = log.length ? log.map((r) => `<tr class="border-t border-white/5">
      <td class="px-4 py-2 text-zinc-400">${new Date(r.t).toLocaleTimeString('ko-KR')}</td><td class="px-4 py-2">${r.kind}</td>
      <td class="px-4 py-2 font-semibold">${r.text}</td><td class="px-4 py-2">${r.ms == null ? '–' : r.ms + 'ms'}</td>
      <td class="px-4 py-2">${r.ok ? '<span class="text-emerald-300">성공</span>' : '<span class="text-rose-300">실패</span>'}</td></tr>`).join('')
    : '<tr><td colspan="5" class="px-4 py-8 text-center text-zinc-500">아직 기록이 없습니다. 표현이나 학습 모드를 써 보세요.</td></tr>';
}
$('#clearLog').addEventListener('click', () => { log = []; try { localStorage.removeItem('sb-log'); } catch {} renderDash(); });

let saved = 'express';
try { saved = localStorage.getItem('sb-tab') || 'express'; } catch {}
show(saved);
