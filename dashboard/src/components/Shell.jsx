// 사이드바(휴대폰에서는 아래쪽 탭 바) + 알림 토스트 + 본문 틀
// 메뉴는 사용자용과 관리자용(팀원)으로 나뉜다. 지금 주소가 관리자 화면이면 관리자 메뉴를 보여 준다
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useSystem } from '../lib/store.jsx';
import { Icon } from './ui.jsx';
import JamoPopup from './JamoPopup.jsx';

export const USER_NAV = [
  { to: '/', label: '지문자 표현', icon: 'text-square-linear' },
  { to: '/learn', label: '학습', icon: 'book-bookmark-linear' },
  { to: '/challenge', label: '도전', icon: 'cup-star-linear' },
  { to: '/quiz', label: '맞히기', icon: 'question-square-linear' },
  { to: '/chart', label: '지문자 표', icon: 'gallery-wide-linear' },
  { to: '/guide', label: '사용법', icon: 'question-circle-linear', tip: true },
];
export const ADMIN_NAV = [
  { to: '/admin', label: '통합 관제', icon: 'widget-5-linear' },
  { to: '/robots', label: '개별 제어', icon: 'tuning-2-linear' },
  { to: '/analytics', label: '통계', icon: 'chart-2-linear' },
  { to: '/settings', label: '설정', icon: 'settings-linear' },
];
const isAdminPath = (path) => ADMIN_NAV.some((n) => n.to === path);

// 사용법은 처음 쓰는 사람이 찾기 쉽게 다른 색으로
const navCls = (n, isActive, mobile) => isActive ? `bg-ink text-white font-semibold`
  : n.tip ? 'bg-amber-100 text-amber-900 font-semibold hover:bg-amber-200' : mobile ? 'text-mute' : 'hover:bg-black/5';

function ConnPill() {
  const { conn } = useSystem();
  const [txt, cls] = { mock: ['가짜 데이터', 'bg-black/5 text-mute'], open: ['PC 연결됨', 'bg-ok/15 text-ok'], closed: ['PC 연결 끊김', 'bg-bad/15 text-bad'] }[conn];
  return <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${cls}`} role="status">{txt}</span>;
}

function EStop({ compact }) {
  const { estop } = useSystem();
  return (
    <button onClick={estop} className={`btn btn-danger ${compact ? 'px-3 py-2 text-sm' : 'w-full'}`}>
      <Icon name="stop-circle-bold" className="text-lg" />긴급 정지
    </button>
  );
}

function Toasts() {
  const { toasts } = useSystem();
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))]" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`${t.tone === 'error' ? 'ink' : 'glass'} px-4 py-3 text-sm flex items-center gap-2 !rounded-2xl`}>
          <Icon name={t.tone === 'error' ? 'danger-triangle-bold' : t.tone === 'ok' ? 'check-circle-bold' : 'info-circle-bold'}
            className={`text-lg shrink-0 ${t.tone === 'error' ? 'text-bad' : t.tone === 'ok' ? 'text-ok' : ''}`} />
          {t.text}
        </div>
      ))}
    </div>
  );
}

export default function Shell({ children }) {
  const admin = isAdminPath(useLocation().pathname);
  const nav = admin ? ADMIN_NAV : USER_NAV;
  const swap = admin ? { to: '/', label: '사용자 화면', icon: 'user-linear' } : { to: '/admin', label: '관리자', icon: 'shield-user-linear' };
  return (
    <div className="min-h-[100dvh] p-0 md:p-6 lg:p-8">
      <div className="frame md:rounded-[40px] max-w-[1440px] mx-auto md:p-4 flex gap-4 min-h-[100dvh] md:min-h-[calc(100dvh-3rem)]">
        <aside className="glass hidden md:flex flex-col w-56 shrink-0 p-5 gap-1">
          <div className="flex items-center gap-2 px-2 mb-8 mt-1">
            <span className="grid place-items-center w-9 h-9 rounded-xl bg-ink text-white"><Icon name="hand-stars-bold" className="text-lg" /></span>
            <div><p className="font-bold leading-tight">Sign Bridge</p><p className="text-xs text-mute">{admin ? '관리자 화면' : '14조 지문자 학습'}</p></div>
          </div>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end
              className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition ${navCls(n, isActive)}`}>
              <Icon name={n.icon} className="text-lg" />{n.label}
            </NavLink>
          ))}
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <Link to={swap.to} className="btn btn-light text-sm !py-2"><Icon name={swap.icon} className="text-lg" />{admin ? '사용자 화면으로' : '관리자 모드'}</Link>
            <ConnPill />
            <EStop />
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="md:hidden flex items-center gap-2 px-4 pt-4">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-ink text-white"><Icon name="hand-stars-bold" /></span>
            <span className="font-bold mr-auto">Sign Bridge</span>
            <ConnPill />
            <EStop compact />
          </div>
          <main className="flex-1 min-w-0 px-4 py-5 md:p-4 pb-28 md:pb-4">{children}</main>
        </div>
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass !rounded-none !rounded-t-3xl grid px-1 pt-2 pb-[max(.5rem,env(safe-area-inset-bottom))]" style={{ gridTemplateColumns: `repeat(${nav.length + 1}, 1fr)` }}>
        {[...nav, swap].map((n) => (
          <NavLink key={n.to} to={n.to} end
            className={({ isActive }) => `flex flex-col items-center gap-0.5 py-1.5 rounded-2xl text-[10px] ${navCls(n, isActive && n !== swap, true)}`}>
            <Icon name={n.icon} className="text-xl" />{n.label}
          </NavLink>
        ))}
      </nav>
      <JamoPopup />
      <Toasts />
    </div>
  );
}

export function PageHead({ title, sub, right }) {
  return (
    <header className="flex flex-wrap items-end gap-3 mb-5">
      <div className="mr-auto min-w-0">
        <h1 className="text-2xl md:text-[2rem] font-bold tracking-tight leading-snug">{title}</h1>
        {sub && <p className="text-mute mt-1">{sub}</p>}
      </div>
      {right}
    </header>
  );
}
