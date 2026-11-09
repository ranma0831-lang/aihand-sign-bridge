// ⑤ 통계·학습 기록: 목표 수치(N-01~N-04, S-09) 확인과 기록 (S-05)
import { PageHead } from '../components/Shell.jsx';
import { Bars, Card, CardTitle, Icon, Spark, Stat } from '../components/ui.jsx';
import { BASIC } from '../lib/hangul.js';
import { useSystem } from '../lib/store.jsx';
import { byDay, byLetter, summary } from '../lib/stats.js';

const fmtMs = (ms) => (ms == null ? '–' : ms >= 1000 ? `${(ms / 1000).toFixed(1)}초` : `${ms}ms`);

export default function Analytics() {
  const { log, clearLog } = useSystem();
  const s = summary(log);
  const days = byDay(log, 14);
  const letters = byLetter(log, BASIC);

  return (
    <>
      <PageHead title="통계" sub="목표 수치 달성 여부와 연습 기록을 확인합니다."
        right={<button onClick={clearLog} className="btn btn-light"><Icon name="trash-bin-2-linear" />기록 지우기</button>} />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-12 grid grid-cols-2 md:grid-cols-4 gap-6">
          <Stat label="지문자 표현 횟수" value={s.expressCount} unit="회" />
          <Stat label="손 모양 인식률" value={s.recogRate} unit="%" hint="목표 90% 이상 (N-02)" />
          <Stat label="평균 피드백 시간" value={s.feedbackMs} unit="ms" hint="목표 1초 이내 (N-03)" />
          <Stat label="음성 인식 정확도" value={s.voiceAcc} unit="%" hint="목표 90% 이상 (N-04)" />
          <Stat label="학습 성공률" value={s.learnSuccess} unit="%" hint="첫 시도 정답, 목표 80% (S-09)" />
          <Stat label="맞히기 정답률" value={s.quizRate} unit="%" hint="목표 80% (S-10)" />
          <Stat label="평균 표현 시간" value={s.expressAvgMs == null ? null : (s.expressAvgMs / 1000).toFixed(1)} unit="초" />
          <Stat label="통신·동작 오류" value={s.errors} unit="건" />
        </Card>

        <Card className="lg:col-span-6">
          <CardTitle icon="calendar-linear">날짜별 연습 (최근 14일)</CardTitle>
          <Spark data={days.map((d) => d.count)} labels={days.map((d, i) => (i % 2 === 1 || i === days.length - 1 ? `${d.date.getMonth() + 1}/${d.date.getDate()}` : ''))} />
        </Card>

        <Card dark className="lg:col-span-6">
          <CardTitle icon="chart-square-linear">글자별 정답률 (%)</CardTitle>
          <Bars dark items={letters.map((l) => ({ label: l.jamo, value: l.rate }))} />
        </Card>

        <Card className="lg:col-span-12 !p-0 overflow-hidden">
          <div className="px-6 pt-5"><CardTitle icon="document-text-linear">전체 기록</CardTitle></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm num">
              <thead className="text-mute text-left"><tr>
                {['시각', '구분', '내용', '처리 시간', '결과', '비고'].map((h) => <th key={h} className="px-6 py-2 font-medium whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {log.slice(0, 100).map((r) => (
                  <tr key={r.t + r.text + r.kind} className="border-t border-black/5">
                    <td className="px-6 py-2.5 text-mute whitespace-nowrap">{new Date(r.t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td className="px-6 py-2.5 whitespace-nowrap">{r.kind}</td>
                    <td className="px-6 py-2.5 font-semibold">{r.text}</td>
                    <td className="px-6 py-2.5 whitespace-nowrap">{fmtMs(r.ms)}</td>
                    <td className="px-6 py-2.5"><span className={r.ok ? 'text-ok' : 'text-bad'}>{r.ok ? '성공' : '실패'}</span></td>
                    <td className="px-6 py-2.5 text-mute whitespace-nowrap">
                      {[r.attempt && `${r.attempt}번째 시도`, r.prob && `정확도 ${Math.round(r.prob * 100)}%`, r.voice && (r.edited ? '음성 입력(수정함)' : '음성 입력')].filter(Boolean).join(' · ')}
                    </td>
                  </tr>
                ))}
                {!log.length && <tr><td colSpan={6} className="px-6 py-10 text-center text-mute">아직 기록이 없습니다.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
