import json, sys, torch, whisper
torch.set_num_threads(4)
model = whisper.load_model(sys.argv[2])
r = model.transcribe(sys.argv[1], language="ko", word_timestamps=True, verbose=True, fp16=False)
out = [{"start": round(s["start"], 2), "end": round(s["end"], 2), "text": s["text"].strip(),
        "words": [{"s": round(w["start"], 2), "e": round(w["end"], 2), "w": w["word"]} for w in s.get("words", [])]}
       for s in r["segments"]]
json.dump(out, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
print("DONE", len(out))
