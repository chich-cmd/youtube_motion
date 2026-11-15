import json, subprocess, os
plan = json.load(open('plan.json'))
os.makedirs('pieces', exist_ok=True)
lst = open('pieces/list.txt', 'w')
for n, (i, s, e, sp, kind) in enumerate(plan):
    out = f'pieces/p{n:03d}.mp4'
    v = f'scale=1440:1920:force_original_aspect_ratio=decrease,pad=1440:1920:(ow-iw)/2:(oh-ih)/2:white,setpts=(PTS-STARTPTS)/{sp},fps=30'
    if kind == 'talk':
        a = f'atempo={sp},afade=t=in:d=0.02,afade=t=out:st={(e-s)/sp-0.03:.3f}:d=0.03,aresample=48000'
        args = ['-filter_complex', f'[0:v]{v}[v];[0:a]asetpts=PTS-STARTPTS,{a}[a]', '-map', '[v]', '-map', '[a]']
    else:
        d = (e - s) / sp
        args = ['-f', 'lavfi', '-t', f'{d:.3f}', '-i', 'anullsrc=r=48000:cl=mono', '-filter_complex', f'[0:v]{v}[v]', '-map', '[v]', '-map', '1:a']
        args = args[:0] + args  # keep order
    cmd = ['ffmpeg', '-v', 'error', '-y', '-ss', f'{s:.3f}', '-t', f'{e-s:.3f}', '-i', f'src/v{i}.mp4'] + args + \
          ['-c:v', 'libx264', '-preset', 'fast', '-crf', '19', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-ac', '1', '-shortest', out]
    subprocess.run(cmd, check=True)
    lst.write(f"file 'p{n:03d}.mp4'\n")
lst.close()
