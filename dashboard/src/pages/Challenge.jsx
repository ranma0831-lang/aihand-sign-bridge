// 도전: 이름 입력 → 글자 5개를 연속으로 따라 하기 → 점수 → 순위표 (멘토 제안 시연 흐름)
import { useRef, useState } from 'react';
import { PageHead } from '../components/Shell.jsx';
import { Card, CardTitle, Icon, Pill } from '../components/ui.jsx';
import { useBusEvent, useSystem } from '../lib/store.jsx';
import { useCamera } from '../lib/useCamera.js';
import { demoLine, followLine, jamoName, roParticle, say } from '../lib/speech.js';
import { rankBoard } from '../lib/stats.js';
import { LETTERS } from './Learn.jsx';

const COUNT = 5;
const shuffle = (a) => a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const fmtSec = (ms) => `${(ms / 1000).toFixed(1)}초`;

export default function Challenge() {
  const { settings, board, demo, recognize, praise, stop, addLog, addScore, clearBoard, toast } = useSystem();
  const { video, start: startCam, stop: stopCam } = useCamera();
  const [name, setName] = useState('');
  const [run, setRunState] = useState(null); // {name, letters, i, phase:'demo'|'follow'|'result'|'end', results, t0, hand, ms}
  const runRef = useRef(null); // 타이머·메시지 처리에서 최신 상태를 읽으려고 같이 둔다
  const setRun = (r) => { runRef.current = r; setRunState(r); };
  const speak = (text) => settings.voice && say(text);
  const ranked = rankBoard(board);

  function show(r, i) {
    const j = r.letters[i];
    const hand = demo(j);
    setRun({ ...r, i, phase: 'demo', hand });
    speak(`${i + 1}번째 글자. ${demoLine(j, hand)}`);
  }

  function begin(e) {
    e.preventDefault();
    const who = name.trim();
    if (!who) { toast('이름을 입력해 주세요.', 'error'); return; }
    // 로봇이 직접 시범을 보일 수 있는 글자 중에서 고른다
    const pool = LETTERS.filter((j) => !settings.screenOnly.includes(j));
    startCam();
    show({ name: who, letters: shuffle(pool).slice(0, COUNT), results: [], t0: Date.now() }, 0);
  }

  function next() {
    const r = runRef.current;
    if (!r) return;
    if (r.i + 1 < COUNT) { show(r, r.i + 1); return; }
    const score = r.results.filter(Boolean).length;
    const ms = Date.now() - r.t0;
    addScore({ name: r.name, score, total: COUNT, ms });
    setRun({ ...r, phase: 'end', ms });
    stopCam();
    speak(`${r.name}님, ${COUNT}개 중에 ${score}개 맞혔어요!${score === COUNT ? ' 만점이에요!' : ''}`);
  }

  function quit() { stop(); stopCam(); setRun(null); }

  useBusEvent((m) => {
    const r = runRef.current;
    if (!r) return;
    if (m.type === 'done' && r.phase === 'demo') {
      setRun({ ...r, phase: 'follow' });
      recognize(r.letters[r.i]);
      speak(followLine());
    }
    if (m.type === 'recog' && r.phase === 'follow') {
      const target = r.letters[r.i];
      const ok = m.jamo === target;
      setRun({ ...r, phase: 'result', seen: m.jamo, results: [...r.results, ok] });
      addLog({ kind: '학습', text: target, ms: m.ms, ok, attempt: 1, prob: m.prob });
      speak(ok ? '정답!' : `아쉬워요. ${jamoName(m.jamo)}${roParticle(jamoName(m.jamo))} 보였어요.`);
      if (ok && r.hand) praise(r.hand);
      setTimeout(next, 1800);
    }
  });

  const cur = run && run.phase !== 'end' ? run.letters[run.i] : null;
  const myRank = run?.phase === 'end' ? ranked.findIndex((b) => b.name === run.name && b.ms === run.ms) + 1 : 0;

  return (
    <>
      <PageHead title="도전" sub={`이름을 넣고 글자 ${COUNT}개를 연속으로 따라 해 보세요. 맞힌 개수로 순위를 매깁니다.`}
        right={run && run.phase !== 'end' && <button onClick={quit} className="btn btn-light"><Icon name="close-circle-linear" />그만하기</button>} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 flex flex-col gap-4 min-w-0">
          {!run && (
            <Card>
              <CardTitle icon="cup-star-linear">도전 시작</CardTitle>
              <form onSubmit={begin} className="flex flex-wrap gap-2">
                <label htmlFor="who" className="sr-only">이름</label>
                <input id="who" value={name} onChange={(e) => setName(e.target.value)} maxLength={12} autoComplete="off"
                  placeholder="이름 또는 닉네임" className="field flex-1 min-w-[10rem] text-lg" />
                <button className="btn btn-dark px-6"><Icon name="play-bold" />시작하기</button>
              </form>
              <p className="text-sm text-mute mt-3">로봇 손이 시범을 보이면 카메라 앞에서 따라 하세요. 글자마다 한 번씩만 기회가 있어요.</p>
            </Card>
          )}

          {run && (
            <Card dark className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <p className="font-semibold mr-auto">{run.name}님의 도전</p>
                <ol className="flex gap-1.5" aria-label="진행">
                  {run.letters.map((j, k) => {
                    const res = run.results[k];
                    return (
                      <li key={k} className={`w-9 h-9 grid place-items-center rounded-full text-sm font-bold
                        ${res === true ? 'bg-ok' : res === false ? 'bg-bad' : k === run.i && run.phase !== 'end' ? 'bg-white text-ink' : 'bg-white/10'}`}>
                        {res === undefined && k > run.i ? k + 1 : j}
                      </li>
                    );
                  })}
                </ol>
              </div>
              {run.phase === 'end' ? (
                <div className="text-center py-4">
                  <Icon name="cup-star-bold" className="text-6xl" />
                  <p className="text-5xl font-bold num mt-2">{run.results.filter(Boolean).length} / {COUNT}</p>
                  <p className="text-white/70 mt-2 num">{fmtSec(run.ms)} · 순위 {myRank}위</p>
                  <div className="flex justify-center gap-2 mt-5">
                    <button onClick={() => setRun(null)} className="btn bg-white text-ink"><Icon name="restart-bold" />다음 사람 도전</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <span className="text-8xl font-bold leading-none w-24 text-center">{cur}</span>
                  <div>
                    <p className="text-white/60 text-sm">{run.i + 1}번째 글자</p>
                    <p className="text-2xl font-semibold mt-1">
                      {run.phase === 'demo' && (run.hand ? `손 ${run.hand}의 시범을 보세요` : '화면 그림을 보세요')}
                      {run.phase === 'follow' && '카메라 앞에서 따라 하세요'}
                      {run.phase === 'result' && (run.results.at(-1) ? '정답!' : `아쉬워요 (${run.seen}로 보임)`)}
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}

          <Card className="!p-3">
            <div className="relative aspect-video rounded-[22px] overflow-hidden bg-black/5">
              <video ref={video} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
              {(!run || run.phase === 'end') && (
                <p className="absolute inset-0 grid place-items-center text-mute text-sm p-4 text-center">
                  {settings.camera ? '도전을 시작하면 카메라가 켜집니다' : '설정에서 카메라가 꺼져 있습니다'}
                </p>
              )}
              {run?.phase === 'follow' && <Pill tone="run" className="absolute top-3 left-3">손 모양 인식 중</Pill>}
            </div>
          </Card>
        </div>

        <Card dark className="lg:col-span-5 self-start">
          <CardTitle icon="ranking-linear" right={board.length > 0 && <button onClick={clearBoard} className="text-xs text-white/60 hover:text-white">순위 지우기</button>}>순위표</CardTitle>
          {ranked.length ? (
            <ol className="flex flex-col gap-2">
              {ranked.slice(0, 10).map((b, k) => (
                <li key={b.t} className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${k < 3 ? 'bg-white/10' : ''}`}>
                  <span className={`w-7 text-center font-bold num ${k === 0 ? 'text-2xl' : 'text-white/70'}`}>{k + 1}</span>
                  <span className="font-semibold mr-auto truncate">{b.name}</span>
                  <span className="font-bold num">{b.score}/{b.total}</span>
                  <span className="text-white/60 text-sm num w-14 text-right">{fmtSec(b.ms)}</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-white/60 text-sm py-6">아직 기록이 없어요. 첫 번째 도전자가 되어 보세요!</p>}
          <p className="text-xs text-white/40 mt-4">맞힌 개수가 많은 순, 같으면 빨리 끝낸 순 · 이 브라우저에만 저장됩니다</p>
        </Card>
      </div>
    </>
  );
}
