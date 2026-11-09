// 한글 단어 → 지문자 자모 순서 (F-01). web/hangul.js를 ESM으로 옮긴 것.
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
// 받침 겹자음은 두 글자로 나눠서 표현한다 (ㄳ → ㄱ, ㅅ)
const JONG = ['', 'ㄱ','ㄲ','ㄱㅅ','ㄴ','ㄴㅈ','ㄴㅎ','ㄷ','ㄹ','ㄹㄱ','ㄹㅁ','ㄹㅂ','ㄹㅅ','ㄹㅌ','ㄹㅍ','ㄹㅎ','ㅁ','ㅂ','ㅂㅅ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

export const VOWELS = new Set(JUNG);
export const CONSONANTS = [...'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'];
export const BASIC = [...CONSONANTS, ...'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ', 'ㅐ', 'ㅔ', 'ㅚ', 'ㅟ', 'ㅢ'];
export const JAMO_ALL = [...CONSONANTS, ...'ㄲㄸㅃㅆㅉ', ...JUNG];
export const NUMBERS = [...'0123456789'];
export const SIGN_KEYS = [...JAMO_ALL, ...NUMBERS];

// AI Hand 한 대로 어려운 글자(두 손·움직임). 기본값은 signs.js의 null 항목과 같고, 설정 화면에서 바꿀 수 있다.
export const SCREEN_ONLY = new Set(['ㅁ','ㅍ','ㄲ','ㄸ','ㅃ','ㅆ','ㅉ','ㅘ','ㅙ','ㅝ','ㅞ','0']);

// 단어 → { seq: [{jamo, syllable}], skipped: [한글 음절·숫자가 아닌 글자] }. 숫자는 한 자리씩 지숫자로
export function toJamo(word) {
  const seq = [], skipped = [];
  for (const ch of word.replace(/\s+/g, '')) {
    if (/[0-9]/.test(ch)) { seq.push({ jamo: ch, syllable: ch }); continue; }
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) { skipped.push(ch); continue; }
    const parts = [CHO[Math.floor(code / 588)], JUNG[Math.floor((code % 588) / 28)], ...JONG[code % 28]];
    for (const jamo of parts) seq.push({ jamo, syllable: ch });
  }
  return { seq, skipped };
}
