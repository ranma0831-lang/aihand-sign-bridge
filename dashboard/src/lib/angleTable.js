// 각도표 (이정민 님 각도표_양식.xlsx 기준, 이기태 님이 실제 손으로 채움)
// 데이터는 scripts/import-angles.mjs 가 xlsx에서 만든 angleTable.data.js 에 있다:
//   npm run angles -- 각도표.xlsx   → 커밋·배포하면 팀 전체에 반영
// 서보 기준(11/25 이기태 확인본 '손별 기준값'): 엄지 폄 90 / 굽힘 0, 나머지 손가락 폄 140 / 굽힘 0, 손목 90 고정
import DATA from './angleTable.data.js';

export const TABLE = DATA.table;       // { 글자: { kind, dir, face, hands: [1,2]|[4]|[], hint, angles: [6], status, checker, note } }
export const KEYS = DATA.order;        // 양식 순서 (자음 14, 모음 17, 숫자 1~10)
export const HAND_LAYOUT = DATA.hands; // [{ id, dir, face, role }]
export const TABLE_INFO = { source: DATA.source, generated: DATA.generated };

// 각도표 구글 시트: '각도표' 탭을 연 상태의 주소창 주소를 그대로 붙여 넣기 (…/d/<ID>/edit#gid=<탭번호>)
// 비워 두면 코드 안 각도표(angleTable.data.js)를 쓴다. 시트 공유는 '링크가 있는 모든 사용자 - 뷰어'여야 브라우저가 읽을 수 있다
export const SHEET_URL = '';

// 시트 주소 → CSV 내려받기 주소 (gviz는 열마다 형식을 하나로 맞춰 '1,2'나 숫자 글자를 지워서 export를 쓴다)
export function sheetCsvUrl(url) {
  const id = url.match(/\/spreadsheets\/d\/([\w-]+)/)?.[1];
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1] ?? '0';
  return id ? `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${gid}` : null;
}

// CSV 글 → 행 배열 (따옴표 안의 쉼표·줄바꿈·"" 처리)
export function parseCsv(text) {
  const rows = [[]];
  let cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { rows.at(-1).push(cell); cell = ''; }
    else if (ch === '\n') { rows.at(-1).push(cell.replace(/\r$/, '')); cell = ''; rows.push([]); }
    else cell += ch;
  }
  rows.at(-1).push(cell);
  return rows.filter((r) => r.some((c) => c !== ''));
}

// 시트에서 각도표 읽기. 공유가 안 돼 있으면 로그인 페이지가 와서 '글자' 머리줄 오류가 난다
export async function fetchSheetTable(url = SHEET_URL) {
  const csv = sheetCsvUrl(url);
  if (!csv) throw new Error('시트 주소가 아닙니다');
  const res = await fetch(csv, { cache: 'no-store' });
  if (!res.ok) throw new Error(`시트를 못 읽었습니다 (${res.status})`);
  return rowsToTable(parseCsv(await res.text())).table;
}

export const REST = [90, 140, 140, 140, 140, 90]; // 쉼: 모두 폄 (손가락 폄 140, 11/25 기준값), 손목 정면
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
    const who = get(r, '맡는 손');
    const hands = parseHands(who);
    table[key] = {
      kind: get(r, '종류'), dir: get(r, '손 방향'), face: get(r, '앞면'),
      // "1,2 (+화면 안내)": 손이 비슷한 모양을 내고 화면 안내도 같이 (11/25 ㅓ ㅕ ㅔ ㅖ, control word_to_sign.SCREEN_HINT)
      hands, hint: hands.length > 0 && who.includes('화면 안내'), angles,
      status: get(r, '상태'), checker: get(r, '확인한 사람'), note: get(r, '메모'),
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
    return { ...s, hand, hint: !!table[s.jamo]?.hint, angles: table[s.jamo]?.angles };
  });
}

export const isScreen = (table, key) => !(table[key]?.hands?.length);

// 손 모양이 완전히 같은 글자 묶음 (같은 손 + 같은 각도라 손만 보고는 구분 안 됨: ㄹ=ㅌ, ㅂ=4 …). 화면 안내 글자는 뺀다
export function sameShapeGroups(table, keys) {
  const by = {};
  for (const k of keys) {
    const r = table[k];
    if (!r?.hands?.length || r.hint) continue;
    (by[`${r.hands.join(',')}|${r.angles.join(',')}`] ||= []).push(k);
  }
  return Object.values(by).filter((g) => g.length > 1);
}
// 화면 안내 글자(ㅓ)가 손으로 대신 내는 짝 모양(ㅏ)
export const hintPair = (table, keys, k) => keys.find((o) => o !== k && !table[o]?.hint && table[o]?.hands?.join() === table[k].hands.join() && table[o].angles.join() === table[k].angles.join());

// 맞히기(5.4) 문제로 낼 수 있는 글자: 손이 맡고, 화면 안내가 따로 필요 없는 글자
export const quizPool = (table, keys) => keys.filter((k) => table[k]?.hands?.length && !table[k].hint);

// 보기 n개: 정답 + 손가락 각도가 가장 비슷한 글자 둘(ㄹ/ㅌ, ㅂ/4처럼 헷갈리는 짝) + 나머지는 무작위. 순서는 섞는다
export function quizChoices(target, table, pool, n = 4, rand = Math.random) {
  const dist = (k) => table[k].angles.reduce((s, a, i) => s + Math.abs(a - table[target].angles[i]), 0) + (table[k].dir === table[target].dir ? 0 : 60);
  const others = pool.filter((k) => k !== target).map((k) => [k, dist(k) + rand() * 30]).sort((a, b) => a[1] - b[1]).map(([k]) => k);
  const near = others.slice(0, 2);
  const rest = others.slice(2).sort(() => rand() - 0.5).slice(0, n - 1 - near.length);
  return [target, ...near, ...rest].map((k) => [k, rand()]).sort((a, b) => a[1] - b[1]).map(([k]) => k);
}
// 칭찬 동작 = 엄지 척(ㅎ) 각도
export const praiseAngles = (table) => table['ㅎ']?.angles || [90, 0, 0, 0, 0, 90];
