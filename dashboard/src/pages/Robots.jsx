// ④ 개별 제어: 손별 연결·상태, 손가락 목표 각도, 테스트 동작, 블루투스 직접 연결, 긴급 정지
import { useState } from 'react';
import { PageHead } from '../components/Shell.jsx';
import { Card, Icon } from '../components/ui.jsx';
import { HandCard } from '../components/hands.jsx';
import { SIGN_KEYS } from '../lib/hangul.js';
import { SIGNS } from '../lib/signs.js';
import { useSystem } from '../lib/store.jsx';

export const JOINTS = ['엄지', '검지', '중지', '약지', '소지', '손목'];

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
  const { settings, test, clearError, log, usb, usbReply, hwSupported, connectUsb, disconnectUsb } = useSystem();
  const mine = SIGN_KEYS.filter((j) => settings.assign[j] === hand.id);
  const [jamo, setJamo] = useState(mine[0] || 'ㄱ');
  const last = log.find((r) => r.kind === '테스트' && r.text.startsWith(`손 ${hand.id} `));
  const onUsb = usb.includes(hand.id);
  const dark = hand.state === 'error' || hand.state === 'run';
  const sub = dark ? 'text-white/60' : 'text-mute';
  return (
    <HandCard hand={hand} cfg={settings.hands[hand.id - 1]} active={hand.state === 'run'}>
      {hwSupported && (
        <button onClick={() => (onUsb ? disconnectUsb(hand.id) : connectUsb(hand.id))}
          className={`btn !py-2 text-sm ${onUsb ? 'bg-ok/15 text-ok' : dark ? 'bg-white/10 text-white' : 'btn-light'}`}>
          <Icon name={onUsb ? 'plug-circle-bold' : 'plug-circle-linear'} />{onUsb ? '실제 손 연결됨 · 해제' : '블루투스로 실제 손 연결'}
        </button>
      )}
      {onUsb && (
        <p className={`text-xs ${sub}`} role="status">
          micro:bit 응답: {usbReply[hand.id] ? <b className={usbReply[hand.id].line.startsWith('OK') ? 'text-ok' : 'text-bad'}>{usbReply[hand.id].line}</b> : '아직 없음'}
        </p>
      )}
      <Angles values={settings.angles[jamo] || []} dark={dark} />
      {SIGNS[jamo]?.note && <p className={`text-xs ${sub}`}>{jamo}: {SIGNS[jamo].note}</p>}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`j${hand.id}`}>테스트할 글자</label>
        <select id={`j${hand.id}`} value={jamo} onChange={(e) => setJamo(e.target.value)} className="field !py-2 !rounded-full text-sm text-ink flex-1 min-w-0">
          {[...SIGN_KEYS, '칭찬', '쉼'].map((j) => <option key={j} value={j}>{settings.assign[j] === hand.id ? `● ${j}` : j}</option>)}
        </select>
        <button onClick={() => test(hand.id, jamo)} disabled={!hand.connected || hand.state === 'run'} className={`btn !py-2 text-sm ${dark ? 'bg-white text-ink' : 'btn-dark'}`}>테스트</button>
      </div>
      <p className={`text-xs ${sub}`}>● 담당 {mine.length}글자{last && ` · 최근 테스트 ${last.ok ? '성공' : '실패'}`}</p>
      {hand.state === 'error' && <button onClick={() => clearError(hand.id)} className="btn bg-white/10 text-white text-sm !py-2">오류 해제</button>}
    </HandCard>
  );
}

export default function Robots() {
  const { hands, estop, hwSupported } = useSystem();
  return (
    <>
      <PageHead title="개별 제어" sub="손마다 연결 상태와 손가락 목표 각도를 확인하고 동작을 하나씩 테스트합니다."
        right={<button onClick={estop} className="btn btn-danger"><Icon name="stop-circle-bold" className="text-lg" />모든 손 긴급 정지</button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {hands.map((h) => <HandControl key={h.id} hand={h} />)}
      </div>
      <Card className="mt-4 text-sm text-mute flex flex-col gap-2">
        <p><b className="text-ink">실제 AI Hand 연결:</b> micro:bit에 <code className="text-ink">firmware/aihand-receiver.ts</code> 프로그램을 넣고(README 참고) 확장 보드 전원을 켠 뒤 "블루투스로 실제 손 연결"을 눌러 목록에서 BBC micro:bit를 고르세요. micro:bit에 하트가 뜨면 연결된 것입니다.
          연결된 손은 표현·학습·테스트 때 화면과 같이 움직입니다. {!hwSupported && <b className="text-bad">이 브라우저는 블루투스 연결을 지원하지 않습니다. 크롬이나 엣지에서 열어 주세요.</b>}</p>
        <p>각도는 설정 화면의 손 모양표에서 가져옵니다(교재 사진 기준 추정값). 실제 손으로 테스트하면서 설정 화면에서 고치세요.</p>
      </Card>
    </>
  );
}
