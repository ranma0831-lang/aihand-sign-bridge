// 사용법: 처음 쓰는 사람을 위한 안내
import { Link } from 'react-router-dom';
import { PageHead } from '../components/Shell.jsx';
import { Card, CardTitle, Icon } from '../components/ui.jsx';

const STEPS = [
  {
    to: '/', page: '통합 관제', title: '상태 확인',
    items: [
      '손 카드 5개가 모두 ● 연결됨인지 확인합니다.',
      '오른쪽 위 버튼이 "시스템 시작"으로 보이면 눌러서 켭니다. "시스템 정지"로 보이면 이미 켜진 상태예요.',
    ],
  },
  {
    to: '/express', page: '지문자 표현', title: '단어 보여 주기',
    items: [
      '입력창에 단어를 적거나 "음성 입력"을 누르고 말합니다. 2~3글자를 추천해요.',
      '입력하는 동안 자모 순서와 담당 손이 미리 보입니다. 예: 사랑 → ㅅ(손 1) ㅏ(손 2) …',
      '"표현 시작"을 누르면 로봇 손이 차례로 움직입니다. 중간에 일시정지·재개·중지할 수 있어요.',
      '점선 칩은 로봇 손으로 만들기 어려운 글자(ㅁ, ㅍ, 쌍자음 등)라서 화면 그림으로 대신 보여 줍니다.',
    ],
  },
  {
    to: '/learn', page: '학습', title: '직접 따라 하기',
    items: [
      '배울 글자를 누르면 로봇 손이 정답 손 모양을 시범으로 보여 줍니다.',
      '카메라가 켜지면 같은 손 모양을 만들고 2초쯤 멈춥니다. 처음에는 카메라 권한을 "허용"해 주세요.',
      '정답이면 초록 체크와 함께 로봇이 칭찬 동작을 합니다. 오답이면 정답을 다시 보여 주니 "다시 따라 하기"를 누르세요.',
      '맞힌 적 있는 글자에는 작은 초록 점이 붙습니다. 시범·결과는 음성으로도 안내해요.',
      '"도전" 메뉴: 이름을 넣고 글자 5개를 연속으로 따라 하면 점수와 순위표에 올라갑니다.',
    ],
  },
  {
    to: '/analytics', page: '통계', title: '실력 확인',
    items: [
      '인식률, 반응 시간, 학습 성공률을 목표 수치와 함께 보여 줍니다.',
      '글자별 정답률 막대로 약한 글자를 찾을 수 있어요. 모든 기록은 맨 아래 표에 남습니다.',
    ],
  },
];

const ADMIN = [
  { to: '/robots', page: '개별 제어', text: '로봇 손 하나가 이상할 때 씁니다. 글자를 골라 "테스트"를 누르면 그 손만 움직여 봅니다. 오류가 나면 원인을 해결한 뒤 "오류 해제"를 누르세요.' },
  { to: '/settings', page: '설정', text: '글자마다 맡을 손과 손가락 각도, 동작 속도, 카메라·음성 사용을 정합니다. "JSON 내보내기"로 설정을 팀원과 공유할 수 있어요.' },
];

const LEGEND = [
  [<span key="a" className="w-6 h-6 rounded-lg bg-ink" />, '검은 카드', '지금 움직이는 손'],
  [<span key="b" className="w-6 h-6 rounded-lg border-2 border-dashed border-ink/50" />, '점선 테두리', '다음 차례 손, 또는 그림으로 대신 보여 주는 글자'],
  [<span key="c" className="w-3 h-3 rounded-full bg-ok" />, '초록', '연결됨 · 완료 · 정답'],
  [<span key="d" className="w-3 h-3 rounded-full bg-bad" />, '빨강', '끊김 · 오류 · 오답 · 긴급 정지'],
  [<span key="e" className="w-3 h-3 rounded-full bg-black/20" />, '회색', '대기 중'],
];

export default function Guide() {
  return (
    <>
      <PageHead title="사용법" sub="단어를 입력하면 로봇 손 5대가 차례로 지문자를 보여 주고, 카메라 앞에서 따라 하며 배우는 대시보드입니다." />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card dark className="lg:col-span-12 flex flex-wrap items-center gap-4">
          <Icon name="stop-circle-bold" className="text-4xl text-bad" />
          <div className="flex-1 min-w-[14rem]">
            <p className="font-semibold text-lg">위험하면 언제든 빨간 "긴급 정지"</p>
            <p className="text-white/60 text-sm mt-1">왼쪽 메뉴 아래(휴대폰에서는 오른쪽 위)에 있습니다. 누르면 모든 로봇 손이 바로 멈춥니다.</p>
          </div>
          <p className="text-sm text-white/60">"가짜 데이터" 표시는 아직 로봇과 연결되지 않은 연습 상태라는 뜻입니다.</p>
        </Card>

        <h2 className="lg:col-span-12 text-xl font-semibold tracking-tight mt-2">처음이라면 이 순서로</h2>
        {STEPS.map((s, i) => (
          <Card key={s.to} className="lg:col-span-6 flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <span className="grid place-items-center w-9 h-9 rounded-full bg-ink text-white font-bold num shrink-0">{i + 1}</span>
              <div className="mr-auto min-w-0">
                <p className="text-xs text-mute">{s.page}</p>
                <h3 className="text-lg font-semibold leading-tight">{s.title}</h3>
              </div>
            </div>
            <ul className="flex flex-col gap-2 text-[15px] leading-relaxed">
              {s.items.map((t) => <li key={t} className="flex gap-2"><Icon name="check-read-linear" className="mt-1 shrink-0 text-mute" />{t}</li>)}
            </ul>
            <Link to={s.to} className="btn btn-light text-sm self-start mt-5">{s.page} 열기<Icon name="arrow-right-linear" /></Link>
          </Card>
        ))}

        <Card className="lg:col-span-7">
          <CardTitle icon="user-hand-up-linear">관리자(팀원)용 화면</CardTitle>
          <div className="flex flex-col gap-4">
            {ADMIN.map((a) => (
              <div key={a.to} className="flex flex-wrap gap-3 items-start">
                <Link to={a.to} className="btn btn-dark text-sm !py-2 shrink-0">{a.page}</Link>
                <p className="flex-1 min-w-[14rem] text-[15px] leading-relaxed">{a.text}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <CardTitle icon="palette-linear">색과 모양의 뜻</CardTitle>
          <ul className="flex flex-col gap-3">
            {LEGEND.map(([mark, name, meaning]) => (
              <li key={name} className="flex items-center gap-3">
                <span className="w-7 grid place-items-center shrink-0">{mark}</span>
                <span className="font-semibold w-20 shrink-0">{name}</span>
                <span className="text-mute text-sm">{meaning}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="lg:col-span-12">
          <CardTitle icon="lightbulb-linear">알아 두면 좋은 점</CardTitle>
          <ul className="grid md:grid-cols-3 gap-4 text-[15px] leading-relaxed">
            <li>음성 입력은 <b>크롬 브라우저</b>에서만 되고 인터넷이 필요합니다.</li>
            <li>기록은 <b>지금 쓰는 브라우저에만</b> 저장됩니다. 다른 컴퓨터에서 열면 기록이 비어 있어요.</li>
            <li>오른쪽 위에 뜨는 알림은 4초 뒤 자동으로 사라집니다.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
