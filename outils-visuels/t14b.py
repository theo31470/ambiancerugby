"""Top 14 noir & or. python3 t14b.py prog|result data.json out.png"""
import asyncio, json, os, sys, random, numpy as np
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.dirname(HERE)
R='/home/claude/theo31470/ambiancerugby'; BS=f'{SP}/fonts-bs/package/files'
GO,GOL,GOD,BK,CRE='#d1ae66','#f6e3a6','#8a6a2a','#0a0907','#f4e9dc'
MODE,DATA,OUT=sys.argv[1],json.load(open(sys.argv[2])),sys.argv[3]
C={'ubb':('Bordeaux-Bègles','UBB','#a8336a','#3a0f22','#fff'),'mhr':('Montpellier','MHR','#1d5aa8','#0b2f66','#fff'),
 'sr':('La Rochelle','SR','#f4c400','#a07d00','#111'),'usap':('Perpignan','USAP','#e0a91c','#b0101e','#111'),
 'r92':('Racing 92','R92','#7fb2e5','#2f6aa6','#0b1d3a'),'sp':('Pau','SP','#0d7a40','#053a1d','#fff'),
 'sfp':('Stade Français','SFP','#e5007e','#0b1d5a','#fff'),'rcv':('Vannes','RCV','#1a3a8a','#0a1f55','#fff'),
 'bay':('Bayonne','BAY','#4fa3db','#1f6a9e','#fff'),'co':('Castres','CO','#2a58b8','#12306b','#fff'),
 'lou':('Lyon','LOU','#c8102e','#1a1f4a','#fff'),'st':('Toulouse','ST','#c8102e','#141414','#fff'),
 'asm':('Clermont','ASM','#f2c200','#1d3a8f','#14213d'),'rct':('Toulon','RCT','#c8102e','#141414','#fff')}
GOLDTXT=f'background:linear-gradient(180deg,{GOL} 0%,{GO} 42%,{GOD} 58%,#e9cf8a 78%,{GO} 100%);-webkit-background-clip:text;background-clip:text;color:transparent;'
CSS=f'''@font-face{{font-family:"BS";src:url(file://{BS}/big-shoulders-display-latin-900-normal.woff2);font-weight:900}}
@font-face{{font-family:"Shrik";src:url(file://{R}/src/app/fonts/shrikhand.woff2)}}
@font-face{{font-family:"Bricolage";src:url(file://{R}/src/app/fonts/bricolage.woff2);font-weight:200 800}}
*{{margin:0;box-sizing:border-box}} body{{background:#000}}
.p{{position:relative;width:1080px;height:1350px;overflow:hidden;font-family:Bricolage;background:{BK};color:{CRE}}}
.a{{position:absolute}} .d{{font-family:BS;font-weight:900;text-transform:uppercase;line-height:.84}}
.l{{font-family:Bricolage;font-weight:700;letter-spacing:.3em;text-transform:uppercase}}
.g{{{GOLDTXT}}}
.card{{position:absolute;overflow:hidden;border-radius:6px;background:linear-gradient(180deg,#1b1813,#0c0b09);box-shadow:0 26px 40px -12px rgba(0,0,0,.9),inset 0 0 0 1.5px rgba(209,174,102,.55),inset 0 1px 0 rgba(255,240,200,.35)}}
.card::after{{content:"";position:absolute;top:0;left:-20%;width:40%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,236,190,.10) 50%,transparent);transform:skewX(-20deg);pointer-events:none}}'''
def badge(k,s,ring=None):
    return (f'<img src="file://{SP}/clubs/{k}.png" style="width:{s}px;height:{s}px;object-fit:contain;flex:none;'
            f'filter:drop-shadow(0 0 1.5px rgba(255,240,200,.6)) drop-shadow(0 0 16px rgba(209,174,102,.35)) drop-shadow(0 10px 14px rgba(0,0,0,.75))">')
def glow(k,side,o=.55):
    c=C[k][2]; pos='0%' if side=='l' else '100%'
    return f'<div class="a" style="inset:0;background:radial-gradient(60% 120% at {pos} 50%,{c},transparent 70%);opacity:{o};mix-blend-mode:screen"></div>'
