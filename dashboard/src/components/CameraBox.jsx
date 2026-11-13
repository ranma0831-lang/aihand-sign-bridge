// 웹캠 화면 + 카메라 고르기 + 안 켜질 때 이유와 다시 시도 (학습·도전 공용)
import { useEffect } from 'react';
import { useSystem } from '../lib/store.jsx';
import { Card, Icon } from './ui.jsx';

export default function CameraBox({ cam, children }) {
  const { settings } = useSystem();
  // 화면에 들어오면 바로 켜서 손 위치를 미리 맞출 수 있게 한다
  useEffect(() => { cam.start(); }, [settings.camera]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="!p-3 flex flex-col gap-2">
      <div className="relative aspect-video rounded-[22px] overflow-hidden bg-black/5">
        <video ref={cam.video} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />
        {!cam.on && (
          <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-mute" role="status">
            {!settings.camera ? '설정에서 카메라가 꺼져 있습니다' : cam.error ? (
              <div className="flex flex-col items-center gap-3">
                <Icon name="videocamera-record-linear" className="text-3xl text-bad" />
                <p className="text-ink max-w-sm">{cam.error}</p>
                <button onClick={() => cam.start()} className="btn btn-dark text-sm !py-2"><Icon name="restart-bold" />다시 시도</button>
              </div>
            ) : '카메라를 켜는 중…'}
          </div>
        )}
        {children}
      </div>
      {cam.devices.length > 1 && (
        <label className="flex items-center gap-2 text-sm px-2">
          <Icon name="videocamera-linear" className="text-mute" />
          <span className="text-mute shrink-0">카메라</span>
          <select value={cam.deviceId} onChange={(e) => cam.choose(e.target.value)} className="field !py-1.5 !rounded-full flex-1 min-w-0">
            {cam.devices.map((d, k) => <option key={d.deviceId} value={d.deviceId}>{d.label || `카메라 ${k + 1}`}</option>)}
          </select>
        </label>
      )}
    </Card>
  );
}
