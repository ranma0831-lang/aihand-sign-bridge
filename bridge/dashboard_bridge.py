"""
웹 대시보드 ↔ 이정민 님 중앙 프로그램(control/) 다리 (WebSocket)

대시보드는 화면, 손 제어·인식은 이정민 님 코드가 그대로 맡는다. 이 파일은 둘을 이어 주기만 한다.
- 단어 → 순서·맡는 손: control/hand_assign.plan_word
- 손에 보내기: control/hand_link.HandLink (중계 micro:bit → 무선 → 손, 받음/동작 끝 응답)
- 따라 하기 인식: control/one_loop.CamJudge (웹캠 + recognition 모델, 글자/숫자 모드)
메시지 형식: dashboard/README.md "메시지 형식"

설치 (recognition/.venv 파이썬에): pip install websockets pyserial
실행 (이 파일을 14조_AiHand_프로그램/control 폴더에 넣었을 때)
  python dashboard_bridge.py --fake --sim     손·웹캠 없이 (가짜 중계, 인식은 항상 정답)
  python dashboard_bridge.py --fake           가짜 손 + 실제 웹캠 인식
  python dashboard_bridge.py --port COM5      실제 중계 micro:bit + 웹캠
다른 위치에서 실행하면 --control 로 control 폴더를 알려 주기
대시보드: https://ranma0831-lang.github.io/aihand-sign-bridge/?ws=ws://localhost:8765
  (https 페이지에서도 localhost로는 ws:// 연결이 된다)
"""
import argparse
import asyncio
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

HANDS = (1, 2, 3, 4, 5)
ALIAS = {"쉼": "펼침", "칭찬": "ㅎ"}   # 대시보드 이름 → control 모양 이름


class Bridge:
    def __init__(self, link, judge, plan_word):
        self.link, self.judge, self.plan_word = link, judge, plan_word
        self.clients = set()
        self.job = None                 # 지금 하는 표현·시범 (asyncio.Task)
        self.paused = asyncio.Event()
        self.paused.set()               # set = 진행, clear = 일시정지
        # 손 통신은 한 줄로 (중계 micro:bit 하나라서 동시에 보내지 않게), 웹캠 창은 늘 같은 스레드에서
        self.hand_pool = ThreadPoolExecutor(1)
        self.cam_pool = ThreadPoolExecutor(1)

    async def emit(self, msg):
        data = json.dumps(msg, ensure_ascii=False)
        for ws in list(self.clients):
            try:
                await ws.send(data)
            except Exception:
                self.clients.discard(ws)

    async def hand(self, fn, *args):
        return await asyncio.get_running_loop().run_in_executor(self.hand_pool, fn, *args)

    async def check_hands(self):
        """접속하면 손마다 '펼침'을 보내 받음 응답으로 연결 확인"""
        for h in HANDS:
            ok = await self.hand(lambda h=h: self.link.send(h, "펼침", wait_done=False))
            await self.emit({"type": "hand_status", "hand": h, "connected": bool(ok)})

    async def play(self, word, step_ms, gap_ms):
        """단어를 손으로 보여 줌. 화면 안내 글자는 손 없이 step_ms만큼 보여 줌"""
        t0 = time.time()
        steps = [s for s in self.plan_word(word) if s.sign.supported]
        used = set()
        for i, st in enumerate(steps):
            await self.paused.wait()
            shape, hand = st.sign.shape, st.hand
            await self.emit({"type": "step", "i": i, "jamo": shape, "hand": hand, "state": "start"})
            if hand is None:
                await asyncio.sleep(step_ms / 1000)
            else:
                if not await self.hand(self.link.send, hand, shape):
                    await self.emit({"type": "error", "hand": hand, "msg": f"'{shape}' 전달 실패 (전원·손 번호·무선 그룹 확인)"})
                    await self.emit({"type": "stopped"})
                    return
                used.add(hand)
                await asyncio.sleep(max(0, step_ms - 400) / 1000)   # 사람이 볼 수 있게 잠깐 유지 (손 동작 400ms는 이미 지남)
            await self.emit({"type": "step", "i": i, "jamo": shape, "hand": hand, "state": "end"})
            await asyncio.sleep(gap_ms / 1000)
        await self.emit({"type": "done", "ms": round((time.time() - t0) * 1000)})
        for h in sorted(used):
            await self.hand(self.link.send, h, "펼침")

    def start_job(self, coro):
        if self.job and not self.job.done():
            self.job.cancel()
        self.paused.set()
        self.job = asyncio.create_task(coro)

    async def handle(self, m):
        t = m.get("type")
        step_ms, gap_ms = m.get("stepMs", 1200), m.get("gapMs", 250)
        if t in ("express", "demo"):
            self.start_job(self.play(m.get("word") or m.get("jamo", ""), step_ms, gap_ms))
        elif t == "pause":
            self.paused.clear(); await self.emit({"type": "paused"})
        elif t == "resume":
            self.paused.set(); await self.emit({"type": "resumed"})
        elif t in ("stop", "estop"):
            if self.job:
                self.job.cancel()
            self.paused.set()
            await self.emit({"type": "stopped", "estop": t == "estop"})
            # 긴급 정지: 지금 동작은 손에서 끝까지 가지만 다음 글자는 보내지 않는다
        elif t == "test":
            t0 = time.time()
            await self.emit({"type": "step", "i": -1, "jamo": m["jamo"], "hand": m["hand"], "state": "start"})
            ok = await self.hand(self.link.send, m["hand"], ALIAS.get(m["jamo"], m["jamo"]))
            await self.emit({"type": "test_result", "hand": m["hand"], "jamo": m["jamo"], "ok": bool(ok), "ms": round((time.time() - t0) * 1000)})
        elif t == "praise":
            await self.emit({"type": "step", "i": -1, "jamo": "칭찬", "hand": m["hand"], "state": "start"})
            await self.hand(self.link.send, m["hand"], "ㅎ")   # 엄지 척
            await self.emit({"type": "step", "i": -1, "jamo": "칭찬", "hand": m["hand"], "state": "end"})
        elif t == "recognize":
            target, timeout = m["jamo"], float(m.get("timeout", 15))
            # 손으로 못 내는 글자(맡을 손 없음)면 웹캠 창에 정답 그림을 자동으로 보여 줌 (one_loop.run과 같게)
            steps = [s for s in self.plan_word(target) if s.sign.supported]
            force_guide = bool(steps) and steps[0].hand is None
            loop = asyncio.get_running_loop()
            try:
                # 11/18 one_loop: (정답, 잡힌 글자, 걸린 초, 비고, 정답 그림 봤는지). 예전 4개짜리도 받게 앞 4개만 쓴다
                res = await loop.run_in_executor(
                    self.cam_pool, lambda: self.judge.judge(target, timeout, "대시보드에서 연결됨", "대시보드 학습", force_guide))
                ok, got, sec, note = res[:4]
            except KeyboardInterrupt:   # 웹캠 창에서 q
                ok, got, sec, note = False, "", 0, "웹캠 창에서 끝냄"
            # CamJudge는 확신도를 따로 주지 않아서 prob는 비움. 못 알아보면 jamo가 빈 문자열
            await self.emit({"type": "recog", "jamo": got or "", "prob": None, "ms": round(sec * 1000), "note": note})

    async def serve(self, ws):
        self.clients.add(ws)
        asyncio.create_task(self.check_hands())
        try:
            async for raw in ws:
                try:
                    await self.handle(json.loads(raw))
                except Exception as e:   # 메시지 하나가 잘못돼도 다리는 계속 돈다
                    print("처리 실패:", raw[:80], e)
        finally:
            self.clients.discard(ws)