_fx=[0]
def fx(k,side,cx,cy,w,h,scale=1.0):
    """logo géant en fond + halo doux + liseré aux couleurs du club"""
    c1,c2=C[k][2],C[k][3]; sgn=1 if side=='l' else -1; edge='left:0' if side=='l' else 'right:0'
    G=max(h*1.9,230*scale); gx=cx-sgn*G*.12; rot=-12*sgn
    R=int(200*scale); ox=0 if side=='l' else w/2
    return (f'<div class="a" style="left:{ox}px;top:0;width:{w/2}px;height:{h}px;overflow:hidden">'
            f'<img class="a" src="file://{SP}/clubs/{k}.png" style="left:{gx-G/2-ox}px;top:{cy-G/2}px;width:{G}px;height:{G}px;object-fit:contain;transform:rotate({rot}deg);opacity:.17;filter:saturate(1.2)"></div>'
            f'<div class="a" style="left:{cx-R}px;top:{cy-R}px;width:{2*R}px;height:{2*R}px;background:radial-gradient(closest-side,{c1}aa,transparent);mix-blend-mode:screen;opacity:.55"></div>'
            f'<div class="a" style="{edge};top:0;width:4px;height:100%;background:linear-gradient({c1},{c2});box-shadow:0 0 12px 2px {c1}88"></div>')
def label(y,t,sub=''):
    return (f'<div class="a" style="left:56px;right:56px;top:{y}px;display:flex;align-items:center;gap:16px">'
            f'<span class="d g" style="font-size:40px;letter-spacing:.03em">{t}</span>'
            f'<span class="l" style="font-size:12px;color:rgba(244,233,220,.6)">{sub}</span>'
            f'<span style="flex:1;height:1.5px;background:linear-gradient(90deg,{GO},transparent)"></span></div>')
def row(y,h,m,time=None,score=False):
    a,b=m['a'],m['b']; na,nb=C[a][0],C[b][0]; fs=38 if max(len(na),len(nb))<12 else 32; bs=h-20
    mid=(f'<div class="a" style="left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:10px">'
         + (f'<span class="d g" style="font-size:{h*.42:.0f}px">{time}</span>' if time else
            f'<span class="d{" g" if m["sa"]>m["sb"] else ""}" style="font-size:{h*.62:.0f}px;{"" if m["sa"]>m["sb"] else "color:"+("#fff" if m["sa"]==m["sb"] else "rgba(244,233,220,.45)")}">{m["sa"]}</span><span style="width:16px;height:5px;background:{GO}"></span><span class="d{" g" if m["sb"]>m["sa"] else ""}" style="font-size:{h*.62:.0f}px;{"" if m["sb"]>m["sa"] else "color:"+("#fff" if m["sa"]==m["sb"] else "rgba(244,233,220,.45)")}">{m["sb"]}</span>')
         +'</div>')
    return (f'<div class="card" style="left:56px;top:{y}px;width:968px;height:{h}px">{glow(a,"l",.45)}{glow(b,"r",.45)}{fx(a,"l",24+bs/2,h/2,968,h,1.0)}{fx(b,"r",968-24-bs/2,h/2,968,h,1.0)}'
            f'<div class="a" style="left:24px;top:0;height:{h}px;display:flex;align-items:center;gap:18px">{badge(a,bs)}<span class="d" style="font-size:{fs}px;color:#fff;white-space:nowrap;text-shadow:0 3px 10px rgba(0,0,0,.6)">{na}</span></div>'
            f'<div class="a" style="right:24px;top:0;height:{h}px;display:flex;align-items:center;gap:18px;flex-direction:row-reverse">{badge(b,bs)}<span class="d" style="font-size:{fs}px;color:#fff;white-space:nowrap;text-shadow:0 3px 10px rgba(0,0,0,.6)">{nb}</span></div>{mid}</div>')
def cell(x,y,w,h,m):
    a,b=m['a'],m['b']
    def side(k,al):
        n=C[k][0]
        return (f'<div class="a" style="{al}:0;top:0;width:50%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px">'
                f'{badge(k,86)}<span class="d" style="font-size:{30 if len(n)<12 else 25}px;color:#fff;white-space:nowrap;text-shadow:0 3px 10px rgba(0,0,0,.6)">{n}</span></div>')
    return (f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px">{glow(a,"l",.4)}{glow(b,"r",.4)}{fx(a,"l",w*.25,h*.36,w,h,.6)}{fx(b,"r",w*.75,h*.36,w,h,.6)}{side(a,"left")}{side(b,"right")}'
            f'<div class="a d g" style="left:50%;top:36px;transform:translateX(-50%);font-size:30px">vs</div></div>')
