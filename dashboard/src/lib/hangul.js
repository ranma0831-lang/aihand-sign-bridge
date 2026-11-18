// 단어 → 지문자 순서 (F-01). 이정민 님 control/word_to_sign.py 규칙과 같게 맞춤 (11/18)
// - 받침은 같은 자음 모양, 겹받침은 두 자음으로 (ㄳ → ㄱ ㅅ)
// - 쌍자음 ㄲㄸㅃㅆㅉ은 기본 자음 모양 + "움직임" 표시 (ㄲ → ㄱ)
// - 겹모음 ㅘ ㅙ ㅝ ㅞ은 두 모음으로 (ㅘ → ㅗ ㅏ)
// - 숫자는 붙은 자리끼리 묶어 1~10만 (11 이상은 움직임 동작이라 건너뜀)
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['', 'ㄱ','ㄲ','ㄱㅅ','ㄴ','ㄴㅈ','ㄴㅎ','ㄷ','ㄹ','ㄹㄱ','ㄹㅁ','ㄹㅂ','ㄹㅅ','ㄹㅌ','ㄹㅍ','ㄹㅎ','ㅁ','ㅂ','ㅂㅅ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const DOUBLE = { 'ㄲ': 'ㄱ', 'ㄸ': 'ㄷ', 'ㅃ': 'ㅂ', 'ㅆ': 'ㅅ', 'ㅉ': 'ㅈ' };
const VOWEL_SPLIT = { 'ㅘ': ['ㅗ', 'ㅏ'], 'ㅙ': ['ㅗ', 'ㅐ'], 'ㅝ': ['ㅜ', 'ㅓ'], 'ㅞ': ['ㅜ', 'ㅔ'] };

const consonant = (c, syllable) => (DOUBLE[c] ? { jamo: DOUBLE[c], syllable, source: c, moving: true } : { jamo: c, syllable });

// 단어 → { seq: [{jamo, syllable, source?, moving?}], skipped: [건너뛴 글자] }
export function toJamo(word) {
  const seq = [], skipped = [];
  const chars = [...word]; // 띄어쓰기는 건너뛰지만 숫자를 끊는 구분은 된다 ("12 7" → 12, 7)
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/\s/.test(ch)) continue;
    if (/\d/.test(ch)) {
      let num = ch;
      while (/\d/.test(chars[i + 1] ?? '')) num += chars[++i];
      if (Number(num) >= 1 && Number(num) <= 10 && String(Number(num)) === num) seq.push({ jamo: num, syllable: num });
      else skipped.push(num);
      continue;
    }
    // 자모만 따로 입력한 경우: 자음·쌍자음·기본 모음만 (ㅘ처럼 겹모음 하나만 쓴 건 범위 밖, word_to_sign.py와 같음)
    if (CHO.includes(ch)) { seq.push(consonant(ch, ch)); continue; }
    if (JUNG.includes(ch) && !VOWEL_SPLIT[ch]) { seq.push({ jamo: ch, syllable: ch }); continue; }
    if (VOWEL_SPLIT[ch]) { skipped.push(ch); continue; }
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) { skipped.push(ch); continue; }
    const v = JUNG[Math.floor((code % 588) / 28)];
    seq.push(consonant(CHO[Math.floor(code / 588)], ch));
    for (const part of VOWEL_SPLIT[v] || [v]) seq.push({ jamo: part, syllable: ch, ...(VOWEL_SPLIT[v] && { source: v }) });
    for (const part of JONG[code % 28]) seq.push(consonant(part, ch));
  }
  return { seq, skipped };
}
