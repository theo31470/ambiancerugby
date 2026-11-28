"""Top 14 · affiche score final (noir & or). python3 t14score.py data.json out.png
data : {"a":"lou","b":"st","sa":24,"sb":30,"journee":"10e journée","p1":"Le leader","p2":"tient bon",
        "photo":"/chemin/photo.jpg"|null,"pos":"50% 30%","joueur":"jack-willis","hdm":"Jack Willis"}"""
import asyncio, json, os, sys, numpy as np
from PIL import Image
HERE=os.path.dirname(os.path.abspath(__file__)); SP=os.path.dirname(HERE)
R='/home/claude/theo31470/ambiancerugby'; BS=f'{SP}/fonts-bs/package/files'; G='/home/claude/gfx'
GO,GOL,GOD,CRE='#d1ae66','#f6e3a6','#8a6a2a','#f4e9dc'
D=json.load(open(sys.argv[1])); OUT=sys.argv[2]
NM={'ubb':'Bordeaux-Bègles','mhr':'Montpellier','sr':'La Rochelle','usap':'Perpignan','r92':'Racing 92','sp':'Pau','sfp':'Stade Français','rcv':'Vannes','bay':'Bayonne','co':'Castres','lou':'Lyon','st':'Toulouse','asm':'Clermont','rct':'Toulon'}
a,b,sa,sb=D['a'],D['b'],D['sa'],D['sb']; win=a if sa>=sb else b
GOLD=f'background:linear-gradient(180deg,{GOL} 0%,{GO} 45%,{GOD} 60%,#e9cf8a 80%,{GO});-webkit-background-clip:text;background-clip:text;color:transparent;'
CSS=f'''@font-face{{font-family:"BS";src:url(file://{BS}/big-shoulders-display-latin-900-normal.woff2);font-weight:900}}
@font-face{{font-family:"Shrik";src:url(file://{R}/src/app/fonts/shrikhand.woff2)}}
@font-face{{font-family:"Bricolage";src:url(file://{R}/src/app/fonts/bricolage.woff2);font-weight:200 800}}
*{{margin:0;box-sizing:border-box}} body{{background:#000}}
.p{{position:relative;width:1080px;height:1350px;overflow:hidden;font-family:Bricolage;background:#0a0907;color:{CRE}}}
.a{{position:absolute}} .d{{font-family:BS;font-weight:900;text-transform:uppercase;line-height:.84}}
.l{{font-family:Bricolage;font-weight:700;letter-spacing:.28em;text-transform:uppercase}}'''
if D.get('photo'):
    VIS=f'<img class="a" src="file://{D["photo"]}" style="inset:0;width:100%;height:100%;object-fit:cover;object-position:{D.get("pos","50% 40%")};filter:contrast(1.06) saturate(1.06)">'
else:   # secours : décor du club vainqueur + joueur
    VIS=(f'<img class="a" src="file://{G}/decor-{win}.png" style="left:0;top:0;width:1080px;height:1350px;object-fit:cover">'
         + (f'<img class="a" src="file://{G}/up-{D["joueur"]}-cr.png" style="left:140px;top:110px;width:800px;height:1000px;object-fit:contain;object-position:50% 0;'
            f'-webkit-mask-image:linear-gradient(#000 45%,transparent 64%);filter:drop-shadow(0 0 30px rgba(0,0,0,.6))">' if D.get('joueur') else ''))
OVER=('<div class="a" style="inset:0;background:linear-gradient(180deg,rgba(10,9,7,.55),transparent 20%,transparent 42%,rgba(10,9,7,.7) 60%,rgba(10,9,7,.96) 78%,#0a0907)"></div>'
      f'<div class="a" style="left:-200px;top:-300px;width:1480px;height:900px;background:radial-gradient(closest-side,rgba(246,227,166,.18),transparent);mix-blend-mode:screen"></div>')
HDR=(f'<img class="a" src="file://{R}/public/logo-blanc.png" style="left:52px;top:44px;height:64px;filter:drop-shadow(0 4px 12px rgba(0,0,0,.6))">'
     f'<div class="a" style="right:52px;top:48px;text-align:right"><div class="d" style="font-size:38px;letter-spacing:.06em;{GOLD}filter:drop-shadow(0 2px 6px rgba(0,0,0,.6))">Top 14</div>'
     f'<div class="l" style="font-size:12px;margin-top:6px;color:{CRE};text-shadow:0 2px 8px rgba(0,0,0,.7)">{D.get("journee","")} · Score final</div></div>')
