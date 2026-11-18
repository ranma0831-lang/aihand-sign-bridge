// 각도표 (이정민 님 각도표_양식.xlsx 기준, 이기태 님이 실제 손으로 채움)
// 데이터는 scripts/import-angles.mjs 가 xlsx에서 만든 angleTable.data.js 에 있다:
//   npm run angles -- 각도표.xlsx   → 커밋·배포하면 팀 전체에 반영
// 서보 기준(양식): 엄지 펴짐 90 / 굽힘 180, 나머지 손가락 펴짐 90 / 굽힘 0, 손목 90 고정
import DATA from './angleTable.data.js';

export const TABLE = DATA.table;       // { 글자: { kind, dir, face, hands: [1,2]|[4]|[], angles: [6], status, checker, note } }
export const KEYS = DATA.order;        // 양식 순서 (자음 14, 모음 17, 숫자 1~10)
export const HAND_LAYOUT = DATA.hands; // [{ id, dir, face, role }]
export const TABLE_INFO = { source: DATA.source, generated: DATA.generated };

export const REST = [90, 90, 90, 90, 90, 90]; // 쉼: 모두 펼침, 손목 정면
export const DIRS = ['위', '옆', '아래'];
export const FACES = ['손바닥', '손등'];

// "1,2" → [1,2], 4 → [4], "없음(화면 안내)"/빈칸 → [] (화면 안내)
export function parseHands(v) {
  return String(v ?? '').split(/[,\s/]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 5);
}

// 표의 행 배열(첫 줄 = 머리줄) → { order, table }. 머리줄 이름으로 열을 찾아서 열 순서가 바뀌어도 된다
export function rowsToTable(rows) {
  const h = rows.findIndex((r) => r.some((c) => String(c).trim() === '글자'));
  if (h < 0) throw new Error("'글자' 머리줄을 찾지 못했습니다");
  const head = rows[h].map((c) => String(c ?? '').trim());
  const col = (name) => head.findIndex((c) => c.startsWith(name));
  const need = ['글자', '맡는 손', '서보1', '서보2', '서보3', '서보4', '서보5', '서보6'];
  const miss = need.filter((n) => col(n) < 0);
  if (miss.length) throw new Error(`열이 없습니다: ${miss.join(', ')}`);
  const get = (r, name) => { const i = col(name); return i < 0 ? '' : String(r[i] ?? '').trim(); };
  const order = [], table = {};
  for (const r of rows.slice(h + 1)) {
    const key = get(r, '글자');
    if (!key) continue;
    const angles = [1, 2, 3, 4, 5, 6].map((n) => {
      const a = Number(get(r, `서보${n}`));
      return Number.isFinite(a) ? Math.max(0, Math.min(180, Math.round(a))) : 90;
    });
    order.push(key);
    const note = get(r, '메모');
    table[key] = {
      kind: get(r, '종류'), dir: get(r, '손 방향'), face: get(r, '앞면'),
      // 메모에 '화면 안내'가 있으면(예: ㅁ ㅍ "AI Hand로 못 냄") 맡는 손이 적혀 있어도 화면으로 보여 준다
      hands: note.includes('화면 안내') ? [] : parseHands(get(r, '맡는 손')), angles,
      status: get(r, '상태'), checker: get(r, '확인한 사람'), note,
    };
  }
  return { order, table };
}

// 손 배치 탭: '1번 | 위 | 손등 | 세우는 법 | 맡는 글자' → [{id, dir, face, role}]
export function rowsToHands(rows) {
  const out = [];
  for (const r of rows) {
    const m = String(r[0] ?? '').match(/^(\d)번/);
    if (m) out.push({ id: Number(m[1]), dir: String(r[1] ?? '').trim(), face: String(r[2] ?? '').trim(), role: String(r[4] ?? '').trim() });
  }
  return out;
}

// 글자마다 맡는 손 고르기. 후보가 둘 이상이면 가장 오래 쉰 손(같으면 번호 작은 손) — 이정민 님 hand_assign.Assigner와 같은 규칙
// 앞 글자가 남아 있는 동안 다음 글자를 다른 손이 보여 줄 수 있다. 후보가 없으면 null(화면 안내)
export function assignHands(seq, table) {
  const usedAt = {};
  let turn = 0;
  return seq.map((s) => {
    const c = table[s.jamo]?.hands || [];
    const hand = c.length ? c.reduce((a, b) => ((usedAt[b] ?? -1) < (usedAt[a] ?? -1) ? b : a)) : null;
    if (hand) usedAt[hand] = turn++;
    return { ...s, hand, angles: table[s.jamo]?.angles };
  });
}

export const isScreen = (table, key) => !(table[key]?.hands?.length);
// 칭찬 동작 = 엄지 척(ㅎ) 각도
export const praiseAngles = (table) => table['ㅎ']?.angles || [90, 0, 0, 0, 0, 90];
