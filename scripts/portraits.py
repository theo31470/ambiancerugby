"""
Portraits des joueurs : photo officielle (LNR pour le Top 14 et la Pro D2, ESPN pour les autres championnats),
détourée, posée sur un fond aux couleurs d'Ambiance Rugby, enregistrée en WebP dans public/portraits/<slug>.webp.
Le manifeste public/portraits/index.json dit d'où vient chaque photo ; le site le recopie dans la base.

Tourne sur GitHub Actions (réseau libre, détourage sur CPU) : python scripts/portraits.py --max 1200
"""
import argparse, io, json, os, re, sys, time
from datetime import date
import requests
from PIL import Image, ImageDraw, ImageFilter

SUPABASE = "https://wsgetpnrloqrsvootoml.supabase.co"
CLE = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "sb_publishable_FRGOzMIUEZcceuO4y7Y_DA_kGTP_H1g")
DOSSIER = os.path.join(os.path.dirname(__file__), "..", "public", "portraits")
MANIFESTE = os.path.join(DOSSIER, "index.json")
LOGO = os.path.join(os.path.dirname(__file__), "..", "public", "logo-blanc.png")
L, H = 600, 750
VIN, BORDEAUX, MOUTARDE = (147, 79, 94), (62, 22, 33), (242, 181, 58)
UA = {"user-agent": "Mozilla/5.0 (compatible; AmbianceRugby/1.0; +https://ambiance-rugby.fr)"}

session = requests.Session()
session.headers.update(UA)


def joueurs():
    """Joueurs de l'effectif avec un identifiant LNR ou ESPN, ceux de la LNR d'abord."""
    out, debut = [], 0
    while True:
        r = session.get(f"{SUPABASE}/rest/v1/players", params={
            "select": "slug,lnr_id,espn_id,photo_source", "in_squad": "eq.true",
            "or": "(lnr_id.not.is.null,espn_id.not.is.null)", "order": "slug", "offset": debut, "limit": 1000,
        }, headers={"apikey": CLE, "authorization": f"Bearer {CLE}"}, timeout=30)
        r.raise_for_status()
        lot = r.json()
        out += lot
        if len(lot) < 1000:
            break
        debut += 1000
    return sorted(out, key=lambda j: (j["lnr_id"] is None, j["slug"]))


def photo_lnr(lnr_id):
    for site in ("top14", "prod2"):
        try:
            r = session.get(f"https://{site}.lnr.fr/joueur/{lnr_id}", timeout=20)
        except requests.RequestException:
            continue
        if r.status_code != 200:
            continue
        m = re.search(r"https://cdn\.lnr\.fr/joueur/[^\"'\s]+/photo/photoFull\.[0-9a-f]+", r.text)
        if m:
            img = session.get(m.group(0), timeout=30)
            if img.status_code == 200 and len(img.content) > 5000:
                return img.content
    return None


def photo_espn(espn_id):
    r = session.get(f"https://a.espncdn.com/i/headshots/rugby/players/full/{espn_id}.png", timeout=20)
    return r.content if r.status_code == 200 and len(r.content) > 3000 else None


_rembg = None


def detourer(im):
    """Garde la transparence d'origine si la photo est déjà détourée, sinon détourage automatique."""
    im = im.convert("RGBA")
    a = im.getchannel("A")
    transparent = sum(1 for v in a.resize((64, 80)).getdata() if v < 200) / (64 * 80)
    if transparent > 0.08:
        return im
    global _rembg
    if _rembg is None:
        from rembg import new_session, remove
        _rembg = (new_session("u2net_human_seg"), remove)
    sess, remove = _rembg
    return remove(im, session=sess, post_process_mask=True)


