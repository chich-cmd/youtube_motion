import json, sys
from faster_whisper import WhisperModel
model = WhisperModel(sys.argv[2], device="cpu", compute_type="int8", cpu_threads=4)
segs, info = model.transcribe(sys.argv[1], language="ko", word_timestamps=True, vad_filter=True, beam_size=5)
out = []
for s in segs:
    out.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
                "words": [{"s": round(w.start, 2), "e": round(w.end, 2), "w": w.word} for w in (s.words or [])]})
    print(f"[{s.start:7.2f}-{s.end:7.2f}] {s.text.strip()}", flush=True)
json.dump(out, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
