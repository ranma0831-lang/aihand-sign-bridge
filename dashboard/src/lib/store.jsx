// 시스템 전체 상태: 손 5대, 지금 작업, 기록, 설정, 알림. 화면들은 useSystem()으로 읽는다.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createBus, HAND_COUNT } from './bus.js';
import { JAMO_ALL, SCREEN_ONLY, VOWELS, toJamo } from './hangul.js';

const Ctx = createContext(null);
export const useSystem = () => useContext(Ctx);

export const STATE_LABEL = { idle: '대기', run: '실행', done: '완료', error: '오류' };
export const DIRS = ['세움', '왼쪽', '오른쪽', '뒤집기'];

// shortcut: 손가락 각도는 임시값(전부 90°). 역할 2 각도표(3.1)가 나오면 설정 화면에서 고치거나 JSON으로 넣는다
export const defaultSettings = () => ({
  hands: [
    { id: 1, dir: '세움', role: '자음' }, { id: 2, dir: '세움', role: '모음' },
    { id: 3, dir: '왼쪽', role: '보조' }, { id: 4, dir: '오른쪽', role: '보조' }, { id: 5, dir: '뒤집기', role: '보조' },
  ],
  assign: Object.fromEntries(JAMO_ALL.map((j) => [j, SCREEN_ONLY.has(j) ? null : VOWELS.has(j) ? 2 : 1])),
  angles: Object.fromEntries(JAMO_ALL.map((j) => [j, [90, 90, 90, 90, 90]])),
  screenOnly: [...SCREEN_ONLY],
  stepMs: 1200,
  gapMs: 250,
  camera: true,
  voice: true,
});

// shortcut: 기록과 설정은 이 브라우저(localStorage)에만 저장. 팀 공유가 필요해지면 Supabase로 옮긴다
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 저장 실패해도 화면은 동작 */ } };

const idleHands = (hs) => hs.map((h) => ({ ...h, state: h.state === 'error' ? 'error' : 'idle', jamo: '' }));

export function SystemProvider({ children }) {
  const [bus] = useState(() => createBus(new URLSearchParams(location.search).get('ws')));

  const [settings, setSettings] = useState(() => ({ ...defaultSettings(), ...load('sb-settings', {}) }));
  const [log, setLog] = useState(() => load('sb-log', []));
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
  useEffect(() => save('sb-settings', settings), [settings]);

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
        if (m.i >= 0 && m.state === 'start') setJob((j) => ({ ...j, i: m.i, status: 'running' }));
        break;
      case 'paused': setJob((j) => ({ ...j, status: 'paused' })); break;
      case 'resumed': setJob((j) => ({ ...j, status: 'running' })); break;
      case 'done': {
        const j = jobRef.current;
        setJob({ ...j, i: j.plan.length, status: 'done', ms: m.ms });
        setTimeout(() => setHands(idleHands), 800);
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
    const plan = seq.map((s) => {
      const screen = settings.screenOnly.includes(s.jamo);
      return { ...s, hand: screen ? null : settings.assign[s.jamo] ?? 1, angles: settings.angles[s.jamo] };
    });
    return { plan, skipped };
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
      const hand = settings.screenOnly.includes(jamo) ? null : settings.assign[jamo] ?? 1;
      setJob({ kind: 'demo', word: jamo, plan: [{ jamo, syllable: jamo, hand, angles: settings.angles[jamo] }], i: -1, status: 'running' });
      bus.send({ type: 'demo', jamo, hand, angles: settings.angles[jamo], ...timing });
      return hand;
    },
    pause: () => bus.send({ type: 'pause' }),
    resume: () => bus.send({ type: 'resume' }),
    stop: () => bus.send({ type: 'stop' }),
    estop: () => { bus.send({ type: 'estop' }); setHands(idleHands); },
    test: (hand, jamo) => bus.send({ type: 'test', hand, jamo, angles: settings.angles[jamo] }),
    recognize: (jamo) => bus.send({ type: 'recognize', jamo }),
    praise: (hand) => bus.send({ type: 'praise', hand }),
    systemOn(on) {
      setSystem(on);
      bus.send({ type: 'system', on });
      if (!on) bus.send({ type: 'stop' });
      toast(on ? '시스템을 시작했습니다' : '시스템을 정지했습니다', on ? 'ok' : 'info');
    },
    clearError: (hand) => setHand(hand, { state: 'idle' }),
    updateSettings: (patch) => setSettings((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })),
    resetSettings: () => setSettings(defaultSettings()),
    clearLog: () => setLog([]),
    addLog,
    toast,
  };

  return (
    <Ctx.Provider value={{ bus, settings, log, hands, job, conn, system, toasts, subs, ...actions }}>
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