def fond():
    """Dégradé vin vers bordeaux, halo moutarde derrière la tête, logo en filigrane."""
    f = Image.new("RGB", (L, H))
    d = ImageDraw.Draw(f)
    for y in range(H):
        t = y / (H - 1)
        d.line([(0, y), (L, y)], fill=tuple(round(VIN[i] * (1 - t) + BORDEAUX[i] * t) for i in range(3)))
    halo = Image.new("L", (L, H), 0)
    ImageDraw.Draw(halo).ellipse([L * 0.12, H * 0.06, L * 0.88, H * 0.66], fill=75)
    halo = halo.filter(ImageFilter.GaussianBlur(70))
    f = Image.composite(Image.new("RGB", (L, H), MOUTARDE), f, halo)
    if os.path.exists(LOGO):
        logo = Image.open(LOGO).convert("RGBA")
        logo.thumbnail((int(L * 0.22), int(L * 0.22)))
        alpha = logo.getchannel("A").point(lambda v: int(v * 0.35))
        logo.putalpha(alpha)
        f.paste(logo, (L - logo.width - 22, 22), logo)
    return f


FOND = None


def composer(sujet):
    global FOND
    if FOND is None:
        FOND = fond()
    box = sujet.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    if not box:
        return None
    sujet = sujet.crop(box)
    if sujet.height < 120:
        return None
    # le sujet remplit le cadre en hauteur, posé en bas (buste coupé par le bord)
    echelle = min(H * 0.94 / sujet.height, L * 0.98 / sujet.width)
    sujet = sujet.resize((max(1, int(sujet.width * echelle)), max(1, int(sujet.height * echelle))), Image.LANCZOS)
    # ombre douce sous le joueur
    ombre = Image.new("RGBA", (L, H), (0, 0, 0, 0))
    masque = sujet.getchannel("A").filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.35))
    x, y = (L - sujet.width) // 2, H - sujet.height
    ombre.paste(Image.new("RGBA", sujet.size, (20, 5, 10, 255)), (x + 8, y + 6), masque)
    img = FOND.convert("RGBA")
    img = Image.alpha_composite(img, ombre)
    img.paste(sujet, (x, y), sujet)
    return img.convert("RGB")


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--max", type=int, default=1200)
    p.add_argument("--minutes", type=int, default=300)
    p.add_argument("--refaire", action="store_true")
    args = p.parse_args()
    os.makedirs(DOSSIER, exist_ok=True)
    manif = json.load(open(MANIFESTE)) if os.path.exists(MANIFESTE) else {}
    debut, faits, rates = time.time(), 0, 0
    liste = joueurs()
    print(f"{len(liste)} joueurs avec identifiant, {len(manif)} portraits déjà faits", flush=True)
    for j in liste:
        if faits >= args.max or time.time() - debut > args.minutes * 60:
            break
        slug = j["slug"]
        if slug in manif and not args.refaire:
            continue
        if j.get("photo_source") in ("manuel", "Ambiance Rugby"):
            continue
        essai = manif.get("_sans_photo", {}).get(slug)
        if essai and not args.refaire and (date.today() - date.fromisoformat(essai)).days < 30:
            continue
        brut, source = None, None
        try:
            if j.get("lnr_id"):
                brut, source = photo_lnr(j["lnr_id"]), "LNR"
            if not brut and j.get("espn_id"):
                brut, source = photo_espn(j["espn_id"]), "ESPN"
        except requests.RequestException as e:
            print(f"  {slug} : réseau ({e})", flush=True)
        if not brut:
            rates += 1
            manif.setdefault("_sans_photo", {})[slug] = date.today().isoformat()
            continue
        try:
            img = composer(detourer(Image.open(io.BytesIO(brut))))
        except Exception as e:  # image illisible
            print(f"  {slug} : {e}", flush=True)
            img = None
        if img is None:
            rates += 1
            continue
        img.save(os.path.join(DOSSIER, f"{slug}.webp"), "WEBP", quality=80, method=6)
        manif[slug] = {"s": source, "v": date.today().strftime("%Y%m%d")}
        manif.get("_sans_photo", {}).pop(slug, None)
        faits += 1
        if faits % 50 == 0:
            print(f"{faits} portraits ({round(time.time() - debut)} s)", flush=True)
            json.dump(manif, open(MANIFESTE, "w"), ensure_ascii=False, sort_keys=True, indent=0)
        time.sleep(0.3)  # politesse envers les sites sources
    json.dump(manif, open(MANIFESTE, "w"), ensure_ascii=False, sort_keys=True, indent=0)
    print(f"Terminé : {faits} nouveaux portraits, {rates} sans photo", flush=True)


if __name__ == "__main__":
    sys.exit(main())
