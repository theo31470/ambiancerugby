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
title={'prog':'Le programme','result':'Les résultats','ff':'Face-à-face','duel':'','forces':''}[MODE]
HDR=(f'<div class="a" style="left:0;right:0;top:46px;display:flex;justify-content:center;align-items:center;gap:18px">'
 f'<span style="height:1.5px;width:120px;background:linear-gradient(90deg,transparent,{GO})"></span><span class="d g" style="font-size:44px;letter-spacing:.08em">Top 14</span>'
 f'<span class="l" style="font-size:13px;color:{CRE}">{DATA["titre"]}</span><span style="height:1.5px;width:120px;background:linear-gradient(270deg,transparent,{GO})"></span></div>'
 f'<div class="a d g" style="left:0;right:0;top:84px;padding-top:28px;text-align:center;font-size:150px;letter-spacing:.005em">{title}</div>'
)
body=''
CB={'lou':dict(a='#e0102f',b='#14080b',pat="repeating-linear-gradient(135deg,rgba(0,0,0,.55) 0 34px,transparent 34px 68px)"),
    'st':dict(a='#b80d28',b='#0c0b0d',pat="repeating-linear-gradient(180deg,rgba(220,20,50,.55) 0 10px,transparent 10px 36px)",base='#141216'),
    'asm':dict(a='#f7c600',b='#1d3a8f',pat="repeating-linear-gradient(180deg,rgba(18,40,120,.75) 0 26px,transparent 26px 92px)"),
    'rct':dict(a='#d50c2f',b='#0b0b0b',pat="repeating-conic-gradient(from 0deg at 50% -10%,rgba(0,0,0,.45) 0 4deg,transparent 4deg 9deg)")}
def clubbg(k,w,side):
    d=CB[k]; a,b=d['a'],d['b']; base=d.get('base',a)
    return (f'<div class="a" style="inset:0;background:linear-gradient(180deg,{base} 0%,{base} 30%,{b} 95%)"></div>'
            f'<div class="a" style="inset:0;background:{d["pat"]};opacity:.9"></div>'
            f'<div class="a" style="inset:0;background:radial-gradient(70% 45% at 50% 30%,transparent 30%,rgba(0,0,0,.55) 100%)"></div>'
            # logo géant en relief (embossé)
            f'<img class="a" src="file://{SP}/clubs/{k}.png" style="left:{w/2-400}px;top:90px;width:800px;height:800px;object-fit:contain;opacity:.28;mix-blend-mode:luminosity;'
            f'filter:grayscale(.3) contrast(1.2) drop-shadow(-4px -4px 0 rgba(255,255,255,.35)) drop-shadow(8px 10px 0 rgba(0,0,0,.6)) drop-shadow(0 0 40px rgba(0,0,0,.5));transform:rotate({-6 if side=="l" else 6}deg)">'
            f'<div class="a" style="left:{w/2-360}px;top:-260px;width:720px;height:900px;background:radial-gradient(closest-side,rgba(255,245,225,.42),rgba(255,245,225,.10) 50%,transparent);mix-blend-mode:screen"></div>'
            f'<div class="a" style="left:{w/2-30}px;top:-40px;width:60px;height:760px;background:linear-gradient(rgba(255,250,235,.25),transparent);filter:blur(18px);transform:rotate({8 if side=="l" else -8}deg);mix-blend-mode:screen"></div>')
