// AI Hand를 블루투스로 직접 연결 (크롬 Web Bluetooth, micro:bit UART 서비스). 손 하나 = micro:bit 하나.
// micro:bit 쪽 프로그램: firmware/aihand-receiver.ts (예제 5.6 앱 제어와 같은 방식)
// 보내는 한 줄: "엄지,검지,중지,약지,소지,손목,시간ms$"  (서보 1~6 각도, 이동 시간)
// 받는 응답: "OK" / "ERR"
// shortcut: 중앙 PC(FastAPI)가 생기기 전 시험용 직접 연결. 서버가 생기면 서버가 이 형식으로 손에 보내면 된다
const UART = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TX = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // micro:bit → PC (indicate)
const RX = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // PC → micro:bit (write)
const links = new Map(); // hand → { device, rx, queue }
const enc = new TextEncoder();

export const hwSupported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;

export async function connectHand(hand, { onLost, onLine } = {}) {
  const device = await navigator.bluetooth.requestDevice({
    filters: [{ namePrefix: 'BBC micro:bit' }],
    optionalServices: [UART],
  });
  const server = await device.gatt.connect();
  const svc = await server.getPrimaryService(UART);
  const rx = await svc.getCharacteristic(RX);
  const tx = await svc.getCharacteristic(TX);
  let buf = '';
  tx.addEventListener('characteristicvaluechanged', (e) => {
    buf += new TextDecoder().decode(e.target.value);
    let k;
    while ((k = buf.indexOf('$')) >= 0) {
      const line = buf.slice(0, k).trim();
      buf = buf.slice(k + 1);
      if (line) onLine?.(hand, line);
    }
  });
  await tx.startNotifications();
  device.addEventListener('gattserverdisconnected', () => {
    if (links.get(hand)?.device === device) { links.delete(hand); onLost?.(hand); }
  });
  links.set(hand, { device, rx, queue: Promise.resolve() });
  return device.name;
}

export async function disconnectHand(hand) {
  const l = links.get(hand);
  if (!l) return;
  links.delete(hand);
  try { l.device.gatt.disconnect(); } catch { /* 이미 끊김 */ }
}

// 블루투스는 한 번에 20바이트까지라 잘라서 순서대로 보낸다 (micro:bit가 '$'까지 모아서 읽음)
export function sendAngles(hand, angles, ms = 500) {
  const l = links.get(hand);
  if (!l) return Promise.resolve(false);
  const bytes = enc.encode([...angles.slice(0, 6).map((a) => Math.max(0, Math.min(180, Math.round(a)))), Math.round(ms)].join(',') + '$');
  l.queue = l.queue.then(async () => {
    for (let i = 0; i < bytes.length; i += 20) await l.rx.writeValue(bytes.slice(i, i + 20));
    return true;
  });
  const sent = l.queue;
  l.queue = sent.catch(() => false); // 한 번 실패해도 다음 명령은 보낼 수 있게
  return sent;
}

export const isConnected = (hand) => links.has(hand);
