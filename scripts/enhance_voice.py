"""Reduce room reverb / noise in the narration with DeepFilterNet3 (timing preserved)."""
import subprocess, sys, numpy as np, torch
from df.enhance import enhance, init_df
src, dst = sys.argv[1], sys.argv[2]
model, state, _ = init_df()
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-ac', '1', '-ar', '48000', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
x = torch.from_numpy(np.frombuffer(raw, np.float32).copy())[None]
CH, OV = 48000 * 30, 48000                         # 30 s chunks with 1 s cross-fade
out = torch.zeros_like(x)
w = torch.zeros_like(x)
for a in range(0, x.shape[1], CH):
    b = min(a + CH + OV, x.shape[1])
    y = enhance(model, state, x[:, a:b], atten_lim_db=24)
    fade = torch.ones(b - a)
    if a > 0: fade[:OV] = torch.linspace(0, 1, OV)
    if b < x.shape[1]: fade[-OV:] = torch.linspace(1, 0, OV)
    out[:, a:b] += y * fade; w[:, a:b] += fade
    print(f'{b / 48000:.0f}s', flush=True)
out = (out / w.clamp(min=1e-6)).numpy()[0].astype(np.float32)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', '48000', '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', dst], input=out.tobytes(), check=True)
