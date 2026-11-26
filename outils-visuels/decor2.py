"""Décor club riche, sans noir. make(k, side, out)"""
import numpy as np, os, random
from PIL import Image, ImageFilter, ImageDraw
from decor import emblem, blur, SP
# clair, principal, profond (jamais noir), motif
PAL={'lou':((255,120,120),(214,16,45),(112,12,40),'diag'),
     'st':((255,105,95),(190,14,40),(92,10,30),'hoops'),
     'asm':((255,232,110),(246,196,0),(28,62,165),'bands'),
     'rct':((255,110,100),(214,14,48),(118,10,36),'rays')}
def make(k,side,out,W=1070,H=2700,seed=3):
    L,M,D,pat=[np.array(c,np.float32)/255 if isinstance(c,tuple) else c for c in PAL[k]]
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32); u,v=xx/W,yy/H
    # 1) dégradé principal : clair en haut (projecteur), principal au centre, profond en bas
    t=np.clip(v*1.15,0,1)[...,None]
    base=np.where(t<.45,L*(1-t/.45)+M*(t/.45),M*(1-(t-.45)/.55)+D*((t-.45)/.55))
    if k=='asm':   # jaune en haut, bleu en bas
        base=np.where(t<.55,L*(1-t/.55)+M*(t/.55),M*(1-(t-.55)/.45)+D*((t-.55)/.45))
    # 2) photo du stade en lumière douce pour le détail
    src=Image.open(f'{SP}/bg/twk-nuit.png').convert('L'); sw,sh=src.size; cw=int(sh*W/H)
    x0=80 if side=='l' else sw-cw-80
    st=np.array(src.crop((x0,0,x0+cw,sh)).resize((W,H),Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)/255
    st=(st-st.mean())*1.6+.5
    base=np.where(st[...,None]<.5,2*base*st[...,None],1-2*(1-base)*(1-st[...,None]))*.55+base*.45
    # 3) motif maillot
    if pat=='diag':  m=((xx*.7+yy*.7)%120<52)
    elif pat=='hoops': m=(yy%150<60)
    elif pat=='bands': m=(yy%220<70)
    else:
        ang=np.arctan2(yy+400,xx-W*(.15 if side=='l' else .85)); m=(np.floor(ang*28)%2==0)
    mm=blur(m.astype(np.float32),2)[...,None]
    tone=D if k!='asm' else np.array([.1,.24,.62],np.float32)
    base=base*(1-mm*.22)+tone*mm*.22
    # 4) éclats géométriques (calques papier) avec ombres
    rnd=random.Random(seed+(0 if side=='l' else 7))
    def poly(pts,col,alpha,sh=True):
        nonlocal base
        im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon(pts,fill=255); a=np.array(im).astype(np.float32)/255
        if sh: s=blur(np.roll(np.roll(a,30,0),18,1),26); base=base*(1-.28*s[...,None])
        a=blur(a,1.2)[...,None]; base=base*(1-a*alpha)+np.array(col,np.float32)*a*alpha
    for _ in range(5):
        cx,cy=rnd.uniform(-.1,1.1)*W,rnd.uniform(.05,.95)*H; r=rnd.uniform(.18,.42)*W; n=rnd.choice([3,4])
        pts=[(cx+r*np.cos(a0),cy+r*1.3*np.sin(a0)) for a0 in sorted(rnd.uniform(0,6.28) for _ in range(n))]
        col=rnd.choice([L,M,D]); poly(pts,col,rnd.uniform(.35,.6))
    # bande diagonale lumineuse
    poly([(-100,H*.36),(W+100,H*.22),(W+100,H*.27),(-100,H*.41)],np.minimum(L*1.1+.1,1),.55)
    # 5) trame de points (halftone) en bas
    cell=22; gy,gx=(yy%cell)-cell/2,(xx%cell)-cell/2; rad=(cell*.48)*np.clip((v-.55)/.45,0,1)
    dots=(gx**2+gy**2<rad**2).astype(np.float32); dots=blur(dots,.8)[...,None]
    base=base*(1-dots*.22)+np.minimum(L+.15,1)*dots*.22
    # 6) emblème 3D
    E=emblem(k,int(W*1.0)); eh,ew=E.shape[:2]; ex=(W-ew)//2+(-140 if side=='l' else 140); ey=int(H*.10)
    pad=np.zeros((H+2*ew,W+2*ew,4),np.float32); pad[ey+ew:ey+ew+eh,ex+ew:ex+ew+ew]=E; E=pad[ew:ew+H,ew:ew+W]
    g=blur(E[...,3],50)[...,None]; base=1-(1-base)*(1-g*np.minimum(L+.2,1)*.5)
    s=blur(np.roll(np.roll(E[...,3],26,0),20,1),24)[...,None]; base=base*(1-.30*s)
    al=E[...,3:4]*.62; base=base*(1-al)+E[...,:3]*al
    # 7) faisceaux + lens flares
    for bx,ang,wid,amp in [(.2,.25,.04,.5),(.6,-.1,.03,.6),(.92,-.35,.035,.4)]:
        bx=bx if side=='l' else 1-bx; ang=ang if side=='l' else -ang
        d=(xx-(bx*W+np.tan(ang)*yy))/(W*(wid+v*.07)); beam=np.exp(-d**2)*np.clip(1-v/0.8,0,1)*amp
        base=1-(1-base)*(1-beam[...,None]*np.array([1,.97,.9]))
    for fx,fy,fr,fa in [(.78,.06,.22,.7),(.3,.48,.08,.35),(.62,.7,.05,.3)]:
        fx=fx if side=='l' else 1-fx; d2=((xx-fx*W)**2+(yy-fy*H)**2)/(fr*W)**2
        base=1-(1-base)*(1-np.exp(-d2)[...,None]*fa*np.minimum(L+.3,1))
    # 8) bokeh
    for _ in range(26):
        bx,by,br=rnd.uniform(0,W),rnd.uniform(0,H*.75),rnd.uniform(8,34)
        d2=((xx-bx)**2+(yy-by)**2)/br**2; b=(np.clip(1-d2,0,1)**.5)*rnd.uniform(.1,.28)
        base=1-(1-base)*(1-b[...,None]*np.minimum(L+.35,1))
    # 9) papier + grain, plancher de luminosité (pas de noir)
    paper=blur(np.random.default_rng(seed).random((H,W)).astype(np.float32),1.5); base*= (0.94+0.12*paper)[...,None]
    lum=(base@np.array([.3,.59,.11],np.float32))[...,None]; base=np.clip(lum+(base-lum)*1.35,0,1)   # saturation
    base=np.clip((base-.5)*1.12+.5,0,1)
    base=np.maximum(base,D*.85)
    Image.fromarray((np.clip(base,0,1)*255).astype(np.uint8)).save(out)
if __name__=='__main__':
    import sys; make(sys.argv[1],sys.argv[2],sys.argv[3])
