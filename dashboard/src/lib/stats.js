// 기록(log) → 통계. 기록 한 줄: {t, kind:'표현'|'학습'|'맞히기'|'테스트'|'오류', text, ms, ok, attempt?, voice?, edited?}
const DAY = 86400000;
const pct = (a, b) => (b ? Math.round((a / b) * 100) : null);
const avg = (xs) => (xs.length ? Math.round(xs.reduce((s, x) => s + x, 0) / xs.length) : null);

export function summary(log) {
  const ex = log.filter((r) => r.kind === '표현');
  const learn = log.filter((r) => r.kind === '학습');
  const first = learn.filter((r) => r.attempt === 1);
  const voice = ex.filter((r) => r.voice);
  const quiz = log.filter((r) => r.kind === '맞히기');
  return {
    expressCount: ex.length,
    expressAvgMs: avg(ex.map((r) => r.ms)),
    recogRate: pct(learn.filter((r) => r.ok).length, learn.length), // N-02: 모든 시도 중 정답 판정 비율
    feedbackMs: avg(learn.map((r) => r.ms)), // N-03
    learnSuccess: pct(first.filter((r) => r.ok).length, first.length), // S-09: 첫 시도 성공 비율
    voiceAcc: pct(voice.filter((r) => !r.edited).length, voice.length), // N-04: 고치지 않고 쓴 음성 입력 비율
    quizRate: pct(quiz.filter((r) => r.ok).length, quiz.length),
    errors: log.filter((r) => r.kind === '오류' || (r.kind === '테스트' && !r.ok)).length,
  };
}

// 최근 days일 하루별 [{date, count, ok}] (오늘이 마지막)
export function byDay(log, days = 7, now = Date.now()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const base = today.getTime() - (days - 1) * DAY;
  const out = Array.from({ length: days }, (_, i) => ({ date: new Date(base + i * DAY), count: 0, ok: 0 }));
  for (const r of log) {
    const k = Math.floor((r.t - base) / DAY);
    if (k >= 0 && k < days && (r.kind === '표현' || r.kind === '학습' || r.kind === '맞히기')) {
      out[k].count++;
      if (r.ok) out[k].ok++;
    }
  }
  return out;
}

// 학습 기록의 글자별 정답률 [{jamo, total, ok, rate}] (order 순서)
export function byLetter(log, order) {
  const m = new Map();
  for (const r of log) {
    if (r.kind !== '학습') continue;
    const e = m.get(r.text) || { jamo: r.text, total: 0, ok: 0 };
    e.total++;
    if (r.ok) e.ok++;
    m.set(r.text, e);
  }
  return [...m.values()]
    .map((e) => ({ ...e, rate: pct(e.ok, e.total) }))
    .sort((a, b) => order.indexOf(a.jamo) - order.indexOf(b.jamo));
}