def main():
    ap = argparse.ArgumentParser(description="웹 대시보드 ↔ control 다리")
    ap.add_argument("--control", default=str(Path(__file__).parent), help="control 폴더 (기본: 이 파일이 있는 폴더)")
    ap.add_argument("--fake", action="store_true", help="가짜 중계·손")
    ap.add_argument("--port", help="중계 micro:bit COM 포트 (안 넣으면 자동으로 찾음)")
    ap.add_argument("--sim", action="store_true", help="웹캠 없이 (인식은 항상 정답)")
    ap.add_argument("--cam", type=int)
    ap.add_argument("--ws-port", type=int, default=8765)
    a = ap.parse_args()

    control = Path(a.control).resolve()
    sys.path.insert(0, str(control))
    sys.path.insert(0, str(control.parent / "recognition"))
    from hand_assign import plan_word
    from hand_link import FakeGateway, HandLink
    from one_loop import CamJudge, SimJudge
    import websockets

    link = HandLink(FakeGateway(), log=print) if a.fake else HandLink.open(a.port, log=print)
    judge = SimJudge("") if a.sim else CamJudge(a.cam)

    async def run():
        bridge = Bridge(link, judge, plan_word)
        async with websockets.serve(bridge.serve, "localhost", a.ws_port):
            print(f"대시보드 다리 준비: ws://localhost:{a.ws_port}  ({'가짜 손' if a.fake else '중계 micro:bit'}, {'인식 시뮬레이션' if a.sim else '웹캠 인식'})")
            print(f"대시보드 주소 뒤에 ?ws=ws://localhost:{a.ws_port} 를 붙여 여세요. 끝내려면 Ctrl+C")
            await asyncio.Future()

    try:
        asyncio.run(run())
    except KeyboardInterrupt:
        pass
    finally:
        judge.close()


if __name__ == "__main__":
    main()
