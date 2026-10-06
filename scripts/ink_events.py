"""Find moments new handwriting appears on the (static) paper in the original video: frame-difference based."""
import json, subprocess, numpy as np
FPS, LAG = 10, 4                                    # compare each frame with the one 0.4 s earlier
W, H = 670, 370                                     # paper crop (x 290–1630, y 85–825) at 1/2 scale
ranges = [(105.5, 172.0), (183.5, 345.0)]           # source ranges used as footage
events = []
for a, b in ranges:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(a), '-to', str(b), '-i', 'src/original.mp4',
                          '-vf', f'crop=1340:740:290:85,scale={W}:{H},fps={FPS}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
                         capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.int16)
    ch = np.zeros(len(fr))
    for i in range(LAG, len(fr)):
        ch[i] = (np.abs(fr[i] - fr[i - LAG]) > 35).sum()
    on = ch > 25
    i = 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j]: j += 1
            # the stroke spans roughly [i-LAG, j) frames
            events.append({'start': round(a + max(i - LAG, 0) / FPS, 2), 'end': round(a + j / FPS, 2), 'px': int(ch[i:j].max())})
            i = j
        else: i += 1
json.dump(events, open('rec2/ink_events.json', 'w'), indent=1)
print(len(events), 'ink events')
print([(e['start'], e['end']) for e in events])