if MODE=='prog':
    J=DATA['jours']; sat,sun=J[0]['matchs'],J[1]['matchs']
    body+=label(304,'En ouverture','Samedi 28 novembre')+row(354,104,sat[0],'14h30')
    body+=label(484,'Samedi 16h35','Le multiplex')
    for i,m in enumerate(sat[1:5]): body+=cell(56+(i%2)*494,534+(i//2)*150,474,138,m)
    body+=label(842,'Les affiches','Prime time')
    body+=affiche(56,892,474,330,sat[5],'Samedi soir','21h00')+affiche(550,892,474,330,sun[0],'Dimanche soir','21h05')
    end=1222
elif MODE=='forces':
    A,B=DATA['a'],DATA['b']
    def col(T,side):
        k=T['k']; x0=0 if side=='l' else 545; w=535
        cards=''
        for j,(val,lab,rk) in enumerate(T['forces']):
            y=470+j*262
            top1=rk.lower().startswith('1')
            cards+=(f'<div class="a" style="left:40px;width:{w-80}px;top:{y}px;height:230px;border-radius:8px;background:linear-gradient(180deg,rgba(20,17,12,.78),rgba(8,7,5,.9));'
                    f'box-shadow:0 26px 40px -12px rgba(0,0,0,.9),inset 0 0 0 1.5px rgba(209,174,102,{.9 if top1 else .45}),inset 0 1px 0 rgba(255,240,200,.3){",0 0 34px rgba(209,174,102,.35)" if top1 else ""}">'
                    f'<div class="a" style="left:0;right:0;top:26px;text-align:center"><span class="d g" style="font-size:{118 if len(val)<5 else 100}px">{val}</span></div>'
                    f'<div class="a l" style="left:16px;right:16px;top:152px;text-align:center;font-size:12px;letter-spacing:.18em;color:{CRE}">{lab}</div>'
                    f'<div class="a" style="left:50%;top:184px;transform:translateX(-50%);white-space:nowrap;padding:6px 14px 4px;{"background:linear-gradient(90deg,"+GOD+","+GOL+" 50%,"+GOD+");color:#14100a" if top1 else "background:rgba(0,0,0,.5);color:"+GOL+";box-shadow:inset 0 0 0 1px "+GO}">'
                    f'<span class="d" style="font-size:22px;letter-spacing:.06em">{rk}</span></div></div>')
        return (f'<div class="a" style="left:{x0}px;top:0;width:{w}px;height:1350px;overflow:hidden">'
                f'<img class="a" src="file:///home/claude/gfx/decor-{k}.png" style="left:0;top:0;width:{w}px;height:1350px">'
                f'<div class="a" style="inset:0;background:linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.55) 40%,rgba(0,0,0,.8))"></div>'
                f'<div class="a" style="left:0;right:0;top:190px;display:flex;flex-direction:column;align-items:center;gap:12px">{badge(k,150)}'
                f'<span class="d" style="font-size:46px;color:#fff;text-shadow:0 4px 14px rgba(0,0,0,.8)">{C[k][0]}</span></div>{cards}</div>')
    body+=col(A,'l')+col(B,'r')
    body+=(f'<div class="a" style="left:535px;top:0;width:10px;height:1350px;background:linear-gradient({GOL},{GO} 40%,{GOD});box-shadow:0 0 24px rgba(209,174,102,.6)"></div>'
           f'<div class="a" style="left:0;right:0;top:34px;display:flex;justify-content:center"><div style="display:flex;align-items:center;gap:14px;background:rgba(10,9,7,.88);border:1.5px solid {GO};padding:10px 22px 8px;box-shadow:0 10px 24px rgba(0,0,0,.6)">'
           f'<span class="d g" style="font-size:34px;letter-spacing:.06em">Top 14</span><span class="l" style="font-size:12px;color:{CRE}">{DATA["quand"]}</span></div></div>'
           f'<div class="a" style="left:0;right:0;top:98px;text-align:center"><span class="d g" style="font-size:78px;padding:0 30px;background:radial-gradient(closest-side,rgba(10,9,7,.85),transparent)">Les points forts</span></div>'
           f'<div class="a l" style="left:0;right:0;top:1300px;text-align:center;font-size:11px;color:{CRE};opacity:.75">Moyenne par match · classement parmi les 14 clubs · saison 2026-2027</div>')
    end=1262
elif MODE=='duel':
    A,B=DATA['a'],DATA['b']
    def half(T,side):
        k=T['k']; c1,c2=C[k][2],C[k][3]; x0=0 if side=='l' else 545; w=535
        rk=T['rang']; num=rk.rstrip('erE'); suf=rk[len(num):]
        dots=''.join(f'<span style="display:inline-block;width:40px;height:40px;border-radius:50%;margin:0 6px;background:radial-gradient(circle at 35% 30%,{"#7dffa8,#1fbf5a" if r=="V" else "#ff8a94,#d9253a"});box-shadow:0 0 14px {"rgba(40,220,110,.6)" if r=="V" else "rgba(240,50,70,.6)"},0 4px 8px rgba(0,0,0,.6)"></span>' for r in T['forme'])
        return (f'<div class="a" style="left:{x0}px;top:0;width:{w}px;height:1350px;overflow:hidden">'
                + f'<img class="a" src="file:///home/claude/gfx/decor-{k}.png" style="left:0;top:0;width:{w}px;height:1350px">' +
                f'<img class="a" src="file:///home/claude/gfx/up-{T["joueur"]}-cr.png" style="left:{w/2-400}px;top:150px;width:800px;height:1000px;object-fit:contain;object-position:50% 0;image-rendering:auto;filter:drop-shadow(0 0 3px rgba(0,0,0,.7)) drop-shadow(0 0 28px rgba(0,0,0,.85)) drop-shadow(0 0 60px rgba(0,0,0,.6)) drop-shadow(0 0 2px rgba(255,240,200,.35))">'
                f'<div class="a" style="left:0;right:0;bottom:0;height:640px;background:linear-gradient(transparent,rgba(10,9,7,.55) 30%,rgba(10,9,7,.94) 70%,#0a0907)"></div>'
                f'<div class="a" style="left:0;right:0;top:770px;display:flex;justify-content:center">{badge(k,150)}</div>'
                f'<div class="a l" style="left:0;right:0;top:944px;text-align:center;font-size:13px;color:{CRE}">{T["nom"]}</div>'
                f'<div class="a" style="left:0;right:0;top:978px;display:flex;justify-content:center;align-items:flex-end;gap:26px">'
                f'<div style="display:flex;align-items:flex-start"><span class="d g" style="font-size:190px">{num}</span><span class="d g" style="font-size:78px;margin-top:8px">{suf}</span></div>'
                f'<div style="display:flex;flex-direction:column;align-items:flex-start;padding-bottom:14px"><span class="d g" style="font-size:84px">{T["pts"]}</span><span class="l" style="font-size:13px;color:{CRE};margin-top:6px">points</span></div></div>'
                f'<div class="a" style="left:0;right:0;top:1210px;text-align:center">{dots}</div></div>')
    body+=half(A,'l')+half(B,'r')
    body+=(f'<div class="a" style="left:535px;top:0;width:10px;height:1350px;background:linear-gradient({GOL},{GO} 40%,{GOD});box-shadow:0 0 24px rgba(209,174,102,.6)"></div>'
           f'<div class="a" style="left:0;right:0;top:34px;display:flex;justify-content:center"><div style="display:flex;align-items:center;gap:14px;background:rgba(10,9,7,.82);border:1.5px solid {GO};padding:10px 22px 8px;box-shadow:0 10px 24px rgba(0,0,0,.6)">'
           f'<span class="d g" style="font-size:34px;letter-spacing:.06em">Top 14</span><span class="l" style="font-size:12px;color:{CRE}">{DATA["quand"]}</span></div></div>'
           f'<div class="a" style="left:490px;top:560px;width:100px;height:100px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2418,#0a0907);box-shadow:0 0 0 3px {GO},0 0 34px rgba(209,174,102,.6),0 12px 22px rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center"><span class="d g" style="font-size:50px;padding-top:4px">vs</span></div>'
           )
    end=1262
elif MODE=='ff':
    A,B=DATA['a'],DATA['b']; ka,kb=A['k'],B['k']
    body+=f'<div class="a l" style="left:0;right:0;top:262px;text-align:center;font-size:14px;color:{CRE}">{DATA["quand"]}</div>'
    # héros
    x,y,w,h=56,304,968,330; ca,cb=C[ka][2],C[kb][2]
    def side(k,al,T):
        n=C[k][0]
        return (f'<div class="a" style="{al}:0;top:0;width:50%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px">'
                f'{badge(k,170)}<span class="d" style="font-size:50px;color:#fff;text-shadow:0 4px 14px rgba(0,0,0,.7)">{n}</span>'
                f'<span class="l" style="font-size:13px;color:{CRE};background:rgba(0,0,0,.45);border:1px solid {GO};padding:6px 12px">{T["rang"]} · {T["pts"]} pts</span></div>')
    body+=(f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;box-shadow:0 30px 50px -12px rgba(0,0,0,.95),0 0 40px rgba(209,174,102,.25),inset 0 0 0 2.5px {GO}">'
           f'<div class="a" style="left:0;top:0;width:{w}px;height:{h}px;clip-path:polygon(0 0,54% 0,46% 100%,0 100%);background:linear-gradient(160deg,{ca},#0a0907 80%);opacity:.6"></div>'
           f'<div class="a" style="left:0;top:0;width:{w}px;height:{h}px;clip-path:polygon(54% 0,100% 0,100% 100%,46% 100%);background:linear-gradient(200deg,{cb},#0a0907 80%);opacity:.6"></div>'
           f'{fx(ka,"l",w*.25,h*.4,w,h,1.3)}{fx(kb,"r",w*.75,h*.4,w,h,1.3)}'
           f'<div class="a" style="left:0;top:0;width:{w}px;height:{h}px;clip-path:polygon(53.6% 0,54.4% 0,46.4% 100%,45.6% 100%);background:linear-gradient({GOL},{GO},{GOD})"></div>'
           f'{side(ka,"left",A)}{side(kb,"right",B)}'
           f'<div class="a" style="left:50%;top:50%;transform:translate(-50%,-50%);width:96px;height:96px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2418,#0a0907);box-shadow:0 0 0 2.5px {GO},0 0 30px rgba(209,174,102,.5),0 10px 20px rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center"><span class="d g" style="font-size:48px;padding-top:4px">vs</span></div></div>')
    # stats
    body+=label(662,'Les chiffres','Top 14 · saison 2026-2027')
    rows=[('Classement',A['rang_n'],B['rang_n'],False,lambda v:f"{v}e" if v>1 else "1er"),('Points',A['pts'],B['pts'],True,str),('Victoires',A['v'],B['v'],True,str),
          ('Points marqués',A['pm'],B['pm'],True,str),('Points encaissés',A['pe'],B['pe'],False,str),('Bonus',A['bonus'],B['bonus'],True,str)]
    yy=712
    for lab,va,vb,hi,fmt in rows:
        mx=max(va,vb) or 1; best_a=(va>vb) if hi else (va<vb); best_b=(vb>va) if hi else (vb<va)
        ra=(va/mx) if hi else (min(va,vb)/va if va else 1); rb=(vb/mx) if hi else (min(va,vb)/vb if vb else 1)
        if lab=='Classement': ra,rb=(14-va+1)/14,(14-vb+1)/14
        W2=250
        def bar(r,best,side):
            c=f'linear-gradient({"90deg" if side=="r" else "270deg"},{GOD},{GO},{GOL})' if best else 'linear-gradient(90deg,#3a352c,#55503f)'
            pos=f'left:{540+100}px' if side=='r' else f'right:{540+100}px'
            return f'<div class="a" style="{pos};top:{yy+14}px;width:{max(10,W2*r):.0f}px;height:18px;background:{c};border-radius:2px;box-shadow:{"0 0 14px rgba(209,174,102,.45)" if best else "none"}"></div>'
        body+=(bar(ra,best_a,'l')+bar(rb,best_b,'r')
               +f'<div class="a l" style="left:0;right:0;top:{yy+16}px;text-align:center;font-size:10px;letter-spacing:.2em;color:{CRE};opacity:.85">{lab}</div>'
               +f'<div class="a d{" g" if best_a else ""}" style="left:56px;top:{yy+4}px;font-size:40px;{"" if best_a else "color:"+("#fff" if va==vb else "rgba(244,233,220,.55)")}">{fmt(va)}</div>'
               +f'<div class="a d{" g" if best_b else ""}" style="right:56px;top:{yy+4}px;font-size:40px;text-align:right;{"" if best_b else "color:"+("#fff" if va==vb else "rgba(244,233,220,.55)")}">{fmt(vb)}</div>')
        yy+=52
    # forme + confrontations
    body+=label(1030,'La forme','5 derniers matchs')
    def pills(f,x0,y0):
        return ''.join(f'<div class="a d" style="left:{x0+i*46}px;top:{y0}px;width:38px;height:38px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:22px;padding-top:3px;{"background:linear-gradient("+GOL+","+GO+","+GOD+");color:#14100a" if c=="V" else "background:#2a2620;color:rgba(244,233,220,.6);box-shadow:inset 0 0 0 1px rgba(244,233,220,.2)"}">{c}</div>' for i,c in enumerate(f))
    body+=(f'<div class="a" style="left:56px;top:1080px;display:flex;align-items:center;gap:10px">{badge(ka,40)}</div>'+pills(A['forme'],110,1081)
           +f'<div class="a" style="left:56px;top:1130px;display:flex;align-items:center;gap:10px">{badge(kb,40)}</div>'+pills(B['forme'],110,1131))
    H=DATA['h2h']
    body+=(f'<div class="card" style="left:376px;top:1074px;width:648px;height:106px;padding:14px 22px">'
           f'<div class="l" style="font-size:12px;color:{GO}">{H["titre"]}</div>'
           f'<div style="display:flex;align-items:baseline;gap:18px;margin-top:10px"><span class="d g" style="font-size:52px">{H["a"]}</span><span class="d" style="font-size:22px;color:{CRE}">{C[ka][0]}</span>'
           f'<span class="d" style="font-size:22px;color:rgba(244,233,220,.6)">{"· "+str(H["n"])+" nul ·" if H["n"] else "–"}</span><span class="d" style="font-size:22px;color:{CRE}">{C[kb][0]}</span><span class="d g" style="font-size:52px">{H["b"]}</span></div></div>'
           f'<div class="a l" style="left:376px;right:56px;top:1196px;font-size:12px;color:{CRE};opacity:.9;line-height:1.6;letter-spacing:.12em;text-transform:none;font-weight:600">{H["note"]}</div>')
    end=1240
else:
    y=304
    for j in DATA['jours']:
        body+=label(y,j['label']); y+=50
        for m in j['matchs']: body+=row(y,108,m,score=True); y+=120
        y+=8
    end=y
FOOT=(f'<img class="a" src="file://{R}/public/logo-blanc.png" style="left:50%;top:{max(end+18,1262)}px;height:52px;transform:translateX(-50%);opacity:.95">' if MODE not in ('duel','forces') else f'<img class="a" src="file://{R}/public/logo-blanc.png" style="left:50%;top:{1262 if MODE=="duel" else 1236}px;height:58px;transform:translateX(-50%);filter:drop-shadow(0 0 10px rgba(0,0,0,.9)) drop-shadow(0 0 22px rgba(0,0,0,.8))">')
VIG='<div class="a" style="inset:0;background:radial-gradient(130% 100% at 50% 40%,transparent 60%,rgba(0,0,0,.6));pointer-events:none"></div>'
PAGE=f'<div class="p">{BG}{VIG}{"" if MODE in ("duel","forces") else HDR}{body}{FOOT}</div>'
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
