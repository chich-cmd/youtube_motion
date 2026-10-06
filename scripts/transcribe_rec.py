import json, sys, torch, whisper
torch.set_num_threads(4)
m = whisper.load_model('turbo')
out = {}
for f in sys.argv[1:]:
    r = m.transcribe(f, language='ko', word_timestamps=True, fp16=False)
    out[f] = [{'start': round(s['start'], 2), 'end': round(s['end'], 2), 'text': s['text'].strip(),
               'words': [{'s': round(w['start'], 2), 'e': round(w['end'], 2), 'w': w['word']} for w in s['words']]} for s in r['segments']]
    for s in out[f]: print(f, f"[{s['start']:5.2f}-{s['end']:5.2f}]", s['text'], flush=True)
json.dump(out, open('rec/transcripts.json', 'w'), ensure_ascii=False, indent=1)
