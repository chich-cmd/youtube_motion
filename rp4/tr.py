import whisper, json
m = whisper.load_model("turbo")
out = {}
for i in range(1, 5):
    r = m.transcribe(f"src/v{i}.mp4", language="ko", word_timestamps=True)
    out[i] = [{"s": s["start"], "e": s["end"], "t": s["text"], "w": [[w["start"], w["end"], w["word"]] for w in s["words"]]} for s in r["segments"]]
    for s in r["segments"]: print(i, f'{s["start"]:.1f}-{s["end"]:.1f}', s["text"], flush=True)
json.dump(out, open("tr.json", "w"), ensure_ascii=False)
