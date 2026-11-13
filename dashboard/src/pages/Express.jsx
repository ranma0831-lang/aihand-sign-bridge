// ② 지문자 표현: 텍스트·음성 입력 → 자모 분해 → 손 배정 → 순서대로 표현 (F-01, F-02, F-09)
import { useEffect, useMemo, useState } from 'react';
import { PageHead } from '../components/Shell.jsx';
import { Card, CardTitle, Icon, Pill } from '../components/ui.jsx';
import { JamoChips } from '../components/hands.jsx';
import { useSystem } from '../lib/store.jsx';
import { jobView } from './Dashboard.jsx';
import { say, startMessage } from '../lib/speech.js';

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

export default function Express() {
  const { job, makePlan, express, pause, resume, stop, settings, toast } = useSystem();
  const [word, setWord] = useState('');
  const [listening, setListening] = useState(false);
  const active = (job.status === 'running' || job.status === 'paused') && job.kind === 'express';
  const shown = active || (job.kind === 'express' && job.status !== 'idle');
  const preview = useMemo(() => makePlan(word), [word, makePlan]);
  const { cur } = jobView(job);
  const next = active ? job.plan[job.i + 1] : null; // 다음 글자 미리보기 (손이 없는 글자도 포함)

  // 단어 표현 시작. 음성 안내가 켜져 있으면 무엇을 보여 줄지, 손으로 못 하는 글자는 어떻게 할지 말해 준다
  function run(w, voice) {
    const { plan, skipped } = makePlan(w);
    if (!plan.length) {
      toast(voice ? '알아들은 한글이 없어요. 다시 말씀해 주세요.' : '한글 단어를 입력해 주세요.', 'error');
      if (voice && settings.voice) say(startMessage(w, plan, skipped));
      return;
    }
    if (express(w, { voice }) && settings.voice) say(startMessage(w, plan, skipped));
  }

  function start(e) {
    e.preventDefault();
    run(word.trim(), false);
  }

  // 표현이 끝나면 음성으로 알려 준다
  useEffect(() => {
    if (job.kind === 'express' && job.status === 'done' && settings.voice) say('다 보여 드렸어요.');
  }, [job.kind, job.status, settings.voice]);

  function listen() {
    if (!SR) { toast('이 브라우저는 음성 입력을 지원하지 않습니다. 크롬에서 열어 주세요.', 'error'); return; }
    const rec = new SR();
    rec.lang = 'ko-KR';
    // 말이 끝나면 버튼을 누르지 않아도 바로 표현을 시작한다
    rec.onresult = (e) => { const t = e.results[0][0].transcript.replace(/[.?!\s]/g, ''); setWord(t); run(t, true); };
    rec.onerror = (e) => {
      const msg = e.error === 'not-allowed' ? '마이크 권한을 허용해 주세요.' : '잘 못 알아들었어요. 다시 말씀해 주세요.';
      toast(msg, 'error');
      if (settings.voice) say(msg);
    };
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  }

  const plan = shown ? job.plan : preview.plan;

  return (
    <>
      <PageHead title="지문자 표현" sub="단어를 입력하면 자모로 나눠 AI Hand 5대가 차례로 보여 줍니다. 2~3글자 단어를 추천해요." />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-12">
          <form onSubmit={start} className="flex flex-wrap gap-2">
            <label htmlFor="word" className="sr-only">단어</label>
            <input id="word" value={word} onChange={(e) => setWord(e.target.value)} maxLength={10} autoComplete="off"
              placeholder="예: 사랑" className="field flex-1 min-w-[12rem] text-lg" disabled={active} />
            {settings.voice && (
              <button type="button" onClick={listen} disabled={active || listening} className="btn btn-light">
                <Icon name="microphone-3-linear" className="text-lg" />{listening ? '듣는 중… 단어를 말하세요' : '말해서 바로 표현'}
              </button>
            )}
            {!active ? (
              <button className="btn btn-dark px-6"><Icon name="play-bold" />표현 시작</button>
            ) : (
              <>
                {job.status === 'paused'
                  ? <button type="button" onClick={resume} className="btn btn-dark"><Icon name="play-bold" />재개</button>
                  : <button type="button" onClick={pause} className="btn btn-dark"><Icon name="pause-bold" />일시정지</button>}
                <button type="button" onClick={stop} className="btn btn-light"><Icon name="stop-bold" />중지</button>
              </>
            )}
          </form>
          <p className="text-sm text-mute mt-3 min-h-5" role="status">
            {preview.skipped.length > 0 && !shown && `한글이 아닌 글자(${preview.skipped.join(' ')})는 건너뜁니다. `}
            {job.kind === 'express' && job.status === 'done' && `'${job.word}' 표현을 마쳤습니다. ${(job.ms / 1000).toFixed(1)}초 걸렸어요.`}
            {job.kind === 'express' && job.status === 'stopped' && '중지했습니다.'}
          </p>
        </Card>

        <Card className="lg:col-span-12">
          <CardTitle icon="list-check-linear" right={<Pill>{shown ? '진행' : '미리보기'}</Pill>}>자모 순서와 담당 손</CardTitle>
          {plan.length ? <JamoChips plan={plan} i={shown ? job.i : -1} done={job.status === 'done' && shown} />
            : <p className="text-mute text-sm">단어를 입력하면 자모와 담당 손이 여기에 미리 보입니다. 점선은 손 대신 화면 그림으로 보여 주는 글자예요.</p>}
        </Card>

        <Card dark className="lg:col-span-7 flex items-center gap-6 min-h-48">
          {active && cur ? (
            <>
              <span className="text-8xl font-bold leading-none w-24 text-center">{cur.jamo}</span>
              <div>
                <p className="text-white/60 text-sm">지금 표현 중 · '{cur.syllable}'</p>
                <p className="text-2xl font-semibold mt-1">{cur.hand ? `손 ${cur.hand} · ${settings.hands[cur.hand - 1].dir}` : '화면 그림으로 표시'}</p>
                {job.status === 'paused' && <Pill tone="light" className="mt-3">일시정지</Pill>}
              </div>
            </>
          ) : <p className="text-white/60">표현을 시작하면 지금 글자가 크게 보입니다.</p>}
        </Card>

        <Card className={`lg:col-span-5 grid place-items-center text-center min-h-48 ${active && cur && cur.hand == null ? 'outline-2 outline-dashed outline-ink/40' : ''}`}>
          {active && cur && cur.hand == null ? (
            <div><Icon name="gallery-wide-linear" className="text-4xl" /><p className="font-semibold mt-2">'{cur.jamo}' 지문자 그림</p>
              <p className="text-sm text-mute mt-1">AI Hand로 표현하기 어려운 글자라 그림으로 보여 줍니다</p></div>
          ) : (
            <div>
              <p className="text-sm text-mute">다음 글자</p>
              <p className="text-5xl font-bold mt-2">{active && next ? next.jamo : '–'}</p>
              <p className="text-sm text-mute mt-2">{active && next ? next.hand ? `손 ${next.hand}이(가) 준비합니다` : '화면 그림으로 표시합니다' : '마지막 글자이거나 대기 중'}</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
