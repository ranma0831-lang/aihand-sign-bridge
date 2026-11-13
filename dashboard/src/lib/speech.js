// 음성 안내: 크롬 내장 음성 합성(speechSynthesis)으로 한국어를 읽어 준다
const NAMES = {
  'ㄱ': '기역', 'ㄴ': '니은', 'ㄷ': '디귿', 'ㄹ': '리을', 'ㅁ': '미음', 'ㅂ': '비읍', 'ㅅ': '시옷', 'ㅇ': '이응',
  'ㅈ': '지읒', 'ㅊ': '치읓', 'ㅋ': '키읔', 'ㅌ': '티읕', 'ㅍ': '피읖', 'ㅎ': '히읗',
  'ㄲ': '쌍기역', 'ㄸ': '쌍디귿', 'ㅃ': '쌍비읍', 'ㅆ': '쌍시옷', 'ㅉ': '쌍지읒',
  'ㅏ': '아', 'ㅐ': '애', 'ㅑ': '야', 'ㅒ': '얘', 'ㅓ': '어', 'ㅔ': '에', 'ㅕ': '여', 'ㅖ': '예', 'ㅗ': '오', 'ㅘ': '와',
  'ㅙ': '왜', 'ㅚ': '외', 'ㅛ': '요', 'ㅜ': '우', 'ㅝ': '워', 'ㅞ': '웨', 'ㅟ': '위', 'ㅠ': '유', 'ㅡ': '으', 'ㅢ': '의', 'ㅣ': '이',
  '0': '영', '1': '일', '2': '이', '3': '삼', '4': '사', '5': '오', '6': '육', '7': '칠', '8': '팔', '9': '구',
};
export const jamoName = (j) => NAMES[j] || j;

// 받침 있으면 '을', 없으면 '를' (숫자·기타는 '를')
export function objParticle(word) {
  const code = word.charCodeAt(word.length - 1) - 0xAC00;
  return code >= 0 && code <= 11171 && code % 28 ? '을' : '를';
}

// 표현 시작 안내 문장. plan: [{jamo, hand}], skipped: 건너뛴 글자
export function startMessage(word, plan, skipped) {
  if (!plan.length) return '알아들은 한글이 없어요. 다시 말씀해 주세요.';
  const parts = [`${word}${objParticle(word)} 지문자로 보여 드릴게요.`];
  const screen = [...new Set(plan.filter((p) => p.hand == null).map((p) => jamoName(p.jamo)))];
  if (screen.length) parts.push(`${screen.join(', ')}${objParticle(screen.at(-1))} 손으로 표현할 수 없어서 화면 그림으로 보여 드릴게요.`);
  if (skipped.length) parts.push('한글이 아닌 글자는 건너뛸게요.');
  return parts.join(' ');
}

export function say(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // 앞 안내가 남아 있으면 끊고 새로 말한다
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  window.speechSynthesis.speak(u);
}

// 학습·도전 모드 음성 피드백 (멘토 피드백: 인식이 안 되면 음성으로 다시 해 달라고 하기)
export const demoLine = (j, hand) => `${jamoName(j)}. ${hand ? '로봇 손 시범을 잘 보세요.' : '화면 그림을 보고 손 모양을 익혀 보세요.'}`;
export const followLine = () => '이제 카메라 앞에서 따라 해 보세요.';
// '(으)로': 받침 없거나 ㄹ받침이면 '로', 그 외 받침은 '으로'
export function roParticle(word) {
  const code = word.charCodeAt(word.length - 1) - 0xAC00;
  const jong = code >= 0 && code <= 11171 ? code % 28 : 0;
  return jong === 0 || jong === 8 ? '로' : '으로';
}
export const resultLine = (ok, target, seen) =>
  ok ? '정답이에요. 잘했어요!' : `${jamoName(seen)}${roParticle(jamoName(seen))} 보였어요. ${jamoName(target)}${objParticle(jamoName(target))} 다시 보여 드릴게요.`;
