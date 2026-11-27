import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toJamo } from './hangul.js';
import { summary, byDay, byLetter } from './stats.js';
import { assignHands, rowsToTable, rowsToHands, TABLE, KEYS } from './angleTable.js';

const j = (w) => toJamo(w).seq.map((x) => x.jamo).join('');

test('자모 분해', () => {
  assert.equal(j('사랑'), 'ㅅㅏㄹㅏㅇ');
  assert.equal(j('닭'), 'ㄷㅏㄹㄱ');
  assert.equal(j('값'), 'ㄱㅏㅂㅅ');
  assert.equal(j('개 미'), 'ㄱㅐㅁㅣ');
  assert.deepEqual(toJamo('a가1').skipped, ['a']);
  // 이정민 님 word_to_sign.py와 같은 규칙
  assert.deepEqual(toJamo('까치').seq.map((x) => x.jamo), ['ㄱ', 'ㅏ', 'ㅊ', 'ㅣ']);
  assert.deepEqual(toJamo('까치').seq[0], { jamo: 'ㄱ', syllable: '까', source: 'ㄲ', moving: true });
  assert.deepEqual(toJamo('과자').seq.map((x) => x.jamo), ['ㄱ', 'ㅗ', 'ㅏ', 'ㅈ', 'ㅏ']);
  assert.deepEqual(toJamo('있다').seq.map((x) => x.jamo), ['ㅇ', 'ㅣ', 'ㅅ', 'ㄷ', 'ㅏ']); // 받침 ㅆ → ㅅ(움직임)
  assert.deepEqual(toJamo('3층10').seq.map((x) => x.jamo), ['3', 'ㅊ', 'ㅡ', 'ㅇ', '10']);
  assert.deepEqual(toJamo('12 07').skipped, ['12', '07']); // 11 이상·앞자리 0은 범위 밖
  assert.equal(j('3층'), '3ㅊㅡㅇ');
});

test('통계', () => {
  const now = new Date('2026-11-09T12:00:00').getTime();
  const log = [
    { t: now, kind: '학습', text: 'ㄱ', ms: 400, ok: true, attempt: 1 },
    { t: now, kind: '학습', text: 'ㄱ', ms: 600, ok: false, attempt: 2 },
    { t: now, kind: '학습', text: 'ㄴ', ms: 500, ok: false, attempt: 1 },
    { t: now - 86400000, kind: '표현', text: '사랑', ms: 7000, ok: true, voice: true, edited: false },
    { t: now, kind: '표현', text: '나라', ms: 5000, ok: true, voice: true, edited: true },
    { t: now, kind: '테스트', text: '손 3', ms: 900, ok: false },
    { t: now - 8 * 86400000, kind: '표현', text: '옛날', ms: 1, ok: true },
  ];
  const s = summary(log);
  assert.equal(s.recogRate, 33);
  assert.equal(s.feedbackMs, 500);
  assert.equal(s.learnSuccess, 50);
  assert.equal(s.voiceAcc, 50);
  assert.equal(s.errors, 1);
  assert.equal(s.expressCount, 3);
  const d = byDay(log, 7, now);
  assert.equal(d.length, 7);
  assert.equal(d[6].count, 4); // 오늘: 학습 3 + 표현 1 (테스트 제외)
  assert.equal(d[5].count, 1);
  assert.deepEqual(byLetter(log, ['ㄱ', 'ㄴ']).map((e) => e.rate), [50, 0]);
});

