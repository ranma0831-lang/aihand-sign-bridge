// 웹캠 켜고 끄기 (학습·도전 화면 공용). 화면을 떠나면 자동으로 끈다
// 가상 카메라(Mirametrix Virtual Camera 등)가 기본으로 잡히면 화면이 비어 보여서 실제 카메라를 고른다
import { useEffect, useRef, useState } from 'react';
import { useSystem } from './store.jsx';
import { cameraError, pickCamera } from './camera.js';


const KEY = 'sb-cam';
export function useCamera() {
  const { settings } = useSystem();
  const video = useRef(null);
  const stream = useRef(null);
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(() => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } });
  const [error, setError] = useState('');
  const [on, setOn] = useState(false);

  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setOn(false); };

  async function open(id) {
    stop();
    stream.current = await navigator.mediaDevices.getUserMedia({ video: id ? { deviceId: { exact: id } } : true });
    if (video.current) video.current.srcObject = stream.current;
    setOn(true);
  }

  async function start(want = deviceId) {
    if (!settings.camera || stream.current) return;
    setError('');
    try {
      await open(want);
      // 권한을 받은 뒤라야 카메라 이름이 보인다 → 실제 카메라로 다시 고르기
      const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
      setDevices(cams);
      const best = pickCamera(cams, want);
      const curId = stream.current?.getVideoTracks()[0]?.getSettings().deviceId;
      if (best && best.deviceId !== curId) await open(best.deviceId);
      if (best) setDeviceId(best.deviceId);
    } catch (e) {
      // 저장해 둔 카메라가 없어졌으면 기본 카메라로 한 번 더
      if (want && (e?.name === 'NotFoundError' || e?.name === 'OverconstrainedError')) { try { localStorage.removeItem(KEY); } catch { /* 무시 */ } return start(''); }
      stop();
      setError(cameraError(e));
    }
  }

  async function choose(id) {
    setDeviceId(id);
    try { localStorage.setItem(KEY, id); } catch { /* 저장 못 해도 이번엔 쓴다 */ }
    setError('');
    try { await open(id); } catch (e) { stop(); setError(cameraError(e)); }
  }

  useEffect(() => stop, []);
  return { video, start, stop, devices, deviceId, choose, error, on };
}
