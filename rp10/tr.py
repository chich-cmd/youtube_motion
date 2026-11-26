import whisper, json, sys, os
m = whisper.load_model("turbo")
out = json.load(open('tr.json')) if os.path.exists('tr.json') else {}
for f in sorted(os.listdir('src')):
    k = f.split('.')[0]
    if k in out: continue
    r = m.transcribe(f'src/{f}', language="ko", word_timestamps=True)
    out[k] = [{"s": s["start"], "e": s["end"], "t": s["text"], "w": [[w["start"], w["end"], w["word"]] for w in s["words"]]} for s in r["segments"]]
    json.dump(out, open('tr.json', 'w'), ensure_ascii=False)
for k in sorted(out, key=lambda x: int(x[1:])):
    print(f'== {k}')
    for s in out[k]: print(f'{s["s"]:.1f}-{s["e"]:.1f}', s["t"])
