import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toJamo } from './hangul.js';
import { summary, byDay, byLetter } from './stats.js';
import { SIGNS, toAngles } from './signs.js';
import { SIGN_KEYS, SCREEN_ONLY } from './hangul.js';

const j = (w) => toJamo(w).seq.map((x) => x.jamo).join('');

test('자모 분해', () => {
  assert.equal(j('사랑'), 'ㅅㅏㄹㅏㅇ');
  assert.equal(j('닭'), 'ㄷㅏㄹㄱ');
  assert.equal(j('값'), 'ㄱㅏㅂㅅ');
  assert.equal(j('개 미'), 'ㄱㅐㅁㅣ');
  assert.deepEqual(toJamo('a가1').skipped, ['a']);
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

test('손 모양표 → 서보 각도', () => {
  assert.deepEqual(toAngles(SIGNS['ㅎ']), [50, 50, 50, 50, 50, 90]); // 엄지 척: 엄지 폄 50, 나머지 굽힘 50
  assert.deepEqual(toAngles(SIGNS['ㅂ']), [130, 130, 130, 130, 130, 90]);
  assert.deepEqual(toAngles(SIGNS['ㅗ']).slice(1, 3), [130, 50]);
  assert.equal(toAngles(SIGNS['ㅗ'])[5], 180); // 손등
  for (const k of SIGN_KEYS) {
    assert.ok(k in SIGNS, k + ' 손 모양 없음');
    assert.equal(SIGNS[k] === null, SCREEN_ONLY.has(k), k + ' 화면 대체 목록 불일치');
  }
});

test('음성 안내 문장', async () => {
  const { startMessage, objParticle } = await import('./speech.js');
  assert.equal(objParticle('사랑'), '을');
  assert.equal(objParticle('나라'), '를');
  assert.equal(startMessage('사랑', [{ jamo: 'ㅅ', hand: 1 }], []), '사랑을 지문자로 보여 드릴게요.');
  assert.equal(startMessage('까치', [{ jamo: 'ㄲ', hand: null }, { jamo: 'ㅏ', hand: 2 }], []),
    '까치를 지문자로 보여 드릴게요. 쌍기역을 손으로 표현할 수 없어서 화면 그림으로 보여 드릴게요.');
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