test('각도표: 양식 행 → 표', () => {
  // 열 순서를 일부러 바꾼 양식 (머리줄 이름으로 찾는지)
  const rows = [
    ['각도표 번호', '맡는 손', '글자', '손 방향(받침대)', '앞면', '서보1 엄지', '서보2 검지', '서보3 중지', '서보4 약지', '서보5 새끼', '서보6 손목', '상태', '확인한 사람', '메모'],
    [1, '4', 'ㄱ', '아래', '손바닥', 90, 90, 0, 0, 0, 90, '확인됨', '이기태', ''],
    [5, '1,2', 'ㅁ', '위', '손등', 0, 80, 80, 0, 0, 90, '확인됨', '', 'AI Hand로 못 냄(화면 안내) / 11/25: 손으로 가능'],
    [16, '1,2 (+화면 안내)', 'ㅔ', '위', '손등', 0, 140, 0, 0, 140, 90, '확인됨', '', ''],
    [14, '1,2', 'ㅎ', '위', '손등', 90, 0, 0, 0, 0, 90, '초안', '', ''],
    [17, '없음(화면 안내)', 'ㅓ', '옆', '손등', 135, 45, 0, 0, 0, 90, '초안', '', ''],
    [41, '1,2', 10, '위', '손등', 90, 45, 90, 90, 999, 90, '초안', '', ''],
  ];
  const { order, table } = rowsToTable(rows);
  assert.deepEqual(order, ['ㄱ', 'ㅁ', 'ㅔ', 'ㅎ', 'ㅓ', '10']);
  assert.deepEqual(table['ㄱ'], { kind: '', dir: '아래', face: '손바닥', hands: [4], hint: false, angles: [90, 90, 0, 0, 0, 90], status: '확인됨', checker: '이기태', note: '' });
  assert.deepEqual(table['ㅁ'].hands, [1, 2]); // 메모가 아니라 '맡는 손' 칸으로 정함 (11/25)
  assert.deepEqual([table['ㅔ'].hands, table['ㅔ'].hint], [[1, 2], true]); // 손 + 화면 안내
  assert.deepEqual(table['ㅓ'].hands, []);
  assert.deepEqual(table['ㅎ'].hands, [1, 2]);
  assert.equal(table['10'].angles[4], 180); // 0~180으로 자름
  assert.throws(() => rowsToTable([['번호', '글자']]), /열이 없습니다/);
  assert.deepEqual(rowsToHands([['손 번호'], ['1번', '위', '손등', '세움', 'ㅁ ㅂ']]), [{ id: 1, dir: '위', face: '손등', role: 'ㅁ ㅂ' }]);
});

test('맡는 손 번갈아 고르기', () => {
  const t = { 'ㅎ': { hands: [1, 2], angles: [1] }, 'ㅏ': { hands: [1, 2], angles: [2] }, 'ㄴ': { hands: [3], angles: [3] }, 'ㅓ': { hands: [], angles: [4] } };
  const hands = (w) => assignHands([...w].map((jamo) => ({ jamo })), t).map((p) => p.hand);
  assert.deepEqual(hands('ㅎㅏㄴㅏ'), [1, 2, 3, 1]); // 하나: ㅎ손1 ㅏ손2 ㄴ손3 ㅏ손1
  assert.deepEqual(hands('ㅏㅏㅏ'), [1, 2, 1]);
  assert.deepEqual(hands('ㅎㄴㅏ'), [1, 3, 2]); // 가장 오래 쉰 손 (hand_assign.Assigner)
  assert.deepEqual(hands('ㅓ'), [null]); // 화면 안내
  assert.deepEqual(hands('ㄲ'), [null]); // 표에 없는 글자(쌍자음)
  assert.equal(assignHands([{ jamo: 'ㄴ' }], t)[0].angles[0], 3);
});

test('배포된 각도표 기본값', () => {
  assert.equal(KEYS.length, 41);
  for (const k of KEYS) assert.equal(TABLE[k].angles.length, 6, k);
  assert.deepEqual(toJamo('10층').seq.map((x) => x.jamo), ['10', 'ㅊ', 'ㅡ', 'ㅇ']);
  assert.deepEqual(toJamo('110').skipped, ['110']);
});

test('음성 안내 문장', async () => {
  const { startMessage, objParticle } = await import('./speech.js');
  assert.equal(objParticle('사랑'), '을');
  assert.equal(objParticle('나라'), '를');
  assert.equal(startMessage('사랑', [{ jamo: 'ㅅ', hand: 1 }], []), '사랑을 지문자로 보여 드릴게요.');
  assert.equal(startMessage('미', [{ jamo: 'ㅁ', hand: null }, { jamo: 'ㅣ', hand: 2 }], []),
    '미를 지문자로 보여 드릴게요. 미음을 손으로 표현할 수 없어서 화면 그림으로 보여 드릴게요.');
  assert.equal(startMessage('까', [{ jamo: 'ㄱ', hand: 4, source: 'ㄲ', moving: true }, { jamo: 'ㅏ', hand: 1 }], []),
    '까를 지문자로 보여 드릴게요. 쌍기역을 기본 모양으로 보여 드려요. 실제로는 옆으로 움직여야 해요.');
  assert.match(startMessage('a', [], ['a']), /다시 말씀해/);
  assert.match(startMessage('가a', [{ jamo: 'ㄱ', hand: 1 }], ['a']), /건너뛸게요/);
});

