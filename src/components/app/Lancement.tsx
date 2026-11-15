/* eslint-disable @next/next/no-img-element */
/**
 * Animation de lancement de l'app installée : reprend l'écran de démarrage (ballon « Ambiance Rugby » sur le bordeaux),
 * le ballon prend son élan puis file vers l'écran, qui s'ouvre sur l'app. Une fois par ouverture de l'app,
 * jamais dans un navigateur classique. Tout en CSS : rien n'attend le chargement de JavaScript.
 */
const SCRIPT = `try{var n=navigator,w=window,s=matchMedia("(display-mode: standalone)").matches||n.standalone===true||!!(w.Capacitor&&w.Capacitor.isNativePlatform&&w.Capacitor.isNativePlatform());if(s&&!sessionStorage.getItem("ar-lance")){sessionStorage.setItem("ar-lance","1");document.documentElement.setAttribute("data-lancement","");setTimeout(function(){document.documentElement.removeAttribute("data-lancement")},1700)}}catch(e){}`;

export default function Lancement() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
      <div aria-hidden className="lancement">
        <span className="lancement-poteaux" />
        <img src="/logo-blanc.png" alt="" className="lancement-ballon" />
      </div>
    </>
  );
}
