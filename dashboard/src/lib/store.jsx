// 시스템 전체 상태: 손 5대, 지금 작업, 기록, 설정, 알림. 화면들은 useSystem()으로 읽는다.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createBus, HAND_COUNT } from './bus.js';
import { toJamo } from './hangul.js';
import { HAND_LAYOUT, REST, TABLE, TABLE_INFO, assignHands, praiseAngles } from './angleTable.js';
import * as hw from './hw.js';

const Ctx = createContext(null);
export const useSystem = () => useContext(Ctx);

export const STATE_LABEL = { idle: '대기', run: '실행', done: '완료', error: '오류' };
// 각도표 버전: 새 각도표를 배포하면 브라우저에 저장된 예전 각도표 대신 새 것을 쓴다
const TABLE_VERSION = `${TABLE_INFO.source}@${TABLE_INFO.generated}`;

// 손 배치·각도는 각도표_양식(angleTable.js)에서 온다. 설정 화면에서 고친 값은 이 브라우저에만 남는다
export const defaultSettings = () => ({
  tableVersion: TABLE_VERSION,
  hands: HAND_LAYOUT.map((h) => ({ ...h })),
  table: structuredClone(TABLE),
  stepMs: 1200,
  gapMs: 250,
  camera: true,
  voice: true,
});

// shortcut: 기록과 설정은 이 브라우저(localStorage)에만 저장. 팀 공유가 필요해지면 Supabase로 옮긴다
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 실패해도 화면은 동작 */ } };

// 글자(또는 '쉼'·'칭찬')의 서보 각도 6개
export const anglesOf = (st, key) => (key === '쉼' ? REST : key === '칭찬' ? praiseAngles(st.table) : st.table[key]?.angles);

const idleHands = (hs) => hs.map((h) => ({ ...h, state: h.state === 'error' ? 'error' : 'idle', jamo: '' }));

