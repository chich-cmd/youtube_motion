import json, subprocess, os
from concurrent.futures import ThreadPoolExecutor
plan = json.load(open('plan.json'))
os.makedirs('pieces', exist_ok=True)
FREEZE = 9.05   # intro notice overlay (to 5.7s): the page is static until ~20s, so use a clean still
def job(a):
    n, (s, e, sp, kind) = a
    out = f'pieces/p{n:03d}.mp4'
    d = (e - s) / sp
    v = f'setpts=(PTS-STARTPTS)/{sp},fps=30,format=yuv420p'
    vin = ['-loop', '1', '-t', f'{e-s:.3f}', '-i', 'src/still6.png'] if e <= FREEZE + 0.05 else ['-ss', f'{s:.3f}', '-t', f'{e-s:.3f}', '-i', 'src/raw.mp4']
    if kind == 'talk':
        ain = ['-ss', f'{s:.3f}', '-t', f'{e-s:.3f}', '-i', 'src/raw.mp4']
        af = f'asetpts=PTS-STARTPTS,afade=t=in:d=0.02,afade=t=out:st={d-0.03:.3f}:d=0.03,aresample=48000'
    else:
        ain = ['-f', 'lavfi', '-t', f'{d:.3f}', '-i', 'anullsrc=r=48000:cl=mono']; af = 'anull'
    cmd = ['ffmpeg', '-v', 'error', '-y'] + vin + ain + ['-filter_complex', f'[0:v]{v}[v];[1:a]{af}[a]', '-map', '[v]', '-map', '[a]', '-t', f'{d:.3f}',
           '-c:v', 'libx264', '-preset', 'fast', '-crf', '17', '-c:a', 'aac', '-b:a', '192k', '-ac', '1', '-threads', '2', out]
    subprocess.run(cmd, check=True)
with ThreadPoolExecutor(3) as ex: list(ex.map(job, enumerate(plan)))
with open('pieces/list.txt', 'w') as f:
    for n in range(len(plan)): f.write(f"file 'p{n:03d}.mp4'\n")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', 'pieces/list.txt', '-c', 'copy', 'cut.mp4'], check=True)
# actual piece durations for exact time mapping
ds = [float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'pieces/p{n:03d}.mp4'], capture_output=True, text=True).stdout) for n in range(len(plan))]
json.dump(ds, open('piece_durs.json', 'w'))
print('done', sum(ds))
