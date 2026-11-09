// AI Hand 카드와 자모 진행 칩
import { Icon, StatePill } from './ui.jsx';

export function HandCard({ hand, cfg, active, next, children }) {
  const dark = active || hand.state === 'error';
  return (
    <div className={`${dark ? 'ink' : 'glass'} p-4 min-w-0 flex flex-col gap-3 ${active ? 'live' : ''} ${next ? 'outline-2 outline-dashed outline-ink/40' : ''}`}>
      <div className="flex items-center gap-2">
        <span className={`grid place-items-center w-9 h-9 rounded-full ${dark ? 'bg-white/10' : 'bg-black/5'}`}>
          <Icon name="hand-stars-linear" className="text-lg" />
        </span>
        <div className="mr-auto min-w-0">
          <p className="font-semibold leading-tight">손 {hand.id}</p>
          <p className={`text-xs ${dark ? 'text-white/60' : 'text-mute'}`}>{cfg?.dir} · {cfg?.role}</p>
        </div>
        <StatePill state={hand.state} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className="text-4xl font-bold leading-none h-10">{hand.state === 'run' || hand.state === 'done' ? hand.jamo : ''}</span>
        <span className={`flex items-center gap-1 text-xs ${hand.connected ? (dark ? 'text-white/70' : 'text-ok') : 'text-bad'}`}>
          <span className={`w-2 h-2 rounded-full ${hand.connected ? 'bg-ok' : 'bg-bad'}`} />
          {hand.connected ? '연결됨' : '끊김'}
        </span>
      </div>
      {next && <p className="text-xs font-semibold">다음 차례</p>}
      {children}
    </div>
  );
}

// plan: [{jamo, hand}], i: 지금 위치
export function JamoChips({ plan, i, done }) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="자모 순서">
      {plan.map((p, k) => {
        const now = k === i && !done, past = k < i || done;
        return (
          <li key={k} className={`flex flex-col items-center gap-1 w-14 py-2 rounded-2xl border transition
            ${now ? 'bg-ink text-white border-ink -translate-y-1' : past ? 'border-black/5 bg-white/40 opacity-50' : 'border-black/10 bg-white/70'}
            ${p.hand == null ? 'border-dashed' : ''}`}>
            <span className="text-2xl font-bold">{p.jamo}</span>
            <span className={`text-[10px] font-semibold ${now ? 'text-white/70' : 'text-mute'}`}>{p.hand == null ? '화면' : `손 ${p.hand}`}</span>
          </li>
        );
      })}
    </ol>
  );
}
