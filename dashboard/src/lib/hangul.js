// 한글 단어 → 지문자 자모 순서 (F-01). web/hangul.js를 ESM으로 옮긴 것.
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
// 받침 겹자음은 두 글자로 나눠서 표현한다 (ㄳ → ㄱ, ㅅ)
const JONG = ['', 'ㄱ','ㄲ','ㄱㅅ','ㄴ','ㄴㅈ','ㄴㅎ','ㄷ','ㄹ','ㄹㄱ','ㄹㅁ','ㄹㅂ','ㄹㅅ','ㄹㅌ','ㄹㅍ','ㄹㅎ','ㅁ','ㅂ','ㅂㅅ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// 단어 → { seq: [{jamo, syllable}], skipped: [한글 음절·숫자가 아닌 글자] }
// 숫자는 한 자리씩 지숫자로, 단 "10"은 지숫자 10 하나 (각도표·인식 모델이 1~10을 씀)
export function toJamo(word) {
  const seq = [], skipped = [];
  const chars = [...word.replace(/\s+/g, '')];
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (ch === '1' && chars[i + 1] === '0') { seq.push({ jamo: '10', syllable: '10' }); i++; continue; }
    if (/[0-9]/.test(ch)) { seq.push({ jamo: ch, syllable: ch }); continue; }
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) { skipped.push(ch); continue; }
    const parts = [CHO[Math.floor(code / 588)], JUNG[Math.floor((code % 588) / 28)], ...JONG[code % 28]];
    for (const jamo of parts) seq.push({ jamo, syllable: ch });
  }
  return { seq, skipped };
}
