import whisper, json, sys
m = whisper.load_model("turbo")
r = m.transcribe(sys.argv[1], language="ko", word_timestamps=True)
out = [{"s": s["start"], "e": s["end"], "t": s["text"], "w": [[w["start"], w["end"], w["word"]] for w in s["words"]]} for s in r["segments"]]
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False)
for s in out: print(f'{s["s"]:.1f}-{s["e"]:.1f}', s["t"])
