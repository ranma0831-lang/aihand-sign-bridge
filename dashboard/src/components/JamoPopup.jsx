// AI Hand로 못 내는 글자(맡는 손 없음)가 차례가 되면 화면 가운데에 영상·사진을 띄운다
// 파일은 public/jamo/<글자>.mp4 → <글자>.png 순서로 찾고, 둘 다 없으면 글자만 크게 보여 준다
import { useEffect, useState } from 'react';
import { useSystem } from '../lib/store.jsx';
import { jobView } from '../pages/Dashboard.jsx';
import { Icon } from './ui.jsx';

const KINDS = ['mp4', 'png'];

export default function JamoPopup() {
  const { job } = useSystem();
  const { cur } = jobView(job);
  const jamo = cur && cur.hand == null ? cur.jamo : null;
  const [kind, setKind] = useState(0); // KINDS 번호, 다 실패하면 KINDS.length
  useEffect(() => setKind(0), [jamo]);
  if (!jamo) return null;

  const src = `./jamo/${encodeURIComponent(jamo)}.${KINDS[kind]}`;
  const fail = () => setKind((k) => k + 1);
  return (
    // 버튼(일시정지·중지)을 가리지 않게 클릭은 뒤로 통과시킨다
    <div className="fixed inset-0 z-40 grid place-items-center p-4 pointer-events-none" role="status" aria-live="polite">
      <div className="ink !rounded-3xl p-6 w-[min(26rem,100%)] text-center shadow-2xl">
        <div className="aspect-square rounded-2xl bg-white/10 grid place-items-center overflow-hidden">
          {kind === 0 && <video key={src} src={src} autoPlay muted loop playsInline onError={fail} className="w-full h-full object-cover" />}
          {kind === 1 && <img key={src} src={src} alt={`'${jamo}' 지문자`} onError={fail} className="w-full h-full object-contain bg-white" />}
          {kind >= KINDS.length && <span className="text-[8rem] font-bold leading-none">{jamo}</span>}
        </div>
        <p className="text-2xl font-bold mt-4">'{jamo}'</p>
        <p className="text-white/70 text-sm mt-1 flex items-center justify-center gap-1">
          <Icon name="info-circle-linear" />AI Hand로 불가능한 동작이라 화면으로 대체합니다
        </p>
        {kind === 1 && <p className="text-white/40 text-xs mt-2">그림: 국립장애인도서관</p>}
      </div>
    </div>
  );
}