def affiche(x,y,w,h,m,tag,when):
    a,b=m['a'],m['b']; ca,cb=C[a][2],C[b][2]
    def side(k,al):
        n=C[k][0]
        return (f'<div class="a" style="{al}:0;top:54px;width:50%;bottom:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px">'
                f'{badge(k,140)}<span class="d" style="font-size:44px;color:#fff;text-shadow:0 4px 14px rgba(0,0,0,.7)">{n}</span></div>')
    return (f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;box-shadow:0 30px 50px -12px rgba(0,0,0,.95),0 0 40px rgba(209,174,102,.25),inset 0 0 0 2.5px {GO},inset 0 1px 0 rgba(255,240,200,.5)">'
            f'<div class="a" style="left:0;top:0;width:{w}px;height:{h-64}px;clip-path:polygon(0 0,56% 0,44% 100%,0 100%);background:linear-gradient(160deg,{ca},#0a0907 85%);opacity:.75"></div>'
            f'<div class="a" style="left:0;top:0;width:{w}px;height:{h-64}px;clip-path:polygon(56% 0,100% 0,100% 100%,44% 100%);background:linear-gradient(200deg,{cb},#0a0907 85%);opacity:.75"></div>'
            f'<div class="a" style="left:0;top:0;width:{w}px;height:{h-64}px;clip-path:polygon(55.4% 0,56.6% 0,44.6% 100%,43.4% 100%);background:linear-gradient({GOL},{GO},{GOD})"></div>'
            f'{fx(a,"l",w*.25,150,w,h,.95)}{fx(b,"r",w*.75,150,w,h,.95)}'
            f'<div class="a" style="left:0;right:0;top:0;height:54px;background:linear-gradient(90deg,{GOD},{GOL} 50%,{GOD});display:flex;align-items:center;justify-content:center"><span class="d" style="font-size:30px;color:#14100a;letter-spacing:.06em">{tag}</span></div>'
            f'<div class="a" style="left:0;right:0;bottom:0;height:64px;background:linear-gradient(#14110b,#070605);border-top:1.5px solid {GO};display:flex;align-items:center;justify-content:center"><span class="d g" style="font-size:46px">{when}</span></div>'
            f'{side(a,"left")}{side(b,"right")}'
            '</div>')
rnd=random.Random(4)
DUST=''.join(f'<div class="a" style="left:{rnd.randint(0,1080)}px;top:{rnd.randint(0,1350)}px;width:{(r:=rnd.choice([1,1.5,2,2,3,4]))*2}px;height:{r*2}px;border-radius:50%;background:{GOL};box-shadow:0 0 {r*4}px {r}px rgba(209,174,102,.7);opacity:{rnd.uniform(.15,.7):.2f};filter:blur({0 if r<3 else 1.5}px)"></div>' for _ in range(90))
BG=(f'<div class="a" style="inset:0;background:radial-gradient(70% 40% at 50% 0%,rgba(209,174,102,.42),transparent 70%),radial-gradient(60% 50% at 50% 100%,rgba(138,106,42,.25),transparent 70%),linear-gradient(#11100c,#070605)"></div>'
 f'<div class="a" style="left:-460px;top:-500px;width:2000px;height:2000px;background:conic-gradient(from 160deg at 50% 25%,transparent 0deg,rgba(246,227,166,.10) 6deg,transparent 12deg,transparent 18deg,rgba(246,227,166,.08) 22deg,transparent 28deg,transparent 34deg,rgba(246,227,166,.12) 38deg,transparent 44deg);filter:blur(3px)"></div>'
 + ''.join(f'<div class="a" style="left:0;right:0;top:{i}px;height:1px;background:rgba(255,255,255,.018)"></div>' for i in range(0,1350,4))
 + f'<div class="a d" style="right:-60px;top:150px;font-size:980px;color:transparent;-webkit-text-stroke:3px rgba(209,174,102,.16);letter-spacing:-.04em">{DATA["num"]}</div>'
 + DUST)
