// 지문자·지숫자 손 모양표 (교재 "지문자", "지숫자" 사진을 보고 손가락 상태를 읽은 것)
// fingers: [엄지, 검지, 중지, 약지, 소지]  1 = 폄, 0 = 굽힘, 0.5 = 반쯤
// dir: 손을 세운 방향 — 세움(손가락 위) / 옆(손가락 옆) / 아래(손가락 아래)
// back: true면 손등이 보이게 (손목 서보로 돌림)
// null = 두 손이나 움직임이 필요해서 AI Hand 한 대로는 어려움 → 화면 그림으로 대체
// shortcut: 사진만 보고 읽은 값이라 실제 손으로 하나씩 확인하며 설정 화면에서 고칠 것 (역할 2 각도표 3.1)
export const SIGNS = {
  // 자음
  'ㄱ': { fingers: [1, 1, 0, 0, 0], dir: '아래', note: '검지 아래, 엄지 옆' },
  'ㄴ': { fingers: [1, 1, 0, 0, 0], dir: '옆', note: '엄지 위, 검지 옆 (ㄱ과 방향만 다름)' },
  'ㄷ': { fingers: [0, 1, 1, 0, 0], dir: '옆' },
  'ㄹ': { fingers: [0, 1, 1, 1, 0], dir: '옆' },
  'ㅁ': null, // 손가락을 갈고리처럼 구부림
  'ㅂ': { fingers: [0, 1, 1, 1, 1], dir: '세움', note: '엄지는 손바닥 쪽으로 접음' },
  'ㅅ': { fingers: [0, 1, 1, 0, 0], dir: '아래' },
  'ㅇ': { fingers: [0.5, 0.5, 1, 1, 1], dir: '세움', note: '엄지·검지로 동그라미' },
  'ㅈ': { fingers: [1, 1, 1, 0, 0], dir: '아래', note: 'ㅅ + 엄지' },
  'ㅊ': { fingers: [1, 1, 1, 1, 0], dir: '아래' },
  'ㅋ': { fingers: [1, 1, 1, 0, 0], dir: '아래', back: true, note: 'ㄱ + 중지. ㅈ과 손가락이 같아 손등 방향으로 구분' },
  'ㅌ': { fingers: [1, 1, 1, 1, 0], dir: '옆', note: 'ㄹ + 엄지' },
  'ㅍ': null, // 손가락을 앞으로 구부림
  'ㅎ': { fingers: [1, 0, 0, 0, 0], dir: '세움', note: '엄지 척' },
  // 모음
  'ㅏ': { fingers: [0, 1, 0, 0, 0], dir: '세움' },
  'ㅑ': { fingers: [0, 1, 1, 0, 0], dir: '세움' },
  'ㅓ': { fingers: [1, 0, 0, 0, 0], dir: '옆', note: '주먹에서 엄지만 옆으로' },
  'ㅕ': { fingers: [1, 1, 0, 0, 0], dir: '옆', back: true },
  'ㅗ': { fingers: [0, 1, 0, 0, 0], dir: '세움', back: true },
  'ㅛ': { fingers: [0, 1, 1, 0, 0], dir: '세움', back: true },
  'ㅜ': { fingers: [0, 1, 0, 0, 0], dir: '아래', back: true },
  'ㅠ': { fingers: [0, 1, 1, 0, 0], dir: '아래', back: true },
  'ㅡ': { fingers: [0, 1, 0, 0, 0], dir: '옆' },
  'ㅣ': { fingers: [0, 0, 0, 0, 1], dir: '세움', note: '새끼손가락만' },
  'ㅐ': { fingers: [0, 1, 0, 0, 1], dir: '세움', note: 'ㅏ + ㅣ' },
  'ㅒ': { fingers: [0, 1, 1, 0, 1], dir: '세움', note: 'ㅑ + ㅣ' },
  'ㅔ': { fingers: [1, 0, 0, 0, 1], dir: '옆', note: 'ㅓ + ㅣ' },
  'ㅖ': { fingers: [1, 1, 0, 0, 1], dir: '옆', back: true, note: 'ㅕ + ㅣ' },
  'ㅚ': { fingers: [0, 1, 0, 0, 1], dir: '세움', back: true, note: 'ㅗ + ㅣ' },
  'ㅟ': { fingers: [0, 1, 0, 0, 1], dir: '아래', back: true, note: 'ㅜ + ㅣ' },
  'ㅢ': { fingers: [0, 1, 0, 0, 1], dir: '옆', note: 'ㅡ + ㅣ' },
  'ㅘ': null, 'ㅙ': null, 'ㅝ': null, 'ㅞ': null, // 두 모음을 이어서 움직임
  'ㄲ': null, 'ㄸ': null, 'ㅃ': null, 'ㅆ': null, 'ㅉ': null, // 옆으로 미는 움직임 / 두 손
  // 지숫자 (10 이상은 움직임이 있어 화면으로)
  '0': null,
  '1': { fingers: [0, 1, 0, 0, 0], dir: '세움' },
  '2': { fingers: [0, 1, 1, 0, 0], dir: '세움' },
  '3': { fingers: [0, 1, 1, 1, 0], dir: '세움' },
  '4': { fingers: [0, 1, 1, 1, 1], dir: '세움' },
  '5': { fingers: [1, 0, 0, 0, 0], dir: '옆' },
  '6': { fingers: [1, 1, 0, 0, 0], dir: '옆' },
  '7': { fingers: [1, 1, 1, 0, 0], dir: '옆' },
  '8': { fingers: [1, 1, 1, 1, 0], dir: '옆' },
  '9': { fingers: [1, 1, 1, 1, 1], dir: '옆' },
  // 동작용 (글자 아님)
  '칭찬': { fingers: [1, 0, 0, 0, 0], dir: '세움', note: '엄지 척' },
  '쉼': { fingers: [0.5, 0.5, 0.5, 0.5, 0.5], dir: '세움', note: '단어가 끝나면 돌아가는 자세' },
};

// AiHand 서보 규칙 (5.1 예제): 엄지는 굽힘 130° / 폄 50°, 나머지는 굽힘 50° / 폄 130°. 반쯤 = 90°
// 손목(서보 6): 손바닥 90°, 손등 180° — shortcut: 임시값, 실제 손으로 확인
export const WRIST = { palm: 90, back: 180 };
export function toAngles(sign) {
  if (!sign) return [90, 90, 90, 90, 90, WRIST.palm];
  const [t, ...rest] = sign.fingers;
  return [
    Math.round(130 - t * 80),
    ...rest.map((f) => Math.round(50 + f * 80)),
    sign.back ? WRIST.back : WRIST.palm,
  ];
}

// 손 방향별 담당 손 (설정 기본값): 세움 → 손 1(자음·숫자)·손 2(모음), 옆 → 손 3, 아래 → 손 5
export function defaultHand(key, sign, isVowel) {
  if (!sign) return null;
  if (sign.dir === '옆') return /[0-9]/.test(key) ? 4 : 3;
  if (sign.dir === '아래') return 5;
  return isVowel ? 2 : 1;
}
