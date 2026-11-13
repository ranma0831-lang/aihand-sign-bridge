// 웹캠 켜고 끄기 (학습·도전 화면 공용). 화면을 떠나면 자동으로 끈다
import { useEffect, useRef } from 'react';
import { useSystem } from './store.jsx';

export function useCamera() {
  const { settings, toast } = useSystem();
  const video = useRef(null);
  const stream = useRef(null);
  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; };
  async function start() {
    if (!settings.camera || stream.current) return;
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: true });
      if (video.current) video.current.srcObject = stream.current;
    } catch { toast('카메라를 켤 수 없습니다. 브라우저 권한을 확인해 주세요.', 'error'); }
  }
  useEffect(() => stop, []);
  return { video, start, stop };
}