title='Le programme' if MODE=='prog' else 'Les résultats'
HDR=(f'<div class="a" style="left:0;right:0;top:46px;display:flex;justify-content:center;align-items:center;gap:18px">'
 f'<span style="height:1.5px;width:120px;background:linear-gradient(90deg,transparent,{GO})"></span><span class="d g" style="font-size:44px;letter-spacing:.08em">Top 14</span>'
 f'<span class="l" style="font-size:13px;color:{CRE}">{DATA["titre"]}</span><span style="height:1.5px;width:120px;background:linear-gradient(270deg,transparent,{GO})"></span></div>'
 f'<div class="a d g" style="left:0;right:0;top:84px;padding-top:28px;text-align:center;font-size:150px;letter-spacing:.005em">{title}</div>'
)
body=''
if MODE=='prog':
    J=DATA['jours']; sat,sun=J[0]['matchs'],J[1]['matchs']
    body+=label(304,'En ouverture','Samedi 28 novembre')+row(354,104,sat[0],'14h30')
    body+=label(484,'Samedi 16h35','Le multiplex')
    for i,m in enumerate(sat[1:5]): body+=cell(56+(i%2)*494,534+(i//2)*150,474,138,m)
    body+=label(842,'Les affiches','Prime time')
    body+=affiche(56,892,474,330,sat[5],'Samedi soir','21h00')+affiche(550,892,474,330,sun[0],'Dimanche soir','21h05')
    end=1222
else:
    y=304
    for j in DATA['jours']:
        body+=label(y,j['label']); y+=50
        for m in j['matchs']: body+=row(y,108,m,score=True); y+=120
        y+=8
    end=y
FOOT=f'<img class="a" src="file://{R}/public/logo-blanc.png" style="left:50%;top:{max(end+18,1262)}px;height:52px;transform:translateX(-50%);opacity:.95">'
VIG='<div class="a" style="inset:0;background:radial-gradient(130% 100% at 50% 40%,transparent 60%,rgba(0,0,0,.6));pointer-events:none"></div>'
PAGE=f'<div class="p">{BG}{VIG}{HDR}{body}{FOOT}</div>'
from PIL import ImageFilter
RAMP=np.array([(24,14,4),(92,60,20),(168,126,58),(209,174,102),(240,214,150),(255,246,214)],np.float32)
def ramp(t):
    t=np.clip(t,0,1)*(len(RAMP)-1); i=np.floor(t).astype(int).clip(0,len(RAMP)-2); f=(t-i)[...,None]
    return RAMP[i]*(1-f)+RAMP[i+1]*f
def gold(base,mask):
    ST=os.environ.get('GOLD','doux')
    M=np.array(mask.convert('L')).astype(np.float32)/255; H_,W_=M.shape
    blur=lambda arr,r: np.array(Image.fromarray((arr*255).clip(0,255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(r))).astype(np.float32)/255
    Hm=blur(M,{'ciselé':2.6,'plat':2.6,'doux':7,'satin':2.6}[ST]); gy,gx=np.gradient(Hm); k={'ciselé':9.0,'plat':0.0,'doux':4.2,'satin':0.0}[ST]
    n=np.dstack([-gx*k,-gy*k,np.ones_like(M)]); n/=np.linalg.norm(n,axis=2,keepdims=True)
    L=np.array([-.45,-.75,.55]); L/=np.linalg.norm(L); d=(n@L); flat=L[2]
    rng=np.random.default_rng(9)
    low=blur(rng.random((H_,W_)).astype(np.float32),26); low=(low-low.mean())/(low.std()+1e-6)
    br=np.array(Image.fromarray((rng.random((H_,W_))*255).astype(np.uint8)).filter(ImageFilter.BoxBlur(0)).resize((W_//8,H_)).resize((W_,H_),Image.BILINEAR)).astype(np.float32)/255-.5
    yy,xx=np.mgrid[0:H_,0:W_].astype(np.float32)
    sheen=np.exp(-((xx*.55+yy-H_*.10)/(W_*.045))**2)*.32+np.exp(-((xx*.55+yy-H_*.55)/(W_*.06))**2)*.22
    if ST=='doux': sheen=sheen+np.exp(-((xx*.9+yy-W_*.62)/(W_*.018))**2)*.55+np.exp(-((xx*.9+yy-W_*.30)/(W_*.010))**2)*.35
    # bande horizontale de reflet dans chaque ligne de texte
    B=M>.5; up=np.zeros_like(M); dn=np.zeros_like(M)
    for y in range(1,H_): up[y]=np.where(B[y],up[y-1]+1,0)
    for y in range(H_-2,-1,-1): dn[y]=np.where(B[y],dn[y+1]+1,0)
    fr=up/(up+dn+1)
    if ST=='ciselé': foil=np.interp(fr,[0,.18,.45,.58,.78,1],[.95,.80,.42,.38,.78,.60])
    elif ST=='plat': foil=np.interp(fr,[0,.5,1],[.92,.62,.80])
    elif ST=='doux': foil=np.interp(fr,[0,.5,1],[.88,.58,.72])
    else: foil=np.interp(fr,[0,1],[.95,.48])
    t=.20+.62*foil+1.25*(d-flat)+.018*low+(.07 if ST!='satin' else .03)*br+sheen*.8
    col=ramp(t)
    spec=np.clip((d-flat-.10)*3.2,0,1)**2
    col=col+np.array([255,250,230],np.float32)*spec[...,None]*.55
    er=blur(M,1.2); edge=np.clip(M-np.clip((er-.5)*2,0,1),0,1)
    col*=1-(.35 if ST=='ciselé' else .12)*edge[...,None]
    out=np.array(base).astype(np.float32)
    sh=blur(M,9); sh=np.roll(sh,14,axis=0); out*=1-.55*sh[...,None]           # ombre portée
    gl=blur(M,28); out=255-(255-out)*(1-(.55 if ST=='doux' else .38)*gl[...,None]*np.array([209,174,102],np.float32)/255)  # halo doré
    out=out*(1-M[...,None])+col*M[...,None]
    if ST=='doux':  # éclats en étoile sur les arêtes hautes des grandes lettres
        big=(up+dn)>150; cand=np.argwhere(B&(up<3)&big)
        if len(cand):
            r2=np.random.default_rng(5); pick=[]
            xs=np.linspace(cand[:,1].min(),cand[:,1].max(),6)[[0,2,3,5]]
            for x0 in xs:
                c=cand[np.argmin(abs(cand[:,1]-x0+r2.integers(-40,40)))]; pick.append(c)
            pk=cand[np.argsort(cand[:,0])[-1]]
            fl=np.zeros(M.shape,np.float32)
            for (y0,x0),sz in zip(pick,[1.0,.7,.85,.6]):
                dy,dx=yy-y0,xx-x0
                fl+=sz*(np.exp(-(dy/2.2)**2)*np.exp(-np.abs(dx)/(70*sz))+np.exp(-(dx/2.2)**2)*np.exp(-np.abs(dy)/(46*sz))
                        +.8*np.exp(-(dx**2+dy**2)/(2*(9*sz)**2))+.25*np.exp(-(dx**2+dy**2)/(2*(28*sz)**2)))
            # traînée anamorphique sur le titre
            ty=int(np.median(cand[:,0]))+60
            fl+=.30*np.exp(-((yy-ty)/3.0)**2)*np.exp(-((xx-W_*.62)/(W_*.33))**2)
            out=255-(255-out)*(1-np.clip(fl,0,1)[...,None]*np.array([1,.96,.84],np.float32))
    out+=rng.normal(0,4.5,out.shape[:2])[...,None]
    return Image.fromarray(out.clip(0,255).astype(np.uint8))
MASKCSS='.p{background:#000 !important}.p *{visibility:hidden !important;box-shadow:none !important;filter:none !important}.p .g,.p .g *{visibility:visible !important;color:#fff !important;-webkit-text-fill-color:#fff !important;background:none !important;text-shadow:none !important}'
HIDECSS='.g{color:transparent !important;-webkit-text-fill-color:transparent !important;background:none !important;filter:none !important;text-shadow:none !important}'
async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        br=await p.chromium.launch(args=["--allow-file-access-from-files"])
        shots=[]
        for tag,extra in (('base',HIDECSS),('mask',MASKCSS)):
            f=f'{HERE}/t14b-{tag}.html'
            open(f,'w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}{extra}</style></head><body>{PAGE}</body></html>')
            pg=await br.new_page(viewport={'width':1080,'height':1350},device_scale_factor=2); await pg.goto(f'file://{f}'); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(500)
            o=OUT.replace('.png',f'-{tag}.png'); await pg.screenshot(path=o); shots.append(o)
        await br.close()
    gold(Image.open(shots[0]).convert('RGB'),Image.open(shots[1])).save(OUT)
asyncio.run(main()); print('ok',OUT)
