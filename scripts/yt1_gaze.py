"""Per-frame gaze scores (MediaPipe FaceLandmarker blendshapes) for the face cam.
Usage: yt1_gaze.py <video> <out.json> [fps]
Writes [{t, up, down, side, blink}] — eye-look scores 0..1 averaged over both eyes."""
import json, sys
import cv2, numpy as np, mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
src, out = sys.argv[1], sys.argv[2]
FPS = float(sys.argv[3]) if len(sys.argv) > 3 else 10
lm = vision.FaceLandmarker.create_from_options(vision.FaceLandmarkerOptions(
    base_options=BaseOptions(model_asset_path='yt1/models/face_landmarker.task'),
    running_mode=vision.RunningMode.VIDEO, output_face_blendshapes=True, num_faces=1))
cap = cv2.VideoCapture(src); vfps = cap.get(cv2.CAP_PROP_FPS); step = max(1, round(vfps / FPS))
res, i = [], 0
while True:
    ok, fr = cap.read()
    if not ok: break
    if i % step == 0:
        t = i / vfps
        crop = cv2.resize(fr[100:1080, 260:1240], (490, 490))
        img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(crop, cv2.COLOR_BGR2RGB))
        r = lm.detect_for_video(img, int(t * 1000))
        if r.face_blendshapes:
            b = {c.category_name: c.score for c in r.face_blendshapes[0]}
            up = (b['eyeLookUpLeft'] + b['eyeLookUpRight']) / 2
            down = (b['eyeLookDownLeft'] + b['eyeLookDownRight']) / 2
            # looking to one side = one eye "out" while the other is "in"
            side = max((b['eyeLookOutLeft'] + b['eyeLookInRight']) / 2, (b['eyeLookInLeft'] + b['eyeLookOutRight']) / 2)
            blink = (b['eyeBlinkLeft'] + b['eyeBlinkRight']) / 2
            res.append({'t': round(t, 2), 'up': round(up, 3), 'down': round(down, 3), 'side': round(side, 3), 'blink': round(blink, 3)})
        else:
            res.append({'t': round(t, 2), 'up': None, 'down': None, 'side': None, 'blink': None})
    i += 1
json.dump(res, open(out, 'w'))
print(len(res), 'frames')
