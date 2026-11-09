// ③ 학습: 글자 선택 → AI Hand 시범 → 웹캠으로 따라 하기 → 정답/오답 (F-05, F-06, F-07)
import { useEffect, useRef, useState } from 'react';
import { PageHead } from '../components/Shell.jsx';
import { Card, CardTitle, Icon, Pill, Ring } from '../components/ui.jsx';
import { BASIC } from '../lib/hangul.js';
import { useBusEvent, useSystem } from '../lib/store.jsx';

const STEPS = [['demo', '시범 보기'], ['follow', '따라 하기'], ['result', '결과']];

export default function Learn() {
  const { settings, log, demo, recognize, praise, addLog, toast } = useSystem();
  const [target, setTarget] = useState(null);
  const [phase, setPhase] = useState('pick'); // pick → demo → follow → result
  const [attempt, setAttempt] = useState(1);
  const [hand, setHand] = useState(null);
  const [result, setResult] = useState(null);
  const [streak, setStreak] = useState(0);
  const video = useRef(null);
  const stream = useRef(null);
  const learned = new Set(log.filter((r) => r.kind === '학습' && r.ok).map((r) => r.text));

  async function startCam() {
    if (!settings.camera || stream.current) return;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: true });
      if (video.current) video.current.srcObject = stream.current;
    } catch { toast('카메라를 켤 수 없습니다. 브라우저 권한을 확인해 주세요.', 'error'); }
  }
  const stopCam = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  useEffect(() => stopCam, []);

  function pick(j) {
    if (phase === 'demo' || phase === 'follow') return;
    setTarget(j); setAttempt(1); setResult(null); setPhase('demo');
    setHand(demo(j));
  }
  function follow() { setPhase('follow'); setResult(null); startCam(); recognize(target); }
  function retry() { setAttempt((a) => a + 1); follow(); }

  useBusEvent((m) => {
    if (m.type === 'done' && phase === 'demo') follow();
    if (m.type === 'recog' && phase === 'follow') {
      const ok = m.jamo === target;
      setResult({ ...m, ok }); setPhase('result');
      setStreak((s) => (ok ? s + 1 : 0));
      addLog({ kind: '학습', text: target, ms: m.ms, ok, attempt, prob: m.prob });
      if (ok && hand) praise(hand); // 정답이면 칭찬 동작
      if (!ok) demo(target); // 오답이면 정답 동작을 다시 보여 준다
    }
  });

  const stepIdx = STEPS.findIndex(([k]) => k === phase);

  return (
    <>
      <PageHead title="학습" sub="AI Hand의 시범을 보고 카메라 앞에서 같은 손 모양을 만들어 보세요." />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-8">
          <CardTitle icon="book-bookmark-linear" right={<span className="text-xs text-mute">점선 = 화면 그림으로 시범</span>}>배울 글자</CardTitle>
          <div className="grid grid-cols-6 sm:grid-cols-10 gap-2">
            {BASIC.map((j) => (
              <button key={j} onClick={() => pick(j)} aria-pressed={target === j}
                className={`relative aspect-square rounded-2xl text-xl font-bold border transition
                  ${target === j ? 'bg-ink text-white border-ink' : 'bg-white/70 border-black/10 hover:border-ink'}
                  ${settings.screenOnly.includes(j) ? 'border-dashed' : ''}`}>
                {j}
                {learned.has(j) && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-ok" aria-label="맞힌 적 있음" />}
              </button>
            ))}
          </div>
        </Card>

        <Card dark className="lg:col-span-4 flex flex-col items-center gap-4">
          <CardTitle icon="medal-ribbons-star-linear">학습 진행</CardTitle>
          <Ring dark value={Math.round((learned.size / BASIC.length) * 100)} label={`${learned.size}/${BASIC.length}글자`} />
          <div className="grid grid-cols-2 gap-3 w-full text-center">
            <div className="rounded-2xl bg-white/10 py-3"><p className="text-2xl font-bold num">{streak}</p><p className="text-xs text-white/60">연속 정답</p></div>
            <div className="rounded-2xl bg-white/10 py-3"><p className="text-2xl font-bold num">{target ? attempt : '–'}</p><p className="text-xs text-white/60">이번 글자 시도</p></div>
          </div>
        </Card>

        <ol className="lg:col-span-12 flex flex-wrap gap-2">
          {STEPS.map(([k, label], i) => (
            <li key={k} className={`px-4 py-2 rounded-full text-sm font-semibold ${i === stepIdx ? 'bg-ink text-white' : i < stepIdx ? 'glass !rounded-full' : 'bg-black/5 text-mute'}`}>{i + 1}. {label}</li>
          ))}
        </ol>

        <Card className="lg:col-span-6 !p-3">
          <div className="relative aspect-video rounded-[22px] overflow-hidden bg-black/5">
            <video ref={video} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
            {phase !== 'follow' && phase !== 'result' && (
              <p className="absolute inset-0 grid place-items-center text-mute text-sm p-4 text-center">
                {settings.camera ? '시범이 끝나면 카메라가 켜집니다' : '설정에서 카메라가 꺼져 있습니다'}
              </p>
            )}
            {phase === 'follow' && <Pill tone="run" className="absolute top-3 left-3">손 모양 인식 중</Pill>}
          </div>
        </Card>

        <Card className="lg:col-span-6 grid place-items-center text-center min-h-64">
          {phase === 'pick' && <p className="text-mute">왼쪽 위에서 배울 글자를 고르세요.</p>}
          {phase === 'demo' && (
            <div>
              <p className="text-8xl font-bold">{target}</p>
              <p className="text-mute mt-2">{hand ? `손 ${hand}의 시범을 잘 보세요` : '화면 그림을 보고 손 모양을 익히세요'}</p>
            </div>
          )}
          {phase === 'follow' && (
            <div><p className="text-6xl font-bold">{target}</p><p className="mt-2">카메라 앞에서 손 모양을 만들고 잠시 멈춰 주세요</p></div>
          )}
          {phase === 'result' && result && (
            <div className="flex flex-col items-center gap-2">
              <Icon name={result.ok ? 'check-circle-bold' : 'close-circle-bold'} className={`text-6xl ${result.ok ? 'text-ok' : 'text-bad'}`} />
              <p className="text-2xl font-bold">{result.ok ? '정답입니다' : '다시 해 볼까요'}</p>
              <p className="text-mute">정답 <b className="text-ink">{target}</b> · 인식 <b className="text-ink">{result.jamo}</b></p>
              <p className="text-sm text-mute num">정확도 {Math.round(result.prob * 100)}% · 피드백 {result.ms}ms</p>
              {!result.ok && <p className="text-sm">AI Hand가 정답 동작을 다시 보여 줍니다</p>}
              <div className="flex gap-2 mt-2">
                {!result.ok && <button onClick={retry} className="btn btn-dark"><Icon name="restart-bold" />다시 따라 하기</button>}
                <button onClick={() => { setPhase('pick'); setTarget(null); stopCam(); }} className="btn btn-light">다른 글자</button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
