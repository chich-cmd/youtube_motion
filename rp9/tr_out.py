import whisper, json
m = whisper.load_model("turbo")
r = m.transcribe("a_ln.wav", language="ko", word_timestamps=True, condition_on_previous_text=False)
out = [{"s": s["start"], "e": s["end"], "t": s["text"], "w": [[w["start"], w["end"], w["word"]] for w in s["words"]]} for s in r["segments"]]
json.dump(out, open("tr_out.json", "w"), ensure_ascii=False)
print(len(out))
