"""Thème XV de France (bleu nuit / rouge / blanc, étalonnage bicolore, collage lumineux).
python3 xvdf.py compo data.json out.png"""
import asyncio, json, os, sys, random, numpy as np
from PIL import Image, ImageFilter, ImageDraw
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.dirname(HERE)
R='/home/claude/theo31470/ambiancerugby'; PORT=f'{R}/public/portraits'; BS=f'{SP}/fonts-bs/package/files'; L=f'{SP}/lit'; G='/home/claude/gfx'
NAVY,BLUE,RED,WHITE,CRE='#06103a','#1d3fb0','#e2303e','#ffffff','#f4e9dc'
STOPS=[(8,16,70),(196,34,52),(255,222,210)]          # ombres bleues -> rouge -> lumière chair
def grade(img,mix=.62):
    a=np.array(img.convert('RGBA')).astype(np.float32); rgb=a[...,:3]
    lum=((rgb@np.array([.3,.59,.11],dtype=np.float32))/255).clip(0,1)**.8
    s0,s1,s2=[np.array(s,np.float32) for s in STOPS]; t=lum[...,None]
    gm=np.where(t<.5,s0+(s1-s0)*(t/.5),s1+(s2-s1)*((t-.5)/.5)); o=rgb*(1-mix)+gm*mix; o=(o-128)*1.12+128
    a[...,:3]=o.clip(0,255); return Image.fromarray(a.astype(np.uint8))
def head(slug):
    out=f'{G}/xv-{slug}.png'
    if not os.path.exists(out):
        im=Image.open(f'{PORT}/{slug}.webp').convert('RGBA').crop((90,0,510,430)); im.save(out)
    return out
def bigface(name):
    out=f'{G}/xv-big-{name}.png'; grade(Image.open(f'{L}/{name}.png'),.7).save(out); return out
CSS=f'''@font-face{{font-family:"BS";src:url(file://{BS}/big-shoulders-display-latin-900-normal.woff2);font-weight:900}}
@font-face{{font-family:"Shrik";src:url(file://{R}/src/app/fonts/shrikhand.woff2)}}
@font-face{{font-family:"Bricolage";src:url(file://{R}/src/app/fonts/bricolage.woff2);font-weight:200 800}}
*{{margin:0;box-sizing:border-box}} body{{background:#000}}
.p{{position:relative;width:1080px;height:1350px;overflow:hidden;font-family:Bricolage;background:{NAVY};color:#fff}}
.a{{position:absolute}} .d{{font-family:BS;font-weight:900;text-transform:uppercase;line-height:.84}}
.l{{font-family:Bricolage;font-weight:700;letter-spacing:.3em;text-transform:uppercase}}'''
def poly(pts,fill,op=1,blend='screen'): return f'<div class="a" style="inset:0;clip-path:polygon({",".join(f"{x}px {y}px" for x,y in pts)});background:{fill};opacity:{op};mix-blend-mode:{blend}"></div>'
def layer(pts,fill,op=1,sh='0 18px 28px rgba(0,0,0,.55)',z=0):
    return (f'<div class="a" style="inset:0;filter:drop-shadow({sh});opacity:{op};z-index:{z}"><div class="a" style="inset:0;clip-path:polygon({",".join(f"{x}px {y}px" for x,y in pts)});background:{fill}"></div></div>')
