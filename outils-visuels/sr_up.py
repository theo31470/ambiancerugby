import cv2, numpy as np, sys
from PIL import Image
sr=cv2.dnn_superres.DnnSuperResImpl_create(); sr.readModel('sr/EDSR_x4.pb'); sr.setModel('edsr',4)
def up(src,dst):
    im=Image.open(src).convert('RGBA'); a=np.array(im); rgb=cv2.cvtColor(a[...,:3],cv2.COLOR_RGB2BGR)
    H,W=rgb.shape[:2]; T,P=180,12; out=np.zeros((H*4,W*4,3),np.uint8)
    for y in range(0,H,T):
        for x in range(0,W,T):
            y0,x0=max(0,y-P),max(0,x-P); y1,x1=min(H,y+T+P),min(W,x+T+P)
            r=sr.upsample(rgb[y0:y1,x0:x1]); oy,ox=(y-y0)*4,(x-x0)*4; h,w=min(T,H-y)*4,min(T,W-x)*4
            out[y*4:y*4+h,x*4:x*4+w]=r[oy:oy+h,ox:ox+w]
    rgbu=Image.fromarray(cv2.cvtColor(out,cv2.COLOR_BGR2RGB)).resize((W*2,H*2),Image.LANCZOS)
    al=im.getchannel('A').resize((W*2,H*2),Image.LANCZOS); rgbu.putalpha(al); rgbu.save(dst)
for s in sys.argv[1:]: up(f'/home/claude/theo31470/ambiancerugby/public/portraits/{s}.webp',f'/home/claude/gfx/up-{s}.png'); print('ok',s)
