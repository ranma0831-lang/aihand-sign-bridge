// ④ 개별 제어: 손별 상태, 손가락 목표 각도(각도표), 테스트 동작, 긴급 정지
// 블루투스 직접 연결은 테스트용 (시연·통합 때는 이정민 님 중앙 프로그램이 손을 움직인다)
import { useState } from 'react';
import { PageHead } from '../components/Shell.jsx';
import { Card, Icon } from '../components/ui.jsx';
import { HandCard } from '../components/hands.jsx';
import { KEYS } from '../lib/angleTable.js';
import { anglesOf, useSystem } from '../lib/store.jsx';

export const JOINTS = ['엄지', '검지', '중지', '약지', '새끼', '손목'];

function Angles({ values, dark }) {
  return (
    <div className="flex flex-col gap-1.5">
      {JOINTS.map((f, k) => (
        <div key={f} className="flex items-center gap-2 text-xs">
          <span className={`w-7 ${dark ? 'text-white/60' : 'text-mute'}`}>{f}</span>
          <div className={`flex-1 h-1.5 rounded-full ${dark ? 'bg-white/15' : 'bg-black/10'}`}>
            <div className={`h-full rounded-full ${dark ? 'bg-white' : 'bg-ink'}`} style={{ width: `${((values[k] ?? 90) / 180) * 100}%` }} />
          </div>
          <span className="w-8 text-right num">{values[k] ?? 90}°</span>
        </div>
      ))}
    </div>
  );
}

function HandControl({ hand }) {
  const { settings, test, clearError, log } = useSystem();
  const mine = KEYS.filter((j) => settings.table[j]?.hands.includes(hand.id));
  const [jamo, setJamo] = useState(mine[0] || 'ㄱ');
  const last = log.find((r) => r.kind === '테스트' && r.text.startsWith(`손 ${hand.id} `));
  const dark = hand.state === 'error' || hand.state === 'run';
  const sub = dark ? 'text-white/60' : 'text-mute';
  const row = settings.table[jamo];
  return (
    <HandCard hand={hand} cfg={settings.hands[hand.id - 1]} active={hand.state === 'run'}>
      <Angles values={anglesOf(settings, jamo) || []} dark={dark} />
      {row && <p className={`text-xs ${sub}`}>{jamo}: {row.dir}·{row.face} · {row.status || '초안'}{row.note && ` · ${row.note}`}</p>}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`j${hand.id}`}>테스트할 글자</label>
        <select id={`j${hand.id}`} value={jamo} onChange={(e) => setJamo(e.target.value)} className="field !py-2 !rounded-full text-sm text-ink flex-1 min-w-0">
          {[...KEYS, '칭찬', '쉼'].map((j) => <option key={j} value={j}>{settings.table[j]?.hands.includes(hand.id) ? `● ${j}` : j}</option>)}
        </select>
        <button onClick={() => test(hand.id, jamo)} disabled={!hand.connected || hand.state === 'run'} className={`btn !py-2 text-sm ${dark ? 'bg-white text-ink' : 'btn-dark'}`}>테스트</button>
      </div>
      <p className={`text-xs ${sub}`}>● 맡는 글자{last && ` · 최근 테스트 ${last.ok ? '성공' : '실패'}`}</p>
      {hand.state === 'error' && <button onClick={() => clearError(hand.id)} className="btn bg-white/10 text-white text-sm !py-2">오류 해제</button>}
    </HandCard>
  );
}

// 테스트용: 대시보드에서 micro:bit에 블루투스로 직접 붙어 각도를 확인할 때만 쓴다
function DirectConnect() {
  const { hands, usb, usbReply, hwSupported, connectUsb, disconnectUsb, bus } = useSystem();
  return (
    <details className="glass mt-4 p-5 md:p-6 group">
      <summary className="cursor-pointer font-semibold flex items-center gap-2 list-none">
        <Icon name="plug-circle-linear" className="text-lg" />테스트용 직접 연결 (블루투스)
        <span className="text-xs text-mute font-normal ml-auto group-open:hidden">펼치기</span>
      </summary>
      <div className="mt-4 flex flex-col gap-3 text-sm">
        <p className="text-mute">시연·통합 때는 <b className="text-ink">이정민 님 중앙 프로그램</b>이 중계 micro:bit로 손 5대를 움직입니다. 이 연결은 각도표를 실제 손으로 확인할 때만 쓰세요.
          {bus.real && <b className="text-bad"> 지금은 중앙 프로그램에 연결되어 있어서, 여기서 연결해도 대시보드는 손에 명령을 보내지 않습니다.</b>}</p>
        {!hwSupported ? <p className="text-bad">이 브라우저는 블루투스 연결을 지원하지 않습니다. 크롬이나 엣지에서 열어 주세요.</p> : (
          <div className="flex flex-wrap gap-2">
            {hands.map((h) => {
              const on = usb.includes(h.id);
              return (
                <button key={h.id} onClick={() => (on ? disconnectUsb(h.id) : connectUsb(h.id))} className={`btn !py-2 text-sm ${on ? 'bg-ok/15 text-ok' : 'btn-light'}`}>
                  <Icon name={on ? 'plug-circle-bold' : 'plug-circle-linear'} />손 {h.id} {on ? `연결됨 · ${usbReply[h.id]?.line || '응답 대기'}` : '연결'}
                </button>
              );
            })}
          </div>
        )}
        <p className="text-mute">micro:bit에 <code className="text-ink">firmware/aihand-receiver.ts</code>를 넣고(README 참고) 확장 보드 전원 ON → 손 번호 버튼 → BBC micro:bit 선택 → 하트가 뜨면 연결. 각 손 카드의 "테스트"로 각도를 확인합니다.</p>
      </div>
    </details>
  );
}

export default function Robots() {
  const { hands, estop } = useSystem();
  return (
    <>
      <PageHead title="개별 제어" sub="손마다 상태와 각도표의 목표 각도를 확인하고 동작을 하나씩 테스트합니다."
        right={<button onClick={estop} className="btn btn-danger"><Icon name="stop-circle-bold" className="text-lg" />모든 손 긴급 정지</button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {hands.map((h) => <HandControl key={h.id} hand={h} />)}
      </div>
      <Card className="mt-4 text-sm text-mute">
        각도는 <b className="text-ink">각도표(이정민 님 양식, 이기태 님 확인)</b>에서 옵니다. 서보 기준: 엄지 펴짐 90 / 굽힘 180, 나머지 손가락 펴짐 90 / 굽힘 0, 손목 90 고정.
        손등이 보이는 글자는 손을 받침대에 뒤돌려 세웁니다.
      </Card>
      <DirectConnect />
    </>
  );
}
