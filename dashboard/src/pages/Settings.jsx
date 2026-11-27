// ⑥ 설정: 손 배치(방향·앞면), 각도표(이정민 님 양식 그대로), 속도, 카메라·음성
// 각도표 원본은 xlsx → `npm run angles -- 각도표.xlsx`로 반영. 여기서 고친 값은 이 브라우저에만 남는다 (현장 확인용)
import { PageHead } from '../components/Shell.jsx';
import { Card, CardTitle, Icon, Pill } from '../components/ui.jsx';
import { DIRS, FACES, KEYS, TABLE_INFO, hintPair, sameShapeGroups } from '../lib/angleTable.js';
import { DOUBLE, VOWEL_SPLIT } from '../lib/hangul.js';
import { useSystem } from '../lib/store.jsx';

// AI Hand로 못 내거나 구분이 안 되는 글자. 각도표(s.table)에서 계산해서 각도표가 바뀌면 같이 바뀐다
function LimitsCard({ table }) {
  const screen = KEYS.filter((k) => !table[k]?.hands?.length);
  const hints = KEYS.filter((k) => table[k]?.hint);
  const same = sameShapeGroups(table, KEYS);
  const chip = (t, k) => <span key={k ?? t} className="px-3 py-1 rounded-full bg-black/5 text-sm font-semibold">{t}</span>;
  const rows = [
    { icon: 'running-round-linear', title: '움직임이 있는 글자 → 범위 밖', note: '손은 멈춘 모양만 낼 수 있어요. 쌍자음은 기본 자음 모양만, 겹모음은 두 모음으로 나눠 차례로, 숫자 11 이상은 건너뜁니다.',
      chips: [...Object.entries(DOUBLE).map(([d, b]) => `${d}→${b}`), ...Object.entries(VOWEL_SPLIT).map(([v, p]) => `${v}→${p.join('')}`), '11 이상'] },
    { icon: 'compass-linear', title: '손 방향이 없는 글자 → 짝 모양 + 화면 안내', note: '손끝이 앞을 향하는 방향은 손 배치 4가지에 없어서, 손가락이 같은 글자 모양을 내고 화면에 지문자 그림을 띄워요.',
      chips: hints.map((k) => `${k} (${hintPair(table, KEYS, k) ?? '?'} 모양)`) },
    { icon: 'copy-linear', title: '손 모양이 같은 글자 → 손만 보고는 구분 안 됨', note: '같은 손이 같은 각도로 만들어요. 손가락을 벌리거나 끝마디만 굽힐 수 없어서 생깁니다. 맞히기 화면에서 헷갈리는 보기로 나와요.',
      chips: same.map((g) => g.join(' = ')) },
    { icon: 'gallery-wide-linear', title: '맡을 손이 없는 글자 → 화면 그림만', note: '각도표의 맡는 손이 "없음"인 글자예요.',
      chips: screen.length ? screen : ['없음 (모두 손으로 표현)'] },
  ];
  return (
    <Card className="lg:col-span-12">
      <CardTitle icon="danger-triangle-linear" right={<span className="text-xs text-mute">각도표에서 자동 계산</span>}>AI Hand로 못 내는 글자 · 숫자</CardTitle>
      <div className="grid md:grid-cols-2 gap-4">
        {rows.map((r) => (
          <div key={r.title} className="rounded-3xl bg-white/70 border border-black/5 p-4">
            <p className="font-semibold flex items-center gap-2"><Icon name={r.icon} className="text-lg shrink-0" />{r.title}</p>
            <div className="flex flex-wrap gap-2 my-3">{r.chips.map((t) => chip(t))}</div>
            <p className="text-xs text-mute leading-relaxed">{r.note}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

const SERVOS = ['서보1 엄지', '서보2 검지', '서보3 중지', '서보4 약지', '서보5 새끼', '서보6 손목'];
const handsLabel = (hs) => (!hs.length ? 'screen' : hs.join(','));

export default function Settings() {
  const { settings: s, tableFrom, updateSettings, resetSettings, toast } = useSystem();
  const from = {
    code: `${TABLE_INFO.source || '기본값'} (${TABLE_INFO.generated})`,
    loading: '구글 시트 읽는 중…',
    sheet: `구글 시트 (${tableFrom.at}에 불러옴, 새로고침하면 다시 읽음)`,
    error: `구글 시트를 못 읽어 ${TABLE_INFO.source} 사용 중: ${tableFrom.msg}`,
  }[tableFrom.kind];
  const confirmed = KEYS.filter((k) => s.table[k]?.status === '확인됨').length;

  const setHandCfg = (id, patch) => updateSettings((p) => ({ hands: p.hands.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
  const setRow = (k, patch) => updateSettings((p) => ({ table: { ...p.table, [k]: { ...p.table[k], ...patch } } }));
  const setAngle = (k, i, v) => setRow(k, { angles: s.table[k].angles.map((a, j) => (j === i ? Math.max(0, Math.min(180, Number(v) || 0)) : a)) });
  // 맡는 손 선택지: 각도표에 나온 조합(예: "1,2") + 손 1~5 + 화면 안내
  const handOptions = [...new Set([...KEYS.map((k) => handsLabel(s.table[k]?.hands || [])).filter((v) => v.includes(',')), '1', '2', '3', '4', '5'])];

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
      if (!data.table || !data.hands) throw new Error();
      updateSettings(data);
      toast('설정 파일을 불러왔습니다', 'ok');
    } catch { toast('설정 파일 형식이 맞지 않습니다', 'error'); }
    e.target.value = '';
  }

  return (
    <>
      <PageHead title="설정" sub="손 배치와 각도표(이정민 님 양식)를 확인하고, 현장에서 각도를 잠깐 고쳐 볼 수 있습니다."
        right={
          <div className="flex flex-wrap gap-2">
            <label className="btn btn-light cursor-pointer"><Icon name="upload-linear" />불러오기<input type="file" accept="application/json" onChange={importJson} className="sr-only" /></label>
            <button onClick={exportJson} className="btn btn-dark"><Icon name="download-linear" />JSON 내보내기</button>
          </div>
        } />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-7">
          <CardTitle icon="hand-stars-linear">손 배치 (받침대 방향 · 앞면)</CardTitle>
          <div className="grid gap-2">
            {s.hands.map((h) => (
              <div key={h.id} className="flex flex-wrap items-center gap-2">
                <span className="w-12 font-semibold">손 {h.id}</span>
                <select aria-label={`손 ${h.id} 방향`} value={h.dir} onChange={(e) => setHandCfg(h.id, { dir: e.target.value })} className="field !py-2 flex-1 min-w-20">
                  {DIRS.map((d) => <option key={d}>{d}</option>)}
                </select>
                <select aria-label={`손 ${h.id} 앞면`} value={h.face} onChange={(e) => setHandCfg(h.id, { face: e.target.value })} className="field !py-2 flex-1 min-w-20">
                  {FACES.map((d) => <option key={d}>{d}</option>)}
                </select>
                <span className="text-xs text-mute basis-full sm:basis-auto sm:flex-[2] min-w-0 truncate" title={h.role}>{h.role}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-mute mt-3">손목은 반 바퀴만 돌아서, 손등이 보이는 글자는 손을 받침대에 뒤돌려 세웁니다 (11/16 확인).</p>
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
          <label className="grid gap-1 text-sm">
            <span className="flex justify-between"><span>그림 팝업 글자 보여 주는 시간</span><b className="num">{(s.popupMs / 1000).toFixed(1)}초</b></span>
            <input type="range" min="1500" max="8000" step="500" value={s.popupMs} onChange={(e) => updateSettings({ popupMs: +e.target.value })} className="accent-ink" />
            <span className="text-xs text-mute">손으로 못 내는 글자(ㅓ ㅕ ㅔ ㅖ 등)는 이 시간 동안 그림을 띄우고 다음 글자로 넘어가요</span>
          </label>
          {[['camera', '학습 모드 카메라 사용'], ['voice', '음성 입력·음성 안내 사용']].map(([k, label]) => (
            <label key={k} className="flex items-center justify-between text-sm">
              {label}
              <input type="checkbox" checked={s[k]} onChange={(e) => updateSettings({ [k]: e.target.checked })} className="w-5 h-5 accent-ink" />
            </label>
          ))}
          <button onClick={resetSettings} className="btn btn-light text-sm mt-auto">각도표 기본값으로 되돌리기</button>
        </Card>

        <LimitsCard table={s.table} />

        <Card className="lg:col-span-12 !p-0 overflow-hidden">
          <div className="px-6 pt-5">
            <CardTitle icon="list-linear" right={<Pill tone={confirmed === KEYS.length ? 'ok' : 'idle'}>확인됨 {confirmed}/{KEYS.length}</Pill>}>
              각도표 <span className={`text-sm font-normal ${tableFrom.kind === 'error' ? 'text-red-600' : 'text-mute'}`}>· {from}</span>
            </CardTitle>
            <p className="text-xs text-mute -mt-2 mb-3">서보 기준(11/25): 엄지 폄 90 / 굽힘 0, 나머지 손가락 폄 140 / 굽힘 0, 손목 90 고정. 못 내는 글자는 위 카드에 정리.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm num">
              <thead className="text-mute text-left"><tr>
                <th className="px-6 py-2 font-medium">글자</th><th className="px-3 py-2 font-medium whitespace-nowrap">방향·앞면</th><th className="px-3 py-2 font-medium whitespace-nowrap">맡는 손</th>
                {SERVOS.map((f) => <th key={f} className="px-2 py-2 font-medium whitespace-nowrap">{f}</th>)}
                <th className="px-3 py-2 font-medium">상태</th><th className="px-3 py-2 font-medium">메모</th>
              </tr></thead>
              <tbody>
                {KEYS.map((k) => {
                  const r = s.table[k];
                  if (!r) return null;
                  const screen = !r.hands.length;
                  return (
                    <tr key={k} className={`border-t border-black/5 ${screen ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-1.5 text-lg font-bold">{k}</td>
                      <td className="px-3 py-1.5 text-xs whitespace-nowrap">{r.dir}·{r.face}</td>
                      <td className="px-3 py-1.5">
                        <select aria-label={`${k} 맡는 손`} value={handsLabel(r.hands)} onChange={(e) => setRow(k, { hands: e.target.value === 'screen' ? [] : e.target.value.split(',').map(Number) })} className="field !py-1.5 !px-2 !rounded-xl">
                          {handOptions.map((v) => <option key={v} value={v}>{v.includes(',') ? `손 ${v} 번갈아` : `손 ${v}`}</option>)}
                          <option value="screen">화면 안내</option>
                        </select>
                      </td>
                      {SERVOS.map((f, i) => (
                        <td key={f} className="px-2 py-1.5">
                          <input type="number" min="0" max="180" aria-label={`${k} ${f} 각도`} value={r.angles[i]} disabled={screen}
                            onChange={(e) => setAngle(k, i, e.target.value)} className="field !py-1.5 !px-2 !rounded-xl w-16" />
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-xs whitespace-nowrap">{r.status === '확인됨' ? <Pill tone="ok">확인됨</Pill> : r.status || '초안'}{r.checker && ` · ${r.checker}`}</td>
                      <td className="px-3 py-1.5 text-xs text-mute min-w-48">{r.note}</td>
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
