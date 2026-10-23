"""텔레그램 전송. TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID 환경 변수가 있을 때만 동작."""
from __future__ import annotations

import os
from pathlib import Path


def telegram(text: str, files: list[Path] = ()) -> bool:
    token, chat = os.getenv("TELEGRAM_BOT_TOKEN"), os.getenv("TELEGRAM_CHAT_ID")
    if not (token and chat):
        return False
    import requests

    base = f"https://api.telegram.org/bot{token}"
    r = requests.post(f"{base}/sendMessage", data={"chat_id": chat, "text": text[:4000]}, timeout=30)
    r.raise_for_status()
    for f in files:
        with open(f, "rb") as fh:
            requests.post(f"{base}/sendDocument", data={"chat_id": chat},
                          files={"document": (Path(f).name, fh)}, timeout=60).raise_for_status()
    return True
