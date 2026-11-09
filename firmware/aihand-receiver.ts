// Sign Bridge — AI Hand 수신 프로그램 v3 (micro:bit V2 + Hiwonder AiHand), 블루투스 방식
// 대시보드(크롬)가 블루투스로 한 줄을 보내면 서보 1~6을 그 각도로 움직인다.
//   보내는 한 줄: "엄지,검지,중지,약지,소지,손목,시간ms$"   예) 50,50,50,50,50,90,500$  (엄지 척)
//   받으면 "OK$"를 돌려보낸다 (대시보드 카드에 표시)
//
// 왜 블루투스인가: micro:bit 시리얼(UART)은 확장 보드(서보) 전용으로 고정해야 서보가 움직인다.
// 예제 5.6(앱 제어)과 같은 방식: startbit_Init()으로 보드 연결 + 블루투스 UART로 명령 수신.
//
// 넣는 법 (README의 "실제 AI Hand 연결" 참고)
//  1) makecode.microbit.org → 새 프로젝트
//  2) Extensions: https://github.com/Hiwonder/StartbitV2 추가, "bluetooth" 추가 (radio를 지우라고 하면 지움)
//  3) 톱니바퀴 → 프로젝트 설정 → "No Pairing Required: Anyone can connect via Bluetooth" 켜기
//  4) JavaScript 탭에 이 파일 내용을 붙여 넣고 Download
//
// 혼자 시험: A 버튼 = 엄지 척, B 버튼 = 손 펴기 (블루투스 없이 서보만 확인)

function moveHand(angles: number[], ms: number) {
    for (let i = 0; i < 6; i++) {
        StartbitV2.setPwmServo(StartbitV2.startbit_servorange.range1, i + 1, Math.constrain(angles[i], 0, 180), ms)
    }
}

bluetooth.onBluetoothConnected(function () {
    basic.showIcon(IconNames.Heart) // 대시보드와 연결됨
})
bluetooth.onBluetoothDisconnected(function () {
    basic.showIcon(IconNames.Yes) // 연결 대기
})

bluetooth.onUartDataReceived(serial.delimiters(Delimiters.Dollar), function () {
    const line = bluetooth.uartReadUntil(serial.delimiters(Delimiters.Dollar))
    const p = line.split(",")
    if (p.length < 7) {
        bluetooth.uartWriteString("ERR$")
        return
    }
    const angles: number[] = []
    for (let i = 0; i < 6; i++) angles.push(parseInt(p[i]))
    moveHand(angles, Math.constrain(parseInt(p[6]), 100, 2000))
    led.toggle(2, 2) // 명령을 받을 때마다 가운데 LED가 깜빡인다
    bluetooth.uartWriteString("OK$")
})

input.onButtonPressed(Button.A, function () {
    moveHand([50, 50, 50, 50, 50, 90], 600) // 엄지 척
})
input.onButtonPressed(Button.B, function () {
    moveHand([50, 130, 130, 130, 130, 90], 600) // 손 펴기
})

StartbitV2.startbit_Init() // 시리얼을 확장 보드로 연결 (예제 5.1·5.6과 같음)
bluetooth.startUartService()
basic.showIcon(IconNames.Yes) // 준비 완료
