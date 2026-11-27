// 사용자 첫 화면(홈): 사용자가 쓸 수 있는 화면을 한눈에 보여 주고 누르면 이동 (벤토: 표현을 크게, 카드에는 실제 기록)
import { Link } from 'react-router-dom';
import { Icon, Ring } from '../components/ui.jsx';
import { KEYS } from '../lib/angleTable.js';
import { useSystem } from '../lib/store.jsx';
import { rankBoard } from '../lib/stats.js';
import { SignImage } from './Chart.jsx';

const SCREENS = [
  { to: '/express', title: '지문자 표현', desc: '단어를 입력하면 AI Hand 5대가 차례로 보여 줘요', icon: 'text-square-linear' },
  { to: '/learn', title: '학습', desc: 'AI Hand 시범을 보고 웹캠 앞에서 따라 해요', icon: 'book-bookmark-linear' },
  { to: '/quiz', title: '맞히기', desc: 'AI Hand가 만든 손 모양이 어떤 글자인지 골라요', icon: 'question-square-linear' },
  { to: '/challenge', title: '도전', desc: '5글자를 연속으로 따라 하고 순위에 올라요', icon: 'cup-star-linear' },
  { to: '/chart', title: '지문자 표', desc: '자음·모음·숫자 손 모양을 한눈에 봐요', icon: 'gallery-wide-linear' },
  { to: '/guide', title: '사용법', desc: '처음이라면 여기부터 보세요', icon: 'question-circle-linear' },
];
const by = (to) => SCREENS.find((s) => s.to === to);

// 실제 기록에서 뽑은 숫자 (없으면 '–')
function useNumbers() {
  const { log, board } = useSystem();
  const learned = new Set(log.filter((r) => r.kind === '학습' && r.ok).map((r) => r.text)).size;
  const quiz = log.filter((r) => r.kind === '맞히기');
  const quizRate = quiz.length ? Math.round((quiz.filter((r) => r.ok).length / quiz.length) * 100) : null;
  const top = rankBoard(board)[0];
  return { learned, total: KEYS.length, quizRate, quizN: quiz.length, top };
}

const Arrow = () => <Icon name="arrow-right-up-linear" className="text-xl transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />;
const hover = 'group transition duration-300 ease-out hover:-translate-y-0.5 hover:shadow-lg active:scale-[.99]';

function Bento() {
  const n = useNumbers();
  const tile = (to, extra = '', children) => {
    const s = by(to);
    return (
      <Link to={to} className={`glass p-5 md:p-6 flex flex-col gap-3 min-w-0 ${hover} ${extra}`}>
        <div className="flex items-center gap-2"><Icon name={s.icon} className="text-2xl" /><span className="ml-auto text-mute"><Arrow /></span></div>
        <h2 className="text-xl font-bold tracking-tight">{s.title}</h2>
        <p className="text-sm text-mute break-keep">{s.desc}</p>
        {children}
      </Link>
    );
  };
  return (
    <div className="grid gap-4">
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4 auto-rows-[minmax(10rem,auto)]">
      <Link to="/express" className={`ink p-6 md:p-8 md:col-span-4 md:row-span-2 flex flex-col gap-4 ${hover}`}>
        <div className="flex items-center gap-2"><Icon name="text-square-linear" className="text-3xl" /><span className="ml-auto text-white/60"><Arrow /></span></div>
        <p className="text-white/60 text-sm">가장 많이 쓰는 기능</p>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight break-keep">단어를 입력하면<br />AI Hand가 지문자로</h2>
        <div className="flex flex-wrap gap-2 mt-auto">
          {['사랑', '하이', '안녕', '나비'].map((w) => <span key={w} className="px-4 py-1.5 rounded-full bg-white/10 text-sm font-semibold">{w}</span>)}
          <span className="px-4 py-1.5 rounded-full bg-white text-ink text-sm font-bold">표현 시작</span>
        </div>
      </Link>
      {tile('/learn', 'md:col-span-2 md:row-span-2', (
        <div className="mt-auto flex items-center gap-4">
          <Ring value={Math.round((n.learned / n.total) * 100)} size={88} stroke={8} label={`${n.learned}/${n.total}`} />
          <p className="text-sm text-mute break-keep">맞힌 글자에 초록 점이 붙어요</p>
        </div>
      ))}
      {tile('/quiz', 'md:col-span-2', <p className="mt-auto text-sm"><b className="num text-lg">{n.quizRate ?? '–'}{n.quizRate != null && '%'}</b> <span className="text-mute">정답률 · {n.quizN}문제</span></p>)}
      {tile('/challenge', 'md:col-span-2', <p className="mt-auto text-sm text-mute">{n.top ? <>1위 <b className="text-ink">{n.top.name}</b> · {n.top.score}점</> : '아직 기록이 없어요. 첫 1위가 되어 보세요'}</p>)}
      {tile('/chart', 'md:col-span-2', (
        <div className="mt-auto flex gap-2">{['ㄱ', 'ㅏ', '5'].map((k) => <SignImage key={k} k={k} className="w-14" />)}</div>
      ))}
    </div>
      <Link to="/guide" className={`rounded-[28px] bg-amber-100 text-amber-900 px-6 py-4 flex items-center gap-3 ${hover}`}>
        <Icon name="lightbulb-bolt-linear" className="text-2xl" />
        <span className="font-semibold">처음이세요? 사용법을 먼저 보면 쉬워요</span>
        <span className="ml-auto"><Arrow /></span>
      </Link>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <header className="mb-5">
        <p className="text-sm text-mute">14조 AI Hand Sign Bridge</p>
        <h1 className="text-2xl md:text-[2rem] font-bold tracking-tight">안녕하세요, 지문자를 배워 볼까요?</h1>
      </header>
      <Bento />
    </>
  );
}
