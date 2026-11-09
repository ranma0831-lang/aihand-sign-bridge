// ④ 개별 제어: 손별 연결·상태, 손가락 목표 각도, 테스트 동작, 긴급 정지
import { useState } from 'react';
import { PageHead } from '../components/Shell.jsx';
import { Card, Icon } from '../components/ui.jsx';
import { HandCard } from '../components/hands.jsx';
import { JAMO_ALL } from '../lib/hangul.js';
import { useSystem } from '../lib/store.jsx';

const FINGERS = ['엄지', '검지', '중지', '약지', '소지'];

function Angles({ values, dark }) {
  return (
    <div className="flex flex-col gap-1.5">
      {FINGERS.map((f, k) => (
        <div key={f} className="flex items-center gap-2 text-xs">
          <span className={`w-7 ${dark ? 'text-white/60' : 'text-mute'}`}>{f}</span>
          <div className={`flex-1 h-1.5 rounded-full ${dark ? 'bg-white/15' : 'bg-black/10'}`}>
            <div className={`h-full rounded-full ${dark ? 'bg-white' : 'bg-ink'}`} style={{ width: `${(values[k] / 180) * 100}%` }} />
          </div>
          <span className="w-8 text-right num">{values[k]}°</span>
        </div>
      ))}
    </div>
  );
}

function HandControl({ hand }) {
  const { settings, test, clearError, log } = useSystem();
  const mine = JAMO_ALL.filter((j) => settings.assign[j] === hand.id);
  const [jamo, setJamo] = useState(mine[0] || 'ㄱ');
  const last = log.find((r) => r.kind === '테스트' && r.text.startsWith(`손 ${hand.id} `));
  const dark = hand.state === 'error';
  return (
    <HandCard hand={hand} cfg={settings.hands[hand.id - 1]} active={hand.state === 'run'}>
      <Angles values={settings.angles[jamo]} dark={dark || hand.state === 'run'} />
      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`j${hand.id}`}>테스트할 글자</label>
        <select id={`j${hand.id}`} value={jamo} onChange={(e) => setJamo(e.target.value)} className="field !py-2 !rounded-full text-sm text-ink flex-1 min-w-0">
          {JAMO_ALL.map((j) => <option key={j} value={j}>{settings.assign[j] === hand.id ? `● ${j}` : j}</option>)}
        </select>
        <button onClick={() => test(hand.id, jamo)} disabled={!hand.connected || hand.state === 'run'} className={`btn !py-2 text-sm ${dark || hand.state === 'run' ? 'bg-white text-ink' : 'btn-dark'}`}>테스트</button>
      </div>
      <p className={`text-xs ${dark || hand.state === 'run' ? 'text-white/60' : 'text-mute'}`}>
        담당 {mine.length}글자{last && ` · 최근 테스트 ${last.ok ? '성공' : '실패'}`}
      </p>
      {hand.state === 'error' && <button onClick={() => clearError(hand.id)} className="btn bg-white/10 text-white text-sm !py-2">오류 해제</button>}
    </HandCard>
  );
}

export default function Robots() {
  const { hands, estop } = useSystem();
  return (
    <>
      <PageHead title="개별 제어" sub="손마다 연결 상태와 손가락 목표 각도를 확인하고 동작을 하나씩 테스트합니다."
        right={<button onClick={estop} className="btn btn-danger"><Icon name="stop-circle-bold" className="text-lg" />모든 손 긴급 정지</button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {hands.map((h) => <HandControl key={h.id} hand={h} />)}
      </div>
      <Card className="mt-4 text-sm text-mute">
        각도는 설정 화면의 자모별 손가락 각도표에서 가져옵니다. 테스트를 누르면 중앙 PC에 <code className="text-ink">{'{type:"test", hand, jamo, angles}'}</code>를 보냅니다.
        실패하거나 통신이 끊기면 오른쪽 위에 알림이 뜹니다.
      </Card>
    </>
  );
}
