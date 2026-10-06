"""Fix Whisper errors using the creator's burned-in subtitles; emit clean segments with proportional word timings."""
import json, re
segs = [s for s in json.load(open('transcript.json')) if s['text'].strip() and s['end'] <= 621.6 and s['end'] > s['start']]
fix = {
  0.8: '수능 40일 남았는데 영어로 최저 맞춰야 하는 친구들은 꼭 보세요.',
  11.3: '해당 등급을 맞기 위해 어떻게 공부해야 하는지 순차적으로 설명드릴게요.',
  44.6: '20번, 그리고 22에서 24번 대의파악과',
  52.3: '25번에서 28번 도표와 일치불일치',
  69.8: '그리고 마지막으로 43에서 45번 스토리텔링',
  73.7: '다 맞기',
  81.0: '다 맞기',
  94.9: '예를 들면 마더텅 검정을 사셔서',
  107.3: '요구,',
  108.3: '안내,',
  118.1: '동사에 동그라미를 치며 체크해 보시면',
  119.8: 'is는 목적동사가 아니고',
  133.3: '3번에 전시 장소 대여를 문의하려고가 있습니다.',
  140.0: '어떻게 문제가 나오는지 꿰뚫고 있는 거죠.',
  143.6: '심경 같은 경우도 보통 앞 심경 찾고',
  146.3: '뒷 심경 찾는 경우가 많은데',
  147.9: '사실 뒷 심경만 찾아도',
  154.0: '여기 worries 얘만 보면',
  156.7: '불안함 될 수 있고',
  157.8: '놀라는 거,',
  158.5: '감사, 무관심 다 안되죠.',
  171.9: '대의파악 문제도 단어 잘 모르고',
  175.2: '역접속사,',
  176.4: '결과접속사,',
  177.5: '예시의 전 문장',
  183.5: '이번 9모로 한 번 보여드릴게요.',
  188.4: '여기 But 문장부터 한 번 살펴보면',
  191.5: '일식에 대한 이유',
  199.5: '근데 또 이게 천체의 움직임이고',
  202.1: '근데 그 천체의 움직임이',
  205.5: '오~',
  210.6: '뉴턴의 만유인력 법칙',
  225.2: '이게 뭐 낮과 밤이랑',
  234.6: '사과나무 그거?',
  257.8: '나는 냉철한 게자리야',
  259.1: '이런 거라도 나와야 될 것 같고',
  261.4: '뉴턴 법칙의 한계, 일식을 설명하는데',
  314.3: '그러므로(thus)',
  322.6: '진짜 왜 무언가는 떨어지는가',
  343.8: '어려워 보이는 대의파악도',
  369.6: '읽는 양을 계속 늘려 나가면',
  387.8: '그리고 나는 혼자서는 진짜 해석공부 못하겠다',
  393.1: '김기철 쌤',
  417.8: '마더텅에서 어려운 문장이든',
  459.4: '이 노트 5회독만 해주세요',
  531.5: '제끼고 외우기',
  552.9: '분류 작업을 한번 거치시고',
  566.9: '하루 세 번씩',
  568.0: '글자 생김새,',
  571.7: '발음,',
}
out = []
for s in segs:
    key = next((k for k in fix if abs(k - s['start']) < 0.06), None)
    text = fix[key] if key is not None else s['text']
    # drop duplicate tiny segment (whisper repeated 결과접속사)
    if out and out[-1]['text'] == text: continue
    toks = text.split()
    total = sum(len(t) for t in toks) or 1
    t0, dur, acc, words = s['start'], s['end'] - s['start'], 0, []
    if key is None and s['words'] and len(s['words']) == len(toks):
        words = [{'s': w['s'], 'e': w['e'], 'w': t} for w, t in zip(s['words'], toks)]
    else:
        for t in toks:
            a = t0 + dur * acc / total; acc += len(t)
            words.append({'s': round(a, 2), 'e': round(t0 + dur * acc / total, 2), 'w': t})
    out.append({'start': s['start'], 'end': s['end'], 'text': text, 'words': words})
if not out[-1]['text'].startswith('감사합니다'):
    out.append({'start': 621.5, 'end': 622.6, 'text': '감사합니다.', 'words': [{'s': 621.5, 'e': 622.6, 'w': '감사합니다.'}]})
else:
    out[-1]['end'] = max(out[-1]['end'], 622.6)
json.dump(out, open('transcript_clean.json', 'w'), ensure_ascii=False, indent=1)
open('script.txt', 'w').write('\n'.join(f"[{s['start']:6.1f}] {s['text']}" for s in out))
print(len(out))
