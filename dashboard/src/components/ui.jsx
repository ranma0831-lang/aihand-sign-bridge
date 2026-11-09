// 화면 곳곳에서 쓰는 작은 부품: 카드, 상태 알약, 원형 진행률, 곡선 그래프, 막대 그래프
import { Icon as Iconify } from '@iconify/react';
import { STATE_LABEL } from '../lib/store.jsx';

// shortcut: 아이콘은 Iconify API에서 받아 온다(인터넷 필요). 오프라인 시연이 필요하면 @iconify-json/solar로 묶는다
export const Icon = ({ name, className = '' }) => <Iconify icon={`solar:${name}`} className={className} aria-hidden="true" />;

export function Card({ dark, className = '', children, ...p }) {
  return <section className={`${dark ? 'ink' : 'glass'} p-5 md:p-6 min-w-0 ${className}`} {...p}>{children}</section>;
}

export function CardTitle({ children, icon, right }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-lg font-semibold tracking-tight mr-auto">{children}</h2>
      {right}
      {icon && <Icon name={icon} className="text-xl opacity-70" />}
    </div>
  );
}

const TONE = {
  run: 'bg-ink text-white', done: 'bg-ok/15 text-ok', error: 'bg-bad/15 text-bad', idle: 'bg-black/5 text-mute',
  ok: 'bg-ok/15 text-ok', bad: 'bg-bad/15 text-bad', light: 'bg-white/15 text-white',
};
export function Pill({ tone = 'idle', children, className = '' }) {
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${TONE[tone]} ${className}`}>{children}</span>;
}
export const StatePill = ({ state }) => (
  <Pill tone={state}>{state === 'run' && <span className="w-1.5 h-1.5 rounded-full bg-white" />}{STATE_LABEL[state]}</Pill>
);

// 원형 진행률 (value: 0~100 또는 null)
export function Ring({ value, size = 132, stroke = 10, label, dark }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, v = value ?? 0;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size, maxWidth: '100%' }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} stroke={dark ? 'rgba(255,255,255,.15)' : 'rgba(20,20,22,.08)'} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          stroke={dark ? '#fff' : '#141416'} strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.16,1,.3,1)' }} />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-bold num">{value == null ? '–' : `${value}%`}</p>
        {label && <p className="text-[11px] opacity-60">{label}</p>}
      </div>
    </div>
  );
}

// 부드러운 곡선 그래프. data: 숫자 배열, labels: 아래 글자
export function Spark({ data, labels, height = 150 }) {
  const W = 320, H = height, P = 14, max = Math.max(1, ...data);
  const pts = data.map((v, i) => [P + (i * (W - 2 * P)) / Math.max(1, data.length - 1), H - 26 - (v / max) * (H - 54)]);
  const d = pts.reduce((acc, [x, y], i) => {
    if (!i) return `M${x},${y}`;
    const [px, py] = pts[i - 1], cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, '');
  const top = data.indexOf(Math.max(...data));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`최근 ${data.length}일 연습 횟수`}>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={P} x2={W - P} y1={(H - 26) * f + 4} y2={(H - 26) * f + 4} stroke="rgba(20,20,22,.07)" />)}
      <path d={d} fill="none" stroke="#141416" strokeWidth="2.5" strokeLinecap="round" />
      {pts.map(([x, y], i) => (
        <g key={i}>
          {i === top && data[i] > 0 && (
            <g transform={`translate(${x},${y - 18})`}>
              <rect x="-15" y="-11" width="30" height="20" rx="6" fill="#141416" />
              <text textAnchor="middle" y="3" fontSize="11" fill="#fff" fontWeight="700">{data[i]}</text>
            </g>
          )}
          <circle cx={x} cy={y} r={i === data.length - 1 ? 4.5 : 2.5} fill="#141416" />
          <text x={x} y={H - 6} textAnchor="middle" fontSize="11" fill={i === data.length - 1 ? '#141416' : '#8a8a92'} fontWeight={i === data.length - 1 ? 700 : 400}>{labels[i]}</text>
        </g>
      ))}
    </svg>
  );
}

// 세로 막대 (value: 0~100)
export function Bars({ items, dark }) {
  if (!items.length) return <p className="text-sm opacity-60 py-6">아직 학습 기록이 없습니다. 학습 화면에서 글자를 연습하면 여기에 쌓입니다.</p>;
  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-2 h-44 min-w-max pt-6">
        {items.map((it) => (
          <div key={it.label} className="flex flex-col items-center gap-1.5 w-8">
            <span className="text-[11px] num opacity-70">{it.value}</span>
            <div className={`w-6 rounded-lg ${dark ? 'bg-white' : 'bg-ink'}`} style={{ height: `${Math.max(4, it.value * 1.1)}px` }} />
            <span className="text-sm font-semibold">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Stat({ label, value, unit, hint }) {
  return (
    <div className="min-w-0">
      <p className="text-sm text-mute">{label}</p>
      <p className="text-2xl md:text-3xl font-bold num mt-1">{value ?? '–'}{value != null && unit && <span className="text-base font-semibold ml-0.5">{unit}</span>}</p>
      {hint && <p className="text-xs text-mute mt-0.5">{hint}</p>}
    </div>
  );
}
