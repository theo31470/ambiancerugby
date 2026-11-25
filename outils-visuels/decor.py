"""Décor photo par club (stade flou étalonné, fumée, faisceaux, emblème 3D). make(k, side, out, W=1070, H=2700)"""
import numpy as np, os, random
from PIL import Image, ImageFilter
SP=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COL={'lou':((226,16,47),(20,8,11)),'st':((200,16,46),(10,10,12)),'asm':((247,198,0),(20,48,140)),'rct':((213,12,47),(12,12,12)),
     'ubb':((150,40,90),(30,10,25)),'mhr':((40,110,200),(8,30,80)),'sr':((245,196,0),(15,15,15)),'usap':((230,170,30),(170,20,40)),
     'r92':((130,180,230),(15,40,90)),'sp':((20,130,70),(5,40,22)),'sfp':((230,0,126),(10,30,90)),'rcv':((40,70,160),(8,20,60)),
     'bay':((90,170,225),(20,60,110)),'co':((40,90,190),(10,30,90))}
def blur(a,r): return np.array(Image.fromarray(np.clip(a*255,0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)/255
def gmap(lum,stops):
    xs=np.linspace(0,1,len(stops)); out=np.zeros(lum.shape+(3,),np.float32)
    for c in range(3): out[...,c]=np.interp(lum,xs,[s[c] for s in stops])
    return out
def emblem(k,size):
    """logo en relief : éclairage d'après le masque alpha (biseau doux + spéculaire)"""
    im=Image.open(f'{SP}/clubs/{k}.png').convert('RGBA'); r=size/max(im.size); im=im.resize((int(im.width*r),int(im.height*r)),Image.LANCZOS)
    a=np.array(im).astype(np.float32)/255; M=a[...,3]
    Hm=blur(M,size/90); gy,gx=np.gradient(Hm); n=np.dstack([-gx*14,-gy*14,np.ones_like(M)]); n/=np.linalg.norm(n,axis=2,keepdims=True)
    L=np.array([-.5,-.7,.5]); L/=np.linalg.norm(L); d=n@L; flat=L[2]
    rgb=a[...,:3]*(0.78+1.6*(d-flat))[...,None]; spec=np.clip((d-flat-.08)*4,0,1)**2
    rgb=rgb+spec[...,None]*.9
    return np.dstack([np.clip(rgb,0,1),M])
def make(k,side,out,W=1070,H=2700,seed=1):
    c1,c2=[np.array(c,np.float32)/255 for c in COL[k]]
    src=Image.open(f'{SP}/bg/twk-nuit.png').convert('RGB')
    sw,sh=src.size; cw=int(sh*W/H*1.0)
    x0=60 if side=='l' else sw-cw-60
    st=src.crop((x0,0,x0+cw,sh)).resize((W,H),Image.LANCZOS).filter(ImageFilter.GaussianBlur(18))
    s=np.array(st).astype(np.float32)/255; lum=(s@np.array([.3,.59,.11],np.float32))
    # étalonnage club : noir -> couleur 2 -> couleur 1 -> blanc chaud
    base=gmap(np.clip(lum*1.25,0,1),[(0,0,0),tuple(c2*.55),tuple(c1*.85),tuple(np.minimum(c1*1.1+.35,1)),(1,.97,.9)])
    yy,xx=np.mgrid[0:H,0:W].astype(np.float32)
    # assombrir le bas, garder la lumière en haut (zone tribunes)
    base*=(1.0-0.55*np.clip((yy/H-.35)/.6,0,1))[...,None]
    # fumée
    rng=np.random.default_rng(seed)
    sm=sum(blur(rng.random((H//s_,W//s_)).astype(np.float32),2) for s_ in [1]) if False else None
    n1=np.array(Image.fromarray((rng.random((H//40,W//40))*255).astype(np.uint8)).resize((W,H),Image.BICUBIC)).astype(np.float32)/255
    n2=np.array(Image.fromarray((rng.random((H//12,W//12))*255).astype(np.uint8)).resize((W,H),Image.BICUBIC)).astype(np.float32)/255
    smoke=np.clip((n1*.7+n2*.3-.45)*2.2,0,1)*np.exp(-((yy/H-.55)/.28)**2)
    base=1-(1-base)*(1-smoke[...,None]*np.minimum(c1*.6+.15,1)*.55)
    # faisceaux de projecteurs depuis le haut
    for bx,ang,wid,amp,col in [(W*.15,.30,.035,.55,c1),(W*.55,-.12,.025,.7,np.array([1,.97,.9])),(W*.9,-.38,.03,.45,c1),(W*.35,.08,.015,.4,np.array([1,1,1]))]:
        if side=='r': bx=W-bx; ang=-ang
        dxv=(xx-(bx+np.tan(ang)*yy))/ (W*(wid+yy/H*.06))
        beam=np.exp(-dxv**2)*np.clip(1-yy/(H*.85),0,1)*amp
        base=1-(1-base)*(1-beam[...,None]*col)
    # emblème 3D
    E=emblem(k,int(W*1.05)); eh,ew=E.shape[:2]; ex=(W-ew)//2+(-150 if side=='l' else 150); ey=int(H*.09)
    ex=max(min(ex,W-ew//2),-ew//2)
    pad=np.zeros((H+2*ew,W+2*ew,4),np.float32); pad[ey+ew:ey+ew+eh,ex+ew:ex+ew+ew]=E; E=pad[ew:ew+H,ew:ew+W]; ey,ex,eh,ew=0,0,H,W
    glowm=E[...,3].copy()
    g=blur(glowm,40)
    base=1-(1-base)*(1-g[...,None]*c1*.75)                          # halo couleur club
    sh=np.roll(np.roll(E[...,3],24,0),18,1); sh=blur(sh,22)
    base*=1-.55*sh[...,None]                                         # ombre portée de l'emblème
    reg=base[ey:ey+eh,ex:ex+ew]; al=E[...,3:4]*.62
    base[ey:ey+eh,ex:ex+ew]=reg*(1-al)+E[...,:3]*al
    # brume basse + vignette
    base=base*(1-.35*np.clip((yy/H-.55)/.4,0,1))[...,None]
    v=((xx/W-.5)**2*1.6+(yy/H-.42)**2*1.1); base*=np.clip(1-.75*v,0,1)[...,None]
    Image.fromarray((np.clip(base,0,1)*255).astype(np.uint8)).save(out)
def camera_raw(path):
    """finition façon Camera Raw : clarté, vibrance, courbe, split-toning, vignette, grain"""
    im=Image.open(path).convert('RGB'); a=np.array(im).astype(np.float32)/255
    big=np.array(im.filter(ImageFilter.GaussianBlur(28))).astype(np.float32)/255
    a=np.clip(a+(a-big)*.45,0,1)                                     # clarté
    lum=a@np.array([.3,.59,.11],np.float32)
    sat=a-lum[...,None]; a=np.clip(lum[...,None]+sat*(1.12+.25*(1-np.abs(sat).max(-1,keepdims=True))),0,1)   # vibrance
    a=np.clip((a-.5)*1.08+.5,0,1); a=a**1.04                         # courbe en S légère
    sh=(1-lum)[...,None]**2; hi=lum[...,None]**2
    a=np.clip(a+sh*np.array([-.01,.0,.03])+hi*np.array([.035,.02,-.01]),0,1)   # ombres froides, hautes lumières chaudes
    H,W=lum.shape; yy,xx=np.mgrid[0:H,0:W]; v=((xx/W-.5)**2+(yy/H-.45)**2*.9); a*=np.clip(1-.55*v,0,1)[...,None]
    a+=np.random.default_rng(3).normal(0,.016,a.shape[:2])[...,None]
    Image.fromarray((np.clip(a,0,1)*255).astype(np.uint8)).save(path)
if __name__=='__main__':
    import sys; make(sys.argv[1],sys.argv[2],sys.argv[3])

def camera_raw_rgba(src,dst):
    """Camera Raw sur un portrait détouré : clarté, texture, vibrance, courbe, split-toning (alpha conservé)"""
    im=Image.open(src).convert('RGBA'); al=im.getchannel('A'); rgb=im.convert('RGB')
    a=np.array(rgb).astype(np.float32)/255
    big=np.array(rgb.filter(ImageFilter.GaussianBlur(22))).astype(np.float32)/255
    mid=np.array(rgb.filter(ImageFilter.GaussianBlur(3))).astype(np.float32)/255
    a=np.clip(a+(a-big)*.18,0,1)                                      # clarté douce, sans texture
    lum=a@np.array([.3,.59,.11],np.float32); sat=a-lum[...,None]
    a=np.clip(lum[...,None]+sat*(1.15+.3*(1-np.clip(np.abs(sat).max(-1,keepdims=True)*3,0,1))),0,1)  # vibrance
    a=np.clip((a-.5)*1.06+.5,0,1)                                   # contraste
    sh=(1-lum)[...,None]**2; hi=lum[...,None]**2
    a=np.clip(a+sh*np.array([-.015,0,.03])+hi*np.array([.04,.02,-.01]),0,1)
    out=Image.fromarray((a*255).astype(np.uint8)); out.putalpha(al); out.save(dst)
