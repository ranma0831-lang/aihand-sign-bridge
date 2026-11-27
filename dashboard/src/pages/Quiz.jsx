// 5.4 맞히기 (S-04): AI Hand가 글자 하나를 만들면 사람이 보기 4개 중에서 고른다. 5문제 한 판
// 보기에는 손가락 각도가 비슷한 글자(ㄹ/ㅌ, ㅂ/4 등)를 섞어서 헷갈리는 짝을 연습하게 한다
import { useMemo, useState } from 'react';
import { PageHead } from '../components/Shell.jsx';
import { Card, CardTitle, Icon, Pill } from '../components/ui.jsx';
import { KEYS, quizChoices, quizPool } from '../lib/angleTable.js';
import { useSystem } from '../lib/store.jsx';
import { jamoName, say } from '../lib/speech.js';
import { SignImage } from './Chart.jsx';

const ROUND = 5;

// 가짜 데이터일 때 손 대신 보여 줄 그림. 그림 위쪽의 글자 표시는 '?'로 가린다
function HiddenSign({ k }) {
  return (
    <div className="relative w-full max-w-64 mx-auto">
      <SignImage k={k} className="w-full" />
      <span className="absolute left-1/2 -translate-x-1/2 top-[6%] w-[20%] aspect-square rounded-full bg-white grid place-items-center text-xl font-bold shadow">?</span>
    </div>
  );
}

export default function Quiz() {
  const { settings, conn, system, demo, praise, addLog, log, toast } = useSystem();
  const pool = useMemo(() => quizPool(settings.table, KEYS), [settings.table]);
  const [q, setQ] = useState(null); // { no, target, hand, choices, t, picked }
  const [score, setScore] = useState(0);
  const speak = (text) => settings.voice && say(text);
  const quizLog = log.filter((r) => r.kind === '맞히기');
  const rate = quizLog.length ? Math.round((quizLog.filter((r) => r.ok).length / quizLog.length) * 100) : null;

  function ask(no) {
    if (!system) { toast('시스템이 정지 상태입니다. 관리자 화면의 통합 관제에서 시작해 주세요.', 'error'); return; }
    const target = pool[Math.floor(Math.random() * pool.length)];
    const hand = demo(target);
    setQ({ no, target, hand, choices: quizChoices(target, settings.table, pool), t: Date.now(), picked: null });
    speak(no === 1 ? 'AI Hand가 보여 주는 글자를 맞혀 보세요.' : '다음 문제예요.');
  }
  function start() { setScore(0); ask(1); }

  function answer(k) {
    if (q.picked) return;
    const ok = k === q.target;
    setQ({ ...q, picked: k });
    if (ok) setScore((s) => s + 1);
    addLog({ kind: '맞히기', text: q.target, ok, ms: Date.now() - q.t, picked: k });
    speak(ok ? '정답이에요!' : `아쉬워요. 정답은 ${jamoName(q.target)}이에요.`);
    if (ok && q.hand) praise(q.hand);
    if (!ok) demo(q.target); // 오답이면 정답 모양을 다시 보여 준다 (S-02)
  }

  const done = q?.picked && q.no >= ROUND;

  return (
    <>
      <PageHead title="맞히기" sub="AI Hand가 만든 손 모양을 보고 어떤 글자인지 골라 보세요. 비슷한 모양이 보기로 나와요." />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8 flex flex-col gap-5 min-h-96">
          {!q ? (
            <div className="m-auto text-center grid gap-4 place-items-center">
              <Icon name="question-square-linear" className="text-6xl" />
              <p className="text-lg">AI Hand가 글자 하나를 손으로 만들면, 보기 4개 중에서 맞혀 보세요.</p>
              <p className="text-sm text-mute">한 판에 {ROUND}문제 · 문제는 손으로 보여 줄 수 있는 {pool.length}글자에서 나와요</p>
              <button onClick={start} className="btn btn-dark px-8"><Icon name="play-bold" />시작하기</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Pill tone="run">{q.no}/{ROUND}번 문제</Pill>
                <span className="text-sm text-mute ml-auto">{q.hand ? `${q.hand}번 손을 보세요` : ''}</span>
              </div>
              {/* 실제 손이 연결돼 있지 않으면 손 대신 그림(글자 표시는 가림) */}
              {conn !== 'open' && !q.picked && <HiddenSign k={q.target} />}
              {q.picked && (
                <div className="flex flex-wrap justify-center gap-6 text-center">
                  <div className="w-40"><SignImage k={q.target} className="w-full" /><p className="mt-1 font-semibold">정답 {q.target}</p></div>
                  {q.picked !== q.target && <div className="w-40 opacity-70"><SignImage k={q.picked} className="w-full" /><p className="mt-1">고른 답 {q.picked}</p></div>}
                </div>
              )}
              <p className="text-center text-xl font-semibold" role="status">
                {!q.picked ? '이 손 모양은 어떤 글자일까요?' : q.picked === q.target ? '정답이에요!' : `아쉬워요. 정답은 '${q.target}'이에요. 손이 정답 모양을 다시 보여 줘요.`}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {q.choices.map((k) => {
                  const state = !q.picked ? '' : k === q.target ? 'bg-ok text-white border-ok' : k === q.picked ? 'bg-bad text-white border-bad' : 'opacity-40';
                  return (
                    <button key={k} onClick={() => answer(k)} disabled={!!q.picked}
                      className={`py-5 rounded-3xl border-2 border-black/10 text-4xl font-bold transition hover:border-ink disabled:cursor-default ${state}`}>{k}</button>
                  );
                })}
              </div>
              {q.picked && (
                done
                  ? <button onClick={start} className="btn btn-dark self-center"><Icon name="restart-bold" />한 판 더</button>
                  : <button onClick={() => ask(q.no + 1)} className="btn btn-dark self-center">다음 문제<Icon name="arrow-right-linear" /></button>
              )}
            </>
          )}
        </Card>

        <Card dark className="lg:col-span-4 flex flex-col gap-4">
          <CardTitle icon="medal-ribbons-star-linear">점수</CardTitle>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-2xl bg-white/10 py-4"><p className="text-3xl font-bold num">{score}/{q ? (q.picked ? q.no : q.no - 1) : 0}</p><p className="text-xs text-white/60">이번 판</p></div>
            <div className="rounded-2xl bg-white/10 py-4"><p className="text-3xl font-bold num">{rate ?? '–'}{rate != null && '%'}</p><p className="text-xs text-white/60">전체 정답률 ({quizLog.length}문제)</p></div>
          </div>
          {done && <p className="text-lg font-semibold text-center">{score === ROUND ? '모두 맞혔어요! 🎉' : `${ROUND}문제 중 ${score}개 맞혔어요`}</p>}
          <p className="text-sm text-white/60 mt-auto">결과는 통계 화면의 "맞히기 정답률"(목표 80%, S-10)에 쌓입니다. 사람들 손 모양 맞히기 테스트(8.2)에 그대로 쓸 수 있어요.</p>
        </Card>
      </div>
    </>
  );
}
