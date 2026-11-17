import whisper, json
m = whisper.load_model("turbo")
r = m.transcribe("src/src.mp4", language="ko", word_timestamps=True)
json.dump([{"s": s["start"], "e": s["end"], "t": s["text"], "w": [[w["start"], w["end"], w["word"]] for w in s["words"]]} for s in r["segments"]], open("tr.json", "w"), ensure_ascii=False)
for s in r["segments"]: print(f'{s["start"]:.1f}-{s["end"]:.1f}', s["text"])
