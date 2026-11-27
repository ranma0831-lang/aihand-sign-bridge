// ① 통합 관제: 손 5대 협업 상태, 지금 작업, 진행률, 다음 손, 시스템 시작/정지 (F-08)
import { Link } from 'react-router-dom';
import { PageHead } from '../components/Shell.jsx';
import { Card, CardTitle, Icon, Pill, Ring, Spark, Stat } from '../components/ui.jsx';
import { HandCard } from '../components/hands.jsx';
import { useSystem } from '../lib/store.jsx';
import { byDay, rankBoard, summary } from '../lib/stats.js';

const KIND = { express: '지문자 표현', demo: '학습 시범', quiz: '맞히기' };
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function jobView(job) {
  const len = job.plan.length;
  const cur = job.status === 'running' || job.status === 'paused' ? job.plan[job.i] : null;
  const next = job.status === 'running' || job.status === 'paused' ? job.plan.slice(job.i + 1).find((p) => p.hand != null) : null;
  const progress = !len ? 0 : job.status === 'done' ? 100 : Math.max(0, Math.round((job.i / len) * 100));
  return { len, cur, next, progress };
}

export default function Dashboard() {
  const { job, hands, settings, log, board, system, systemOn, pause, resume, stop } = useSystem();
  const top = rankBoard(board).slice(0, 3);
  const { len, cur, next, progress } = jobView(job);
  const s = summary(log);
  const week = byDay(log, 7);
  const connected = hands.filter((h) => h.connected).length;
  const active = job.status === 'running' || job.status === 'paused';
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <>
      <PageHead title="통합 관제" sub={`${today} · AI Hand ${connected}/5대 연결`}
        right={
          <div className="flex gap-2">
            <button onClick={() => systemOn(!system)} className={`btn ${system ? 'btn-light' : 'btn-dark'}`}>
              <Icon name={system ? 'power-linear' : 'play-bold'} className="text-lg" />{system ? '시스템 정지' : '시스템 시작'}
            </button>
            <Link to="/express" className="btn btn-dark"><Icon name="add-circle-linear" className="text-lg" />단어 표현하기</Link>
          </div>
        } />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card dark className="lg:col-span-5 flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold mr-auto">지금 작업</h2>
            <Pill tone="light">{!system ? '시스템 정지' : active ? (job.status === 'paused' ? '일시정지' : '실행 중') : job.status === 'done' ? '완료' : '대기'}</Pill>
          </div>
          {cur ? (
            <div className="flex items-center gap-5">
              <span className="text-7xl font-bold leading-none w-20 text-center">{cur.jamo}</span>
              <div className="min-w-0">
                <p className="text-white/60 text-sm">{KIND[job.kind]} · '{job.word}'</p>
                <p className="text-xl font-semibold mt-1">{cur.hand ? `손 ${cur.hand} 동작 중` : '화면 그림으로 표시'}</p>
                <p className="text-white/60 text-sm mt-1">다음: {next ? `${next.jamo} → 손 ${next.hand}` : '마지막 자모'}</p>
              </div>
            </div>
          ) : (
            <p className="text-white/60 py-4">{job.status === 'done' ? `'${job.word}' 표현을 마쳤습니다. ${(job.ms / 1000).toFixed(1)}초 걸렸어요.` : '진행 중인 작업이 없습니다. 지문자 표현에서 단어를 입력하세요.'}</p>
          )}
          <div className="mt-auto">
            <div className="flex justify-between text-sm text-white/60 mb-2 num"><span>전체 진행률</span><span>{len && (active || job.status === 'done') ? `${Math.min(job.i + (active ? 1 : 0), len)}/${len} · ${progress}%` : '–'}</span></div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden"><div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${active || job.status === 'done' ? progress : 0}%` }} /></div>
            {active && (
              <div className="flex gap-2 mt-4">
                {job.status === 'paused'
                  ? <button onClick={resume} className="btn bg-white text-ink text-sm"><Icon name="play-bold" />재개</button>
                  : <button onClick={pause} className="btn bg-white text-ink text-sm"><Icon name="pause-bold" />일시정지</button>}
                <button onClick={stop} className="btn bg-white/10 text-white text-sm"><Icon name="stop-bold" />중지</button>
              </div>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-4">
          <CardTitle icon="graph-up-linear">주간 연습</CardTitle>
          <Spark data={week.map((d) => d.count)} labels={week.map((d) => DAYS[d.date.getDay()])} />
        </Card>

        <Card className="lg:col-span-3 !bg-white/90 flex flex-col items-center gap-3">
          <CardTitle icon="target-linear">학습 정답률</CardTitle>
          <Ring value={s.recogRate} label="전체 시도 기준" />
          <Link to="/analytics" className="btn btn-light text-sm mt-auto">통계 보기<Icon name="arrow-right-linear" /></Link>
        </Card>

        <section className="lg:col-span-12">
          <div className="flex items-center gap-2 mb-3 mt-2">
            <h2 className="text-xl font-semibold tracking-tight mr-auto">AI Hand 협업</h2>
            <span className="text-sm text-mute">검은 카드 = 지금 동작 중, 점선 = 다음 차례</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            {hands.map((h) => (
              <HandCard key={h.id} hand={h} cfg={settings.hands[h.id - 1]} active={cur?.hand === h.id && h.state === 'run'} next={next?.hand === h.id && cur?.hand !== h.id} />
            ))}
          </div>
        </section>

        <Card className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-5 content-center">
          <Stat label="표현한 단어" value={s.expressCount} unit="개" />
          <Stat label="평균 표현 시간" value={s.expressAvgMs == null ? null : (s.expressAvgMs / 1000).toFixed(1)} unit="초" />
          <Stat label="평균 피드백 시간" value={s.feedbackMs} unit="ms" hint="목표 1,000ms 이내" />
          <Stat label="오류" value={s.errors} unit="건" />
        </Card>

        <Card dark className="lg:col-span-4">
          <CardTitle icon="cup-star-linear" right={<Link to="/challenge" className="text-xs text-white/60 hover:text-white">도전하기 →</Link>}>도전 순위</CardTitle>
          {top.length ? (
            <ol className="flex flex-col gap-1.5">
              {top.map((b, k) => (
                <li key={b.t} className="flex items-center gap-3 text-sm">
                  <span className="w-5 font-bold num">{k + 1}</span>
                  <span className="mr-auto truncate font-semibold">{b.name}</span>
                  <span className="font-bold num">{b.score}/{b.total}</span>
                  <span className="text-white/60 num w-12 text-right">{(b.ms / 1000).toFixed(1)}초</span>
                </li>
              ))}
            </ol>
          ) : <p className="text-white/60 text-sm">아직 도전 기록이 없어요.</p>}
        </Card>

        <section className="lg:col-span-12">
          <div className="flex items-center mb-3 mt-2">
            <h2 className="text-xl font-semibold tracking-tight mr-auto">최근 기록</h2>
            <Link to="/analytics" className="text-sm font-semibold flex items-center gap-1">전체 보기<Icon name="alt-arrow-right-linear" /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {log.slice(0, 3).map((r) => (
              <div key={r.t + r.text} className="ink p-5 min-w-0">
                <div className="flex items-center justify-between"><span className="text-lg font-semibold truncate">{r.text}</span><Pill tone="light">{r.kind}</Pill></div>
                <p className="flex items-center gap-2 text-sm text-white/60 mt-3">
                  <span className={`w-2 h-2 rounded-full ${r.ok ? 'bg-ok' : 'bg-bad'}`} />{r.ok ? '성공' : '실패'}
                  {r.ms != null && <span className="num">· {r.ms >= 1000 ? `${(r.ms / 1000).toFixed(1)}초` : `${r.ms}ms`}</span>}
                  <span className="ml-auto num">{new Date(r.t).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
            ))}
            {!log.length && <p className="glass p-5 text-mute md:col-span-3">아직 기록이 없습니다. 지문자 표현이나 학습을 해 보면 여기에 최근 3개가 보입니다.</p>}
          </div>
        </section>
      </div>
    </>
  );
}
