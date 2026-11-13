// 카메라 고르기·오류 문구 (React 없는 순수 함수라 테스트 가능)
export const isVirtual = (d) => /virtual|obs|snap|mirametrix/i.test(d.label);

// 저장해 둔 카메라 → 가상 아닌 첫 카메라 → 아무거나
export function pickCamera(devices, saved) {
  return devices.find((d) => d.deviceId === saved) || devices.find((d) => !isVirtual(d)) || devices[0];
}

export function cameraError(e) {
  switch (e?.name) {
    case 'NotAllowedError': return '카메라 권한이 막혀 있어요. 주소창 왼쪽 아이콘에서 카메라를 "허용"으로 바꿔 주세요.';
    case 'NotReadableError': return '다른 프로그램(Zoom, 영상 촬영 프로그램 등)이 카메라를 쓰고 있어요. 그 프로그램의 비디오를 끄고 다시 시도하세요.';
    case 'NotFoundError': case 'OverconstrainedError': return '카메라를 찾지 못했어요. 카메라가 연결되어 있는지 확인하세요.';
    default: return `카메라를 켤 수 없어요 (${e?.message || e}).`;
  }
}

