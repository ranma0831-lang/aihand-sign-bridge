// ⑥ 설정: 손 방향·역할, 자모별 담당 손과 손가락 각도, 표현 불가 글자, 속도, 카메라·음성
import { PageHead } from '../components/Shell.jsx';
import { Card, CardTitle, Icon } from '../components/ui.jsx';
import { SIGN_KEYS } from '../lib/hangul.js';
import { SIGNS } from '../lib/signs.js';
import { DIRS, useSystem } from '../lib/store.jsx';

const FINGERS = ['엄지', '검지', '중지', '약지', '소지', '손목'];
const KEYS = [...SIGN_KEYS, '칭찬', '쉼'];

export default function Settings() {
  const { settings: s, updateSettings, resetSettings, toast } = useSystem();

  const setHandCfg = (id, patch) => updateSettings((p) => ({ hands: p.hands.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
  // 담당 손 선택: '화면'이면 표현 불가 글자 목록에 넣는다
  const setAssign = (j, v) => updateSettings((p) => ({
    assign: { ...p.assign, [j]: v === 'screen' ? null : Number(v) },
    screenOnly: v === 'screen' ? [...new Set([...p.screenOnly, j])] : p.screenOnly.filter((x) => x !== j),
  }));
  const setAngle = (j, k, v) => updateSettings((p) => ({
    angles: { ...p.angles, [j]: (p.angles[j] ?? [90, 90, 90, 90, 90, 90]).map((a, i) => (i === k ? Math.max(0, Math.min(180, Number(v) || 0)) : a)) },
  }));

  function exportJson() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }));
    Object.assign(document.createElement('a'), { href: url, download: 'sign-bridge-settings.json' }).click();
    URL.revokeObjectURL(url);
  }
  async function importJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data.assign || !data.angles) throw new Error();
      updateSettings(data);
      toast('설정 파일을 불러왔습니다', 'ok');
    } catch { toast('설정 파일 형식이 맞지 않습니다', 'error'); }
    e.target.value = '';
  }

  return (
    <>
      <PageHead title="설정" sub="자모별 담당 손과 손가락 각도를 관리합니다. 바꾼 내용은 바로 저장됩니다."
        right={
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-light cursor-pointer"><Icon name="upload-linear" />불러오기<input type="file" accept="application/json" onChange={importJson} className="sr-only" /></label>
            <button onClick={exportJson} className="btn btn-dark"><Icon name="download-linear" />JSON 내보내기</button>
          </div>
        } />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
          <CardTitle icon="hand-stars-linear">AI Hand 방향과 역할</CardTitle>
          <div className="grid gap-2">
            {s.hands.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-2">
                <span className="w-12 font-semibold">손 {h.id}</span>
                <select aria-label={`손 ${h.id} 방향`} value={h.dir} onChange={(e) => setHandCfg(h.id, { dir: e.target.value })} className="field !py-2 flex-1 min-w-24">
                  {DIRS.map((d) => <option key={d}>{d}</option>)}
                </select>
                <input aria-label={`손 ${h.id} 역할`} value={h.role} onChange={(e) => setHandCfg(h.id, { role: e.target.value })} className="field !py-2 flex-1 min-w-24" />
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5 flex flex-col gap-5">
          <CardTitle icon="tuning-square-2-linear">동작과 입력</CardTitle>
          <label className="grid gap-1 text-sm">
            <span className="flex justify-between"><span>자모 하나 동작 시간</span><b className="num">{(s.stepMs / 1000).toFixed(1)}초</b></span>
            <input type="range" min="500" max="3000" step="100" value={s.stepMs} onChange={(e) => updateSettings({ stepMs: +e.target.value })} className="accent-ink" />
          </label>
          <label className="grid gap-1 text-sm">
            <span className="flex justify-between"><span>자모 사이 대기 시간</span><b className="num">{s.gapMs}ms</b></span>
            <input type="range" min="0" max="1500" step="50" value={s.gapMs} onChange={(e) => updateSettings({ gapMs: +e.target.value })} className="accent-ink" />
          </label>
          {[['camera', '학습 모드 카메라 사용'], ['voice', '음성 입력·음성 안내 사용']].map(([k, label]) => (
            <label key={k} className="flex items-center justify-between text-sm">
              {label}
              <input type="checkbox" checked={s[k]} onChange={(e) => updateSettings({ [k]: e.target.checked })} className="w-5 h-5 accent-ink" />
            </label>
          ))}
          <button onClick={resetSettings} className="btn btn-light text-sm mt-auto">기본값으로 되돌리기</button>
        </Card>

        <Card className="lg:col-span-12 !p-0 overflow-hidden">
          <div className="px-6 pt-5">
            <CardTitle icon="list-linear" right={<span className="text-xs text-mute">교재 사진 기준 추정값 · 실제 손으로 확인하며 고치세요</span>}>글자별 담당 손과 각도 (0~180°)</CardTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm num">
              <thead className="text-mute text-left"><tr>
                <th className="px-6 py-2 font-medium">자모</th><th className="px-3 py-2 font-medium">담당</th><th className="px-3 py-2 font-medium whitespace-nowrap">사진 기준 모양</th>
                {FINGERS.map((f) => <th key={f} className="px-2 py-2 font-medium">{f}</th>)}
              </tr></thead>
              <tbody>
                {KEYS.map((j) => {
                  const screen = s.screenOnly.includes(j);
                  return (
                    <tr key={j} className={`border-t border-black/5 ${screen ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-1.5 text-lg font-bold">{j}</td>
                      <td className="px-3 py-1.5">
                        <select aria-label={`${j} 담당 손`} value={screen ? 'screen' : s.assign[j] ?? 1} onChange={(e) => setAssign(j, e.target.value)} className="field !py-1.5 !px-2 !rounded-xl">
                          {s.hands.map((h) => <option key={h.id} value={h.id}>손 {h.id}</option>)}
                          <option value="screen">화면(표현 불가)</option>
                        </select>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-mute min-w-40" title={SIGNS[j]?.note}>
                        {SIGNS[j] ? `${SIGNS[j].dir}${SIGNS[j].back ? ' · 손등' : ''}${SIGNS[j].note ? ` · ${SIGNS[j].note}` : ''}` : '두 손·움직임'}
                      </td>
                      {FINGERS.map((f, k) => (
                        <td key={f} className="px-2 py-1.5">
                          <input type="number" min="0" max="180" aria-label={`${j} ${f} 각도`} value={s.angles[j]?.[k] ?? 90} disabled={screen}
                            onChange={(e) => setAngle(j, k, e.target.value)} className="field !py-1.5 !px-2 !rounded-xl w-16" />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