test('학습 음성 피드백과 순위', async () => {
  const { resultLine, demoLine } = await import('./speech.js');
  const { rankBoard } = await import('./stats.js');
  assert.equal(resultLine(true, 'ㄱ', 'ㄱ'), '정답이에요. 잘했어요!');
  assert.equal(resultLine(false, 'ㄱ', 'ㄴ'), '니은으로 보였어요. 기역을 다시 보여 드릴게요.');
  assert.equal(resultLine(false, 'ㅏ', 'ㅓ'), '어로 보였어요. 아를 다시 보여 드릴게요.');
  assert.equal(resultLine(false, 'ㄱ', 'ㄹ'), '리을로 보였어요. 기역을 다시 보여 드릴게요.');
  assert.equal(resultLine(false, 'ㄱ', ''), '손 모양을 알아보지 못했어요. 기역을 다시 보여 드릴게요.'); // 중앙 프로그램 시간 초과
  assert.match(demoLine('ㅁ', null), /화면 그림/);
  const r = rankBoard([{ name: 'a', score: 3, ms: 9 }, { name: 'b', score: 4, ms: 20 }, { name: 'c', score: 4, ms: 10 }]);
  assert.deepEqual(r.map((x) => x.name), ['c', 'b', 'a']);
});

test('실제 카메라 고르기', async () => {
  const { pickCamera, cameraError } = await import('./camera.js');
  const cams = [{ deviceId: 'v', label: 'Mirametrix Virtual Camera' }, { deviceId: 'lg', label: 'LG Camera' }];
  assert.equal(pickCamera(cams, '').deviceId, 'lg'); // 가상 카메라 건너뜀
  assert.equal(pickCamera(cams, 'v').deviceId, 'v'); // 사용자가 고른 건 존중
  assert.equal(pickCamera([{ deviceId: 'v', label: 'OBS Virtual Camera' }], '').deviceId, 'v'); // 가상밖에 없으면 그거라도
  assert.match(cameraError({ name: 'NotReadableError' }), /Zoom/);
});

// 구글 시트 각도표: 주소 → CSV 주소, CSV → 각도표 (코드 안 각도표를 CSV로 바꿨다 되읽어 같은지)
test('시트 각도표 읽기', async () => {
  const { sheetCsvUrl, parseCsv, rowsToTable, TABLE, KEYS } = await import('./angleTable.js');
  assert.equal(sheetCsvUrl('https://docs.google.com/spreadsheets/d/AbC_1-x/edit#gid=123'),
    'https://docs.google.com/spreadsheets/d/AbC_1-x/export?format=csv&gid=123');
  assert.equal(sheetCsvUrl('https://docs.google.com/spreadsheets/d/AbC/edit'), 'https://docs.google.com/spreadsheets/d/AbC/export?format=csv&gid=0');
  assert.equal(sheetCsvUrl('https://example.com'), null);
  assert.deepEqual(parseCsv('a,"1,2","x ""y""\nz"\r\n,,\r\nb,c'), [['a', '1,2', 'x "y"\nz'], ['b', 'c']]);
  const q = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const head = ['종류', '글자', '손 방향', '앞면', '맡는 손', '서보1', '서보2', '서보3', '서보4', '서보5', '서보6', '상태', '확인한 사람', '메모'];
  const lines = ['각도표 제목줄,,', head.join(','), ...KEYS.map((k) => {
    const r = TABLE[k];
    return [r.kind, k, r.dir, r.face, r.hands.length ? r.hands.join(',') + (r.hint ? ' (+화면 안내)' : '') : '없음(화면 안내)', ...r.angles, r.status, r.checker, r.note].map(q).join(',');
  })];
  const { order, table } = rowsToTable(parseCsv(lines.join('\r\n')));
  assert.deepEqual(order, KEYS);
  assert.deepEqual(table, TABLE);
});