export function SystemProvider({ children }) {
  const [bus] = useState(() => createBus(new URLSearchParams(location.search).get('ws')));

  const [settings, setSettings] = useState(() => {
    const saved = load('sb-settings-v3', {});
    // 각도표가 새로 배포됐으면 예전 손 배치·각도는 버리고 속도·카메라 같은 나머지 설정만 살린다
    if (saved.tableVersion !== TABLE_VERSION) { delete saved.table; delete saved.hands; delete saved.tableVersion; }
    return { ...defaultSettings(), ...saved };
  });
  const [log, setLog] = useState(() => load('sb-log', []));
  const [board, setBoard] = useState(() => load('sb-board', [])); // 도전 모드 순위표
  const [hands, setHands] = useState(() =>
    Array.from({ length: HAND_COUNT }, (_, i) => ({ id: i + 1, connected: false, state: 'idle', jamo: '' })));
  const [job, setJob] = useState({ kind: '', word: '', plan: [], i: -1, status: 'idle' });
  const [conn, setConn] = useState(bus.real ? 'closed' : 'mock');
  const [system, setSystem] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [subs] = useState(() => new Set()); // 화면별 메시지 구독자
  const jobRef = useRef(job);
  useEffect(() => { jobRef.current = job; }, [job]);

  useEffect(() => save('sb-log', log), [log]);
  useEffect(() => save('sb-board', board), [board]);
  useEffect(() => save('sb-settings-v3', settings), [settings]); // v3: 각도표_양식 기준
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  const [usb, setUsb] = useState([]); // 블루투스로 직접 연결된 손 번호
  const [usbReply, setUsbReply] = useState({}); // 손별 micro:bit 마지막 응답

  const toast = useCallback((text, tone = 'info') => {
    const id = Math.random();
    setToasts((ts) => [...ts, { id, text, tone }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4000);
  }, []);
  const addLog = useCallback((row) => setLog((l) => [{ t: Date.now(), ...row }, ...l].slice(0, 500)), []);
  const setHand = (id, patch) => setHands((hs) => hs.map((h) => (h.id === id ? { ...h, ...patch } : h)));

  useEffect(() => bus.on((m) => {
    switch (m.type) {
      case 'conn': setConn(m.ok ? 'open' : 'closed'); break;
      case 'hand_status':
        setHand(m.hand, { connected: m.connected });
        if (!m.connected) toast(`손 ${m.hand} 연결이 끊겼습니다`, 'error');
        break;
      case 'step':
        if (m.hand) setHand(m.hand, { state: m.state === 'start' ? 'run' : 'done', jamo: m.jamo });
        // 블루투스 직접 연결은 테스트용: 가짜 데이터 모드일 때만 보낸다 (중앙 프로그램에 붙으면 그쪽이 손을 움직임)
        if (m.hand && m.state === 'start' && !bus.real) {
          const st = settingsRef.current;
          const angles = anglesOf(st, m.jamo);
          if (angles) hw.sendAngles(m.hand, angles, Math.min(600, st.stepMs * 0.5)).catch(() => toast(`손 ${m.hand} 블루투스 전송 실패`, 'error'));
        }
        if (m.i >= 0 && m.state === 'start') setJob((j) => ({ ...j, i: m.i, status: 'running' }));
        break;
      case 'paused': setJob((j) => ({ ...j, status: 'paused' })); break;
      case 'resumed': setJob((j) => ({ ...j, status: 'running' })); break;
      case 'done': {
        const j = jobRef.current;
        setJob({ ...j, i: j.plan.length, status: 'done', ms: m.ms });
        setTimeout(() => setHands(idleHands), 800);
        if (!bus.real) setTimeout(() => j.plan.forEach((p) => p.hand && hw.sendAngles(p.hand, REST, 500).catch(() => {})), 800);
        if (j.kind === 'express') addLog({ kind: '표현', text: j.word, ms: m.ms, ok: true, voice: j.voice, edited: j.edited });
        break;
      }
      case 'stopped':
        setJob((j) => ({ ...j, status: 'stopped' }));
        setHands(idleHands);
        if (m.estop) toast('긴급 정지했습니다. 모든 손이 멈췄습니다.', 'error');
        break;
      case 'error':
        setHand(m.hand, { state: 'error' });
        toast(`손 ${m.hand} 오류: ${m.msg || '동작 실패'}`, 'error');
        addLog({ kind: '오류', text: `손 ${m.hand}: ${m.msg || '동작 실패'}`, ms: null, ok: false });
        break;
      case 'test_result':
        setHand(m.hand, { state: m.ok ? 'done' : 'error', jamo: m.jamo });
        toast(m.ok ? `손 ${m.hand} 테스트 성공 (${m.ms}ms)` : `손 ${m.hand} 테스트 실패`, m.ok ? 'ok' : 'error');
        addLog({ kind: '테스트', text: `손 ${m.hand} · ${m.jamo}`, ms: m.ms, ok: m.ok });
        break;
      default: break;
    }
    subs.forEach((f) => f(m));
  }), [bus, subs, toast, addLog]);

  // 단어 → 손 배정까지 끝난 계획 [{jamo, syllable, hand|null, angles}]
  const makePlan = useCallback((word) => {
    const { seq, skipped } = toJamo(word);
    return { plan: assignHands(seq, settings.table), skipped }; // "1,2"처럼 두 손이 맡으면 번갈아
  }, [settings]);

  const timing = { stepMs: settings.stepMs, gapMs: settings.gapMs };
  const wire = (plan) => plan.map(({ jamo, hand, angles }) => ({ jamo, hand, angles }));

  const actions = {
    makePlan,
    express(word, { kind = 'express', voice = false, edited = false } = {}) {
      if (!system) { toast('시스템이 정지 상태입니다. 통합 관제에서 시작해 주세요.', 'error'); return false; }
      const { plan } = makePlan(word);
      if (!plan.length) return false;
      setJob({ kind, word, plan, i: -1, status: 'running', voice, edited });
      bus.send({ type: 'express', word, plan: wire(plan), ...timing });
      return true;
    },
    // 학습 시범: 자모 하나. 손 배정을 돌려준다(null이면 화면 그림)
    demo(jamo) {
      const [step] = assignHands([{ jamo, syllable: jamo }], settings.table);
      const { hand, angles } = step;
      setJob({ kind: 'demo', word: jamo, plan: [step], i: -1, status: 'running' });
      bus.send({ type: 'demo', jamo, hand, angles, ...timing });
      return hand;
    },
    pause: () => bus.send({ type: 'pause' }),
    resume: () => bus.send({ type: 'resume' }),
    stop: () => bus.send({ type: 'stop' }),
    estop: () => { bus.send({ type: 'estop' }); setHands(idleHands); },
    test: (hand, jamo) => bus.send({ type: 'test', hand, jamo, angles: anglesOf(settings, jamo) }),
    // mode: 인식 모델이 고를 범위 (ㅏ와 1처럼 비슷한 모양이 섞이지 않게, 이정민 님 predict_in_mode)
    recognize: (jamo) => bus.send({ type: 'recognize', jamo, mode: /^\d+$/.test(jamo) ? '숫자' : '글자', timeout: 10 }),
    praise: (hand) => bus.send({ type: 'praise', hand }),
    systemOn(on) {
      setSystem(on);
      bus.send({ type: 'system', on });
      if (!on) bus.send({ type: 'stop' });
      toast(on ? '시스템을 시작했습니다' : '시스템을 정지했습니다', on ? 'ok' : 'info');
    },
    clearError: (hand) => setHand(hand, { state: 'idle' }),
    // 실제 AI Hand 블루투스 연결 (크롬·엣지)
    async connectUsb(hand) {
      try {
        await hw.connectHand(hand, {
          onLost: (h) => { setUsb((u) => u.filter((x) => x !== h)); toast(`손 ${h} 블루투스 연결이 끊겼습니다`, 'error'); },
          // micro:bit 응답: OK면 받은 것, ERR이면 형식 오류
          onLine: (h, line) => { setUsbReply((r) => ({ ...r, [h]: { line, t: Date.now() } })); if (line.startsWith('ERR')) toast(`손 ${h} 명령 형식 오류: ${line}`, 'error'); },
        });
        setUsb((u) => [...new Set([...u, hand])]);
        toast(`손 ${hand}을(를) 블루투스로 연결했습니다`, 'ok');
        hw.sendAngles(hand, REST, 500);
      } catch (e) {
        if (e?.name !== 'NotFoundError') toast(`손 ${hand} 연결 실패: micro:bit에 ✓가 떠 있는지, 다른 기기(휴대폰 앱 등)와 연결되어 있지 않은지 확인하세요 (${e?.message || e})`, 'error');
      }
    },
    async disconnectUsb(hand) { await hw.disconnectHand(hand); setUsb((u) => u.filter((x) => x !== hand)); },
    updateSettings: (patch) => setSettings((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })),
    resetSettings: () => setSettings(defaultSettings()),
    clearLog: () => setLog([]),
    addScore: (entry) => setBoard((b) => [{ t: Date.now(), ...entry }, ...b].slice(0, 100)),
    clearBoard: () => setBoard([]),
    addLog,
    toast,
  };

  return (
    <Ctx.Provider value={{ bus, settings, log, hands, job, conn, system, toasts, subs, usb, usbReply, board, hwSupported: hw.hwSupported, ...actions }}>
      {children}
    </Ctx.Provider>
  );
}

// 화면에서 PC/인식기 메시지를 직접 받고 싶을 때 (예: 학습 화면의 recog)
export function useBusEvent(fn) {
  const { subs } = useSystem();
  const ref = useRef(fn);
  useLayoutEffect(() => { ref.current = fn; });
  useEffect(() => {
    const f = (m) => ref.current(m);
    subs.add(f);
    return () => subs.delete(f);
  }, [subs]);
}