PH=(f'<div class="a" style="left:0;right:0;top:{D.get("ptop",690)}px;text-align:center">'
    f'<div style="font-family:Shrik;font-size:92px;line-height:1;color:{CRE};transform:rotate(-6deg);text-shadow:0 10px 24px rgba(0,0,0,.75)">{D.get("p1","")}</div>'
    f'<div class="d" style="margin-top:6px;font-size:196px;white-space:nowrap;{GOLD}filter:drop-shadow(0 0 28px rgba(209,174,102,.35)) drop-shadow(0 16px 26px rgba(0,0,0,.8))">{D.get("p2","")}</div>'
    + (f'<div class="l" style="margin-top:22px;font-size:15px;color:{CRE}">Homme du match · <span style="color:{GOL}">{D["hdm"]}</span></div>' if D.get('hdm') else '')
    + '</div>')
def panel(k,lost):
    return (f'<div style="width:230px;height:230px;position:relative;background:linear-gradient(180deg,#1b1813,#0c0b09);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;'
            f'box-shadow:inset 0 0 0 1.5px rgba(209,174,102,.55),inset 0 1px 0 rgba(255,240,200,.35)">'
            f'<img src="file://{SP}/clubs/{k}.png" style="width:150px;height:150px;object-fit:contain;{"filter:saturate(.55) brightness(.75);" if lost else "filter:drop-shadow(0 0 16px rgba(209,174,102,.45));"}">'
            f'<span class="d" style="font-size:22px;letter-spacing:.04em;color:{"rgba(244,233,220,.55)" if lost else "#fff"}">{NM[k]}</span></div>')
def num(v,w): return f'<span class="d" style="font-size:132px;{GOLD if w else "color:rgba(244,233,220,.6);"}">{v}</span>'
BAR=(f'<div class="a" style="left:50%;top:1012px;transform:translateX(-50%);display:flex;box-shadow:0 30px 50px rgba(0,0,0,.7),0 0 40px rgba(209,174,102,.25)">'
     + panel(a,sa<sb)
     + f'<div style="width:400px;height:230px;background:linear-gradient(180deg,#2a2418,#0f0d09);display:flex;align-items:center;justify-content:center;gap:14px;position:relative;overflow:hidden;box-shadow:inset 0 0 0 2.5px {GO}">'
       f'<div style="position:absolute;left:-40%;top:0;width:60%;height:100%;background:linear-gradient(100deg,transparent,rgba(255,236,190,.12),transparent);transform:skewX(-18deg)"></div>'
       + num(sa,sa>=sb) + f'<span style="width:26px;height:8px;background:{GO};margin-top:-6px"></span>' + num(sb,sb>=sa) + '</div>'
     + panel(b,sb<sa) + '</div>'
     f'<div class="a" style="left:50%;top:1270px;width:860px;height:6px;transform:translateX(-50%);background:linear-gradient(90deg,transparent,{GOD},{GOL} 50%,{GOD},transparent)"></div>')
PAGE=f'<div class="p">{VIS}{OVER}{HDR}{PH}{BAR}</div>'
async def main():
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        br=await p.chromium.launch(args=["--allow-file-access-from-files"]); f=f'{HERE}/t14score.html'
        open(f,'w').write(f'<!doctype html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>{PAGE}</body></html>')
        pg=await br.new_page(viewport={'width':1080,'height':1350},device_scale_factor=2); await pg.goto(f'file://{f}'); await pg.evaluate('document.fonts.ready'); await pg.wait_for_timeout(600)
        await pg.screenshot(path=OUT); await br.close()
    a_=np.array(Image.open(OUT).convert('RGB')).astype(np.float32); a_+=np.random.default_rng(3).normal(0,4.5,a_.shape[:2])[...,None]
    Image.fromarray(a_.clip(0,255).astype(np.uint8)).save(OUT)
asyncio.run(main()); print('ok',OUT)
