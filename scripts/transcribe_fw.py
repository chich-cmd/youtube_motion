"""Korean word-timestamped transcript with faster-whisper. Usage: transcribe_fw.py <media> <out.json> [model]"""
import json, sys
from faster_whisper import WhisperModel
model = WhisperModel(sys.argv[3] if len(sys.argv) > 3 else 'large-v3-turbo', device='cpu', compute_type='int8', cpu_threads=4)
segs, _ = model.transcribe(sys.argv[1], language='ko', word_timestamps=True, vad_filter=True, beam_size=5)
out = [{'start': round(s.start, 2), 'end': round(s.end, 2), 'text': s.text.strip(),
        'words': [{'s': round(w.start, 2), 'e': round(w.end, 2), 'w': w.word} for w in s.words]} for s in segs]
json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, indent=1)
for s in out: print(f"[{s['start']:6.2f}-{s['end']:6.2f}] {s['text']}")
