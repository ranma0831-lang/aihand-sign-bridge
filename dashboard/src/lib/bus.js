// 중앙 PC(FastAPI)와 주고받는 통로. ?ws=ws://주소 가 있으면 진짜 서버, 없으면 가짜 데이터.
// 메시지 형식은 dashboard/README.md 참고.
import { BASIC } from './hangul.js';

export const HAND_COUNT = 5;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function createBus(url) {
  return url ? wsBus(url) : mockBus();
}

function wsBus(url) {
  const fns = new Set(), queue = [];
  const emit = (m) => fns.forEach((f) => f(m));
  let ws;
  const open = () => {
    ws = new WebSocket(url);
    ws.onopen = () => { emit({ type: 'conn', ok: true }); while (queue.length) ws.send(queue.shift()); };
    ws.onmessage = (e) => { try { emit(JSON.parse(e.data)); } catch { /* 형식이 틀린 메시지는 무시 */ } };
    ws.onclose = () => { emit({ type: 'conn', ok: false }); setTimeout(open, 2000); };
  };
  open();
  return {
    real: true,
    on(f) { fns.add(f); return () => fns.delete(f); },
    send(m) { const s = JSON.stringify(m); if (ws.readyState === 1) ws.send(s); else queue.push(s); },
  };
}

// 가짜 중앙 PC + 가짜 인식기: 역할 1·3이 보낼 메시지를 같은 형식으로 흉내 낸다
export function mockBus() {
  const fns = new Set();
  const emit = (m) => setTimeout(() => fns.forEach((f) => f(m)), 0);
  let run = 0, paused = false, greeted = false;

  async function play(plan, { stepMs = 1200, gapMs = 250 }) {
    const my = ++run; paused = false;
    const t0 = performance.now();
    for (let i = 0; i < plan.length; i++) {
      while (paused && my === run) await wait(100);
      if (my !== run) return;
      const { jamo, hand } = plan[i];
      emit({ type: 'step', i, jamo, hand, state: 'start' });
      await wait(stepMs);
      if (my !== run) return;
      emit({ type: 'step', i, jamo, hand, state: 'end' });
      await wait(gapMs);
    }
    if (my === run) emit({ type: 'done', ms: Math.round(performance.now() - t0) });
  }

  return {
    real: false,
    on(f) {
      fns.add(f);
      if (!greeted) { greeted = true; for (let h = 1; h <= HAND_COUNT; h++) emit({ type: 'hand_status', hand: h, connected: true }); }
      return () => fns.delete(f);
    },
    async send(m) {
      switch (m.type) {
        case 'express': play(m.plan, m); break;
        case 'demo': play([{ jamo: m.jamo, hand: m.hand }], m); break;
        case 'pause': paused = true; emit({ type: 'paused' }); break;
        case 'resume': paused = false; emit({ type: 'resumed' }); break;
        case 'stop': run++; emit({ type: 'stopped' }); break;
        case 'estop': run++; emit({ type: 'stopped', estop: true }); break;
        case 'praise':
          emit({ type: 'step', i: -1, jamo: '칭찬', hand: m.hand, state: 'start' });
          await wait(900);
          emit({ type: 'step', i: -1, jamo: '칭찬', hand: m.hand, state: 'end' });
          break;
        case 'test': { // 개별 손 테스트: 10% 확률로 실패를 흉내 낸다
          emit({ type: 'step', i: -1, jamo: m.jamo, hand: m.hand, state: 'start' });
          const ms = 900 + Math.round(Math.random() * 400);
          await wait(ms);
          emit({ type: 'test_result', hand: m.hand, jamo: m.jamo, ok: Math.random() > 0.1, ms });
          break;
        }
        case 'recognize': { // 사용자가 손을 2초쯤 들고 있다고 치고 70% 확률로 정답
          await wait(1800 + Math.random() * 600);
          const ok = Math.random() < 0.7;
          const jamo = ok ? m.jamo : BASIC.filter((j) => j !== m.jamo)[Math.floor(Math.random() * (BASIC.length - 1))];
          emit({ type: 'recog', jamo, prob: +(0.55 + Math.random() * 0.44).toFixed(2), ms: 280 + Math.round(Math.random() * 520) });
          break;
        }
        default: break; // system 등은 가짜 PC가 따로 할 일이 없다
      }
    },
  };
}
