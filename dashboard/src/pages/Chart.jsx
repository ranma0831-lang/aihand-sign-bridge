// 지문자 표: 자음·모음·숫자 손 모양을 한눈에 보는 공부용 화면 (그림: 국립장애인도서관, public/jamo/<글자>.png)
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { PageHead } from '../components/Shell.jsx';
import { Card, CardTitle, Icon } from '../components/ui.jsx';
import { KEYS } from '../lib/angleTable.js';
import { useSystem } from '../lib/store.jsx';

const isVowel = (k) => k >= 'ㅏ' && k <= 'ㅣ';
const SECTIONS = [
  { title: '자음', icon: 'text-bold', keys: KEYS.filter((k) => !/^\d+$/.test(k) && !isVowel(k)) },
  { title: '모음', icon: 'text-italic-linear', keys: KEYS.filter(isVowel) },
  { title: '숫자', icon: 'calculator-linear', keys: Array.from({ length: 15 }, (_, i) => String(i + 1)) },
];

// 그림이 없으면(배포본에 그림을 안 올린 경우) 글자를 크게 보여 준다
function SignImage({ k, className = '' }) {
  const [ok, setOk] = useState(true);
  return ok
    ? <img src={`./jamo/${encodeURIComponent(k)}.png`} alt={`'${k}' 지문자`} onError={() => setOk(false)} className={`aspect-square object-contain bg-white rounded-2xl ${className}`} />
    : <span className={`aspect-square grid place-items-center rounded-2xl bg-black/5 text-5xl font-bold ${className}`}>{k}</span>;
}

export default function Chart() {
  const { settings } = useSystem();
  const [pick, setPick] = useState(null);
  // AI Hand가 맡는지: 각도표에 맡는 손이 있으면 손 번호, 없으면 화면 안내. 11 이상은 움직임이 있어 항상 화면
  const who = (k) => {
    const hs = settings.table[k]?.hands || [];
    return hs.length ? `손 ${hs.join(',')}` : Number(k) > 10 ? '움직임 · 화면' : '화면 안내';
  };

  return (
    <>
      <PageHead title="지문자 표" sub="자음 14개, 모음 17개, 숫자 손 모양을 모았어요. 그림을 누르면 크게 볼 수 있어요." />
      <div className="grid gap-4">
        {SECTIONS.map((s) => (
          <Card key={s.title}>
            <CardTitle icon={s.icon} right={<span className="text-sm text-mute num">{s.keys.length}개</span>}>{s.title}</CardTitle>
            <ul className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3">
              {s.keys.map((k) => (
                <li key={k}>
                  <button onClick={() => setPick(k)} className="w-full text-center rounded-3xl p-2 hover:bg-black/5 transition" aria-label={`${k} 크게 보기`}>
                    <SignImage k={k} className="w-full" />
                    <p className="text-xl font-bold mt-1">{k}</p>
                    <p className="text-xs text-mute">{who(k)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
        <p className="text-xs text-mute text-center">그림: 국립장애인도서관 · 숫자 11~15는 두 동작을 이어서 하거나 움직임이 있어 AI Hand 대신 화면으로 보여 줍니다.</p>
      </div>

      {/* body에 붙인다: 본문 틀(frame)의 효과 때문에 fixed가 화면이 아니라 틀 기준이 되는 것을 피함 */}
      {pick && createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/50" onClick={() => setPick(null)} role="dialog" aria-modal="true" aria-label={`'${pick}' 크게 보기`}>
          <div className="glass !rounded-3xl p-6 w-[min(26rem,100%)] text-center bg-white" onClick={(e) => e.stopPropagation()}>
            <SignImage k={pick} className="w-full" />
            <p className="text-4xl font-bold mt-3">{pick}</p>
            <p className="text-mute mt-1">{who(pick)}</p>
            <button onClick={() => setPick(null)} className="btn btn-dark mt-4" autoFocus><Icon name="close-circle-linear" />닫기</button>
          </div>
        </div>, document.body,
      )}
    </>
  );
}
