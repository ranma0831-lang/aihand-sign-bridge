// 한글 단어 → 지문자 자모 순서 (F-01). 브라우저와 node 둘 다에서 쓴다.
(function (root) {
  const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
  const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  // 받침 겹자음은 두 글자로 나눠서 표현한다 (ㄳ → ㄱ, ㅅ)
  const JONG = ['', 'ㄱ','ㄲ','ㄱㅅ','ㄴ','ㄴㅈ','ㄴㅎ','ㄷ','ㄹ','ㄹㄱ','ㄹㅁ','ㄹㅂ','ㄹㅅ','ㄹㅌ','ㄹㅍ','ㄹㅎ','ㅁ','ㅂ','ㅂㅅ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  // 요구사항 8번 제약: AI Hand가 못 내는 글자 → 화면 그림으로 대신 표시
  // shortcut: 역할 2 각도표(3.1) 나오면 실제로 되는 글자로 바꿀 것
  const SCREEN_ONLY = new Set(['ㅁ','ㅍ','ㄲ','ㄸ','ㅃ','ㅆ','ㅉ','ㅐ','ㅒ','ㅔ','ㅖ','ㅘ','ㅙ','ㅚ','ㅝ','ㅞ','ㅟ','ㅢ']);

  // 단어 → [{jamo, syllable, robot}] ; 한글 음절이 아닌 글자는 skipped에 모은다
  function toJamo(word) {
    const out = [], skipped = [];
    for (const ch of word.replace(/\s+/g, '')) {
      const code = ch.charCodeAt(0) - 0xAC00;
      if (code < 0 || code > 11171) { skipped.push(ch); continue; }
      const parts = [CHO[Math.floor(code / 588)], JUNG[Math.floor((code % 588) / 28)], ...JONG[code % 28]];
      for (const j of parts) out.push({ jamo: j, syllable: ch, robot: !SCREEN_ONLY.has(j) });
    }
    return { seq: out, skipped };
  }

  const BASIC = [...'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ', ...'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ', 'ㅐ', 'ㅔ', 'ㅚ', 'ㅟ', 'ㅢ'];
  const api = { toJamo, BASIC, SCREEN_ONLY };
  if (typeof module !== 'undefined') module.exports = api; else root.Hangul = api;
})(this);