def background(face='dupont2'):
    rnd=random.Random(8)
    bok=''.join(f'<div class="a" style="left:{x-r}px;top:{y-r}px;width:{2*r}px;height:{2*r}px;border-radius:50%;background:radial-gradient(rgba(150,200,255,.55),rgba(150,200,255,0) 70%);border:1px solid rgba(170,215,255,.35);mix-blend-mode:screen"></div>' for x,y,r in [(980,90,30),(1030,200,18),(60,560,22),(40,250,28),(1010,700,20)])
    return ('<div class="a" style="inset:0;background:radial-gradient(60% 45% at 70% 18%,#c81f33 0,#8e1530 45%,transparent 100%),radial-gradient(70% 55% at 0% 55%,#1d4fd6 0,#0f2c8c 55%,transparent 100%),radial-gradient(60% 40% at 100% 100%,#a11a2e 0,transparent 100%),linear-gradient(#0a1a5c,#06103a 55%,#040a26)"></div>'
      + layer([(640,-40),(1120,300),(760,560),(320,250)],'linear-gradient(135deg,#ff4a55,#b3142a)',.6)
      + layer([(0,40),(300,0),(380,160),(80,260)],'linear-gradient(160deg,rgba(255,255,255,.35),rgba(255,255,255,.08))',.9,'0 14px 22px rgba(0,0,0,.35)')
      + layer([(880,1000),(1080,940),(1080,1080),(930,1110)],'linear-gradient(160deg,rgba(60,130,255,.55),rgba(20,50,160,.4))',.8)
      + f'<img class="a" src="file://{bigface(face)}" style="left:440px;top:-140px;width:820px;height:900px;object-fit:cover;object-position:50% 0;opacity:.5;-webkit-mask-image:radial-gradient(ellipse 50% 45% at 50% 32%,#000 25%,transparent 100%)">'
      + '<div class="a" style="left:-40px;top:0;width:180px;height:1350px;background:linear-gradient(90deg,rgba(255,255,255,.7),transparent);opacity:.35;mix-blend-mode:screen"></div>'
      + '<div class="a" style="left:-200px;top:520px;width:1600px;height:46px;transform:rotate(-14deg);background:linear-gradient(90deg,transparent,rgba(29,63,176,.35) 20%,rgba(255,255,255,.22) 50%,rgba(226,48,62,.35) 80%,transparent);filter:blur(2px);mix-blend-mode:screen"></div>'
      + '<div class="a" style="left:0;top:0;width:10px;height:1350px;background:linear-gradient(#1d3fb0 0 33.3%,#fff 33.3% 66.6%,#e2303e 66.6%)"></div>'
      )
def finish(path):
    im=Image.open(path).convert('RGB'); a=np.array(im).astype(np.float32); h,w,_=a.shape; rng=np.random.default_rng(7)
    a=(a-128)*1.05+128; a+=rng.normal(0,5,a.shape[:2])[...,None]
    d=Image.new('L',(w,h),0); dr=ImageDraw.Draw(d); r=random.Random(3)
    for _ in range(70):
        x,y=r.randint(0,w),r.randint(0,h); L_=r.randint(40,240); ang=r.uniform(-.9,-.5)
        dr.line([(x,y),(x+L_*np.cos(ang),y+L_*np.sin(ang))],fill=r.randint(50,130),width=r.choice([1,1,2]))
    for _ in range(380):
        x,y=r.randint(0,w),r.randint(0,h); rr=r.choice([1,1,2,3]); dr.ellipse([x-rr,y-rr,x+rr,y+rr],fill=r.randint(40,150))
    d=np.array(d.filter(ImageFilter.GaussianBlur(.8))).astype(np.float32)[...,None]
    Image.fromarray((a+d*.4).clip(0,255).astype(np.uint8)).save(path)
# ---------------- COMPO ----------------
POS={1:(240,338),2:(540,338),3:(840,338),4:(390,469),5:(690,469),6:(180,600),8:(540,600),7:(900,600),
     9:(410,731),10:(650,731),11:(110,862),12:(310,862),13:(780,862),14:(970,862),15:(540,990)}
def medal(slug,size):
    """tête qui sort du médaillon : visible dans le cercle + tout ce qui dépasse au-dessus du centre"""
    out=f'{G}/xvm-{slug}-{size}.png'
    if os.path.exists(out): return out
    k=2; W,H=int(1.2*size*k),int(1.32*size*k); r=size*k/2; cx,cy=W/2,H-r
    hd=Image.open(head(slug)); hw=int(W*.98); hh=int(hd.height*hw/hd.width); hd=hd.resize((hw,hh),Image.LANCZOS)
    can=Image.new('RGBA',(W,H),(0,0,0,0)); can.paste(hd,((W-hw)//2,H-hh+int(.10*size*k)),hd)
    yy,xx=np.mgrid[0:H,0:W]; inside=((xx-cx)**2+(yy-cy)**2)<=(r*.96)**2; above=yy<cy-r*.15
    a=np.array(can); a[...,3]=(a[...,3]*(inside|above)).astype(np.uint8); Image.fromarray(a).save(out); return out
def player(n,slug,name,x,y,size=100,cap=False,small=False):
    fs=(23 if len(name)<11 else 19) if not small else (19 if len(name)<11 else 16)
    capb=f'<span style="background:{RED};color:#fff;font-size:{fs-4}px;padding:2px 5px 0;margin-left:6px;border-radius:2px">C</span>' if cap else ''
    return (f'<div class="a" style="left:{x-size/2}px;top:{y-size/2}px;width:{size}px;height:{size}px">'
            f'<div class="a" style="inset:0;border-radius:50%;background:radial-gradient(circle at 50% 30%,#2a55d8,#0b1d5c 70%);box-shadow:0 0 0 3px rgba(255,255,255,.95),0 0 0 6px {RED},0 0 26px rgba(226,48,62,.5),0 16px 26px rgba(0,0,0,.7),0 30px 40px -10px rgba(0,0,0,.5),inset 0 -10px 18px rgba(0,0,0,.45),inset 0 4px 8px rgba(255,255,255,.25)"></div>'
            f'<img class="a" src="file://{medal(slug,size)}" style="left:{-.1*size}px;bottom:0;width:{1.2*size}px;height:{1.32*size}px;filter:drop-shadow(0 6px 8px rgba(0,0,0,.55)) drop-shadow(0 0 1px rgba(0,0,0,.6))">'
            f'<div class="a d" style="left:-8px;top:-2px;width:{size*.36:.0f}px;height:{size*.36:.0f}px;border-radius:50%;background:{RED};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:{size*.21:.0f}px;padding-top:2px;box-shadow:0 4px 10px rgba(0,0,0,.5);z-index:2">{n}</div>'
            f'<div class="a" style="left:50%;top:{size+7}px;transform:translateX(-50%);z-index:2;filter:drop-shadow(0 8px 10px rgba(0,0,0,.55))">'
            f'<div class="a d" style="left:4px;top:4px;white-space:nowrap;font-size:{fs}px;padding:5px 10px 3px;background:{RED};color:transparent;clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)">{name}{capb}</div>'
            f'<div class="d" style="position:relative;white-space:nowrap;font-size:{fs}px;padding:5px 10px 3px;background:linear-gradient(#fff,#e9ecf5);color:{NAVY};clip-path:polygon(6px 0,100% 0,calc(100% - 6px) 100%,0 100%)">{name}{capb}</div></div></div>')
def compo(D,OUT):
    cap=D.get('capitaine')
    HDR=(f'<div class="a l" style="left:52px;top:50px;font-size:13px;color:#fff;opacity:.9">Finale du Nations Championship · <span style="background:{RED};padding:3px 8px">vs Afrique du Sud</span></div>'
      f'<div class="a" style="left:46px;top:74px"><span style="position:absolute;left:6px;top:-4px;font-family:Shrik;font-size:58px;color:{RED};transform:rotate(-7deg);text-shadow:0 0 18px rgba(0,0,0,.4),0 6px 14px rgba(0,0,0,.5);white-space:nowrap;z-index:2">La compo</span>'
      f'<div class="d" style="font-size:150px;padding-top:50px;color:#fff;text-shadow:3px 3px 0 #e9ecf5,6px 6px 0 {RED},9px 9px 0 #8e1530,12px 14px 18px rgba(0,0,0,.55),0 0 50px rgba(120,160,255,.35)">XV de France</div></div>'
      )
    nob=not D.get('banc')
    def pos(n):
        x,y=POS[n]
        return (x,340+(y-338)*1.17+20) if nob else (x,y)
    XV=''.join(player(int(n),s,nm,*pos(int(n)),size=(108 if nob else 100),cap=int(n)==cap) for n,(s,nm) in D['xv'].items())
    BENCH=(f'<div class="a" style="left:36px;right:36px;top:1104px;height:166px;background:linear-gradient(180deg,rgba(20,40,120,.75),rgba(6,14,50,.85));border-top:3px solid #fff;box-shadow:0 -6px 0 rgba(226,48,62,.9),0 24px 40px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.2)"></div>'
      f'<div class="a d" style="left:36px;top:1084px;font-size:24px;background:{RED};padding:6px 12px 3px">Sur le banc</div>'
      + ''.join(player(int(n),s,nm,100+i*126,1168,size=72,small=True) for i,(n,(s,nm)) in enumerate(D['banc'].items())))
    if nob: BENCH=''
    FOOT=(f'<div class="a" style="left:52px;right:52px;top:1282px;height:46px;display:grid;grid-template-columns:1fr 70px 1fr;align-items:center">'
      f'<span class="d" style="font-size:28px">Dim. 29 nov.</span><img src="file://{R}/public/logo-blanc.png" style="height:44px;width:70px;object-fit:contain">'
      f'<span class="d" style="font-size:28px;text-align:right"><span style="color:{RED}">17h40</span> · Twickenham</span></div>')
    VIG='<div class="a" style="inset:0;background:radial-gradient(130% 100% at 50% 45%,transparent 60%,rgba(0,0,0,.55))"></div>'
    LINES=f'<img class="a" src="file://{pitch_png(True)}" style="inset:0;width:1080px;height:1350px;-webkit-mask-image:linear-gradient(transparent 18%,#000 34%,#000 70%,transparent 82%)">'
    GHOST=(f'<div class="a" style="left:190px;top:330px;width:700px;height:700px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.10),transparent);mix-blend-mode:screen"></div>'
           f'<img class="a" src="file://{SP}/logos-nat/fra-w.png" style="left:329px;top:300px;height:720px;opacity:.13;filter:drop-shadow(0 0 30px rgba(255,255,255,.5))">')
    render(f'<div class="p">{background()}{GHOST}{LINES}{VIG}{HDR}{XV}{BENCH}{FOOT}</div>',OUT)
def render(PAGE,OUT):
    async def main():
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            br=await p.chromium.launch(args=["--allow-file-access-from-files"]); f=f'{HERE}/xvdf.html'
            open(f,'w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{PAGE}</body></html>')
            pg=await br.new_page(viewport={'width':1080,'height':1350},device_scale_factor=2); await pg.goto(f'file://{f}'); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(600)
            await pg.screenshot(path=OUT); await br.close()
    asyncio.run(main()); finish(OUT); print('ok',OUT)

# ---------------- TERRAIN VIRTUEL ----------------
K,Z0,C,YH=3250,190.0,190.0,-2169.0          # projection : s=K/(z+Z0), X=540+x*s, Y=YH+C*s
def proj(x,z): s=K/(z+Z0); return 540+x*s, YH+C*s, s
def pitch_png(lines_only=False):
    out=f'{G}/xv-pitch{"-l" if lines_only else ""}.png'
    if os.path.exists(out): return out
    k=2; W,H=1080*k,1350*k; yy,xx=np.mgrid[0:H,0:W].astype(np.float32); X,Y=xx/k,yy/k
    s=(Y-YH)/C; s=np.where(s>0,s,1e-3); z=K/s-Z0; x=(X-540)/s; px=1/s/k          # px = mètres par pixel
    on=(z>-8)&(z<67)
    def line(d,w=.12): return np.clip(1-(np.abs(d)-w)/np.maximum(px*1.2,1e-3),0,1)
    L=np.zeros_like(X)
    for zl,dash in [(62,0),(52,0),(37,0),(22,0),(47,1),(27,1),(12,1),(2,0)]:
        m=line(z-zl,.14 if zl in (62,37) else .1)
        if dash: m*= (np.mod(x,4)<2.2)
        L=np.maximum(L,m)
    L=np.maximum(L,line(np.abs(x)-35,.14)*((z>-8)&(z<66)))
    for xv in (30,20): L=np.maximum(L,line(np.abs(x)-xv,.08)*(np.mod(z,5)<1.2))    # tirets 5 m / 15 m
    L*=on*(np.abs(x)<35.3)
    stripes=(np.floor((z+100)/5)%2)
    base=np.zeros((H,W,4),np.float32)
    col=np.where(stripes[...,None]>0,np.array([14,34,110],np.float32),np.array([10,24,84],np.float32))
    inside=(np.abs(x)<35)&on
    fade=np.clip((66-z)/14,0,1)*np.clip((z+8)/10,0,1)*np.clip((38-np.abs(x))/6,0,1)
    base[...,:3]=col; base[...,3]=inside*fade*255*(0 if lines_only else .92)
    img=Image.fromarray(base.clip(0,255).astype(np.uint8))
    # lignes lumineuses
    lm=Image.fromarray((L*fade*255).astype(np.uint8))
    glow=np.array(lm.filter(ImageFilter.GaussianBlur(6))).astype(np.float32)/255
    a=np.array(img).astype(np.float32)
    Lf=(L*fade)[...,None]; G2=(glow*1.6)[...,None]
    a[...,:3]=a[...,:3]*(1-Lf)+np.array([235,242,255],np.float32)*Lf + np.array([90,140,255],np.float32)*G2*.6
    a[...,3]=np.maximum(a[...,3],np.clip(Lf[...,0]*255+G2[...,0]*120,0,255)*(.32 if lines_only else 1))
    # lumière centrale sur la pelouse
    spot=np.exp(-(((X-540)/420)**2+((Y-700)/380)**2))
    if not lines_only: a[...,:3]+=np.array([60,90,200],np.float32)*spot[...,None]*.35*(a[...,3:4]/255)
    Image.fromarray(a.clip(0,255).astype(np.uint8)).save(out); return out
ZX={1:(-10,60),2:(0,60),3:(10,60),4:(-5,48),5:(5,48),6:(-15,37),8:(0,37),7:(15,37),9:(-6,26),10:(7,25),
    12:(-12,15),13:(12,15),11:(-28,13),14:(28,13),15:(0,5)}
def player_on(n,slug,name,cap=False):
    x,y,s=proj(*ZX[n]); s0,s1=K/(60+Z0),K/(5+Z0); t=(s-s0)/(s1-s0); size=int(62+t*40)
    shadow=f'<div class="a" style="left:{x-size*.55}px;top:{y+size*.42}px;width:{size*1.1}px;height:{size*.28}px;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.65),transparent);"></div>'
    ring=f'<div class="a" style="left:{x-size*.7}px;top:{y+size*.36}px;width:{size*1.4}px;height:{size*.4}px;border-radius:50%;border:2px solid rgba(226,48,62,.85);box-shadow:0 0 14px rgba(226,48,62,.8),inset 0 0 10px rgba(226,48,62,.6)"></div>'
    return shadow+ring+player(n,slug,name,x,y-size*.12,size=size,cap=cap)
def ffr_logo(x=935,y=34,h=150):
    cx,cy=x+h*.29,y+h*.4
    return (f'<div class="a" style="left:{cx-150}px;top:{cy-150}px;width:300px;height:300px;background:conic-gradient(from 0deg,'+','.join(f'transparent {a}deg,rgba(255,255,255,.22) {a+4}deg,transparent {a+9}deg' for a in range(0,360,20))+');-webkit-mask-image:radial-gradient(closest-side,#000 10%,transparent 100%);mix-blend-mode:screen;z-index:6"></div>'
      f'<div class="a" style="left:{cx-130}px;top:{cy-130}px;width:260px;height:260px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.5),rgba(120,160,255,.22) 45%,transparent);mix-blend-mode:screen;z-index:6"></div>'
      f'<img class="a" src="file://{G}/ffr-logo.png" style="left:{x}px;top:{y}px;height:{h}px;z-index:7;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 16px rgba(255,255,255,.6)) drop-shadow(0 0 40px rgba(226,48,62,.7)) drop-shadow(0 10px 16px rgba(0,0,0,.6))">'
      f'<div class="a" style="left:{cx-220}px;top:{cy}px;width:440px;height:3px;background:linear-gradient(90deg,transparent,#fff 50%,transparent);box-shadow:0 0 18px 4px rgba(160,190,255,.8);mix-blend-mode:screen;opacity:.8;z-index:7"></div>'
      f'<div class="a" style="left:{cx+12}px;top:{y+4}px;width:14px;height:14px;background:radial-gradient(#fff,transparent 70%);box-shadow:0 0 22px 8px rgba(255,255,255,.7);z-index:7"></div>')
def compo3d(D,OUT):
    cap=D.get('capitaine')
    LOGO=(f'<div class="a" style="left:840px;top:-60px;width:300px;height:300px;background:conic-gradient(from 0deg,'+','.join(f'transparent {a}deg,rgba(255,255,255,.22) {a+4}deg,transparent {a+9}deg' for a in range(0,360,20))+');-webkit-mask-image:radial-gradient(closest-side,#000 10%,transparent 100%);mix-blend-mode:screen"></div>'
      f'<div class="a" style="left:860px;top:-20px;width:260px;height:260px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.55),rgba(120,160,255,.25) 45%,transparent);mix-blend-mode:screen"></div>'
      f'<img class="a" src="file://{G}/ffr-logo.png" style="left:935px;top:34px;height:150px;filter:drop-shadow(0 0 2px #fff) drop-shadow(0 0 16px rgba(255,255,255,.6)) drop-shadow(0 0 40px rgba(226,48,62,.7)) drop-shadow(0 10px 16px rgba(0,0,0,.6))">'
      f'<div class="a" style="left:760px;top:108px;width:420px;height:3px;background:linear-gradient(90deg,transparent,#fff 50%,transparent);box-shadow:0 0 18px 4px rgba(160,190,255,.8);mix-blend-mode:screen;opacity:.85"></div>'
      f'<div class="a" style="left:1001px;top:40px;width:14px;height:14px;background:radial-gradient(#fff,transparent 70%);box-shadow:0 0 22px 8px rgba(255,255,255,.7)"></div>')
    BEAMS=''.join(f'<div class="a" style="left:{x}px;top:{-60}px;width:1400px;height:1500px;transform-origin:0 0;transform:rotate({r}deg);background:conic-gradient(from -8deg at 0 0,transparent,rgba(200,220,255,.16) 8deg,transparent 16deg);mix-blend-mode:screen;filter:blur(6px)"></div>' for x,r in [(-40,30),(1120,124)])
    HDR=(f'<div class="a l" style="left:52px;top:50px;font-size:13px;color:#fff;opacity:.9">Finale du Nations Championship · <span style="color:#fff;background:{RED};padding:3px 8px">vs Afrique du Sud</span></div>'
      f'<div class="a" style="left:46px;top:74px"><span style="position:absolute;left:6px;top:-4px;font-family:Shrik;font-size:58px;color:{RED};transform:rotate(-7deg);text-shadow:0 6px 14px rgba(0,0,0,.5);white-space:nowrap;z-index:2">La compo</span>'
      f'<div class="d" style="font-size:146px;padding-top:50px;color:#fff;text-shadow:6px 6px 0 {RED},0 0 50px rgba(120,160,255,.45),0 18px 30px rgba(0,0,0,.6)">XV de France</div></div>'
)
    order=[1,2,3,4,5,6,8,7,9,10,12,13,11,14,15]
    XV=''.join(player_on(n,*D['xv'][str(n)],cap=n==cap) for n in order)
    BENCH=(f'<div class="a" style="left:0;right:0;top:1078px;height:200px;background:linear-gradient(180deg,rgba(4,10,38,0),rgba(4,10,38,.92) 22%);"></div>'
      f'<div class="a" style="left:36px;right:36px;top:1100px;height:158px;background:linear-gradient(180deg,rgba(255,255,255,.10),rgba(255,255,255,.03));border-top:3px solid #fff;backdrop-filter:blur(6px)"></div>'
      f'<div class="a d" style="left:36px;top:1080px;font-size:24px;background:{RED};padding:6px 12px 3px">Sur le banc</div>'
      + ''.join(player(int(n),s,nm,100+i*126,1160,size=60,small=True) for i,(n,(s,nm)) in enumerate(D['banc'].items())))
    FOOT=(f'<div class="a" style="left:52px;right:52px;top:1284px;height:46px;display:grid;grid-template-columns:1fr 70px 1fr;align-items:center">'
      f'<span class="d" style="font-size:28px">Dim. 29 nov.</span><img src="file://{R}/public/logo-blanc.png" style="height:44px;width:70px;object-fit:contain">'
      f'<span class="d" style="font-size:28px;text-align:right"><span style="color:{RED}">17h40</span> · Twickenham</span></div>')
    BG=('<div class="a" style="inset:0;background:radial-gradient(60% 35% at 75% 6%,#c81f33 0,#7a1430 45%,transparent 100%),radial-gradient(70% 45% at 0% 20%,#1d4fd6 0,#0f2c8c 55%,transparent 100%),linear-gradient(#0a1a5c,#06103a 40%,#030820)"></div>'
      + poly([(0,40),(300,0),(380,160),(80,260)],'rgba(255,255,255,.5)',.3)
      + '<div class="a" style="left:0;top:0;width:10px;height:1350px;background:linear-gradient(#1d3fb0 0 33.3%,#fff 33.3% 66.6%,#e2303e 66.6%);z-index:5"></div>')
    PITCH=f'<img class="a" src="file://{pitch_png()}" style="inset:0;width:1080px;height:1350px">'
    HAZE='<div class="a" style="left:0;right:0;top:250px;height:220px;background:linear-gradient(rgba(6,16,58,.9),transparent);"></div>'
    VIG='<div class="a" style="inset:0;background:radial-gradient(130% 100% at 50% 45%,transparent 60%,rgba(0,0,0,.55))"></div>'
    render(f'<div class="p">{BG}{PITCH}{HAZE}{BEAMS}{VIG}{LOGO}{HDR}{XV}{BENCH}{FOOT}</div>',OUT)
if __name__=='__main__' and sys.argv[1]=='compo3d': compo3d(json.load(open(sys.argv[2])),sys.argv[3])

if __name__=='__main__' and sys.argv[1]=='compo': compo(json.load(open(sys.argv[2])),sys.argv[3])
