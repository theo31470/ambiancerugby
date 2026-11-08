"use client";
/**
 * Le son du stade, synthétisé en direct avec Web Audio (aucun fichier à charger) :
 * - rumeur de tribune : bruit filtré qui gonfle et retombe doucement ;
 * - coup de sifflet de l'arbitre : deux coups, court puis long, avec le roulement de la bille ;
 * - clameur : la tribune qui se lève sur un essai.
 * Désactivé par défaut, le choix est mémorisé sur l'appareil.
 */
const CLE = "ar-son";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let tribune: { stop: () => void } | null = null;

export function sonActif() {
  try {
    return localStorage.getItem(CLE) === "1";
  } catch {
    return false;
  }
}

export function setSonActif(v: boolean) {
  try {
    localStorage.setItem(CLE, v ? "1" : "0");
  } catch {
    /* stockage indisponible : le choix vaut pour la page */
  }
  window.dispatchEvent(new CustomEvent("ar:son", { detail: v }));
}

function contexte() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function bruit(c: AudioContext, secondes: number, brun = true) {
  const n = Math.floor(c.sampleRate * secondes);
  const buf = c.createBuffer(2, n, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (brun) {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      } else d[i] = w;
    }
  }
  return buf;
}

export function demarrerTribune() {
  if (tribune) return;
  const c = contexte();
  const t = c.currentTime;
  const sortie = c.createGain();
  sortie.gain.setValueAtTime(0, t);
  sortie.gain.linearRampToValueAtTime(1, t + 2.5);
  sortie.connect(master!);

  // couche grave : la masse du public
  const grave = c.createBufferSource();
  grave.buffer = bruit(c, 7);
  grave.loop = true;
  const f1 = c.createBiquadFilter();
  f1.type = "bandpass"; f1.frequency.value = 420; f1.Q.value = 0.7;
  const g1 = c.createGain(); g1.gain.value = 0.11;
  grave.connect(f1).connect(g1).connect(sortie);

  // couche médium : les voix, qui ondulent
  const voix = c.createBufferSource();
  voix.buffer = bruit(c, 5, false);
  voix.loop = true;
  const f2 = c.createBiquadFilter();
  f2.type = "bandpass"; f2.frequency.value = 1100; f2.Q.value = 1.2;
  const g2 = c.createGain(); g2.gain.value = 0.012;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.11;
  const lfoG = c.createGain(); lfoG.gain.value = 0.008;
  lfo.connect(lfoG).connect(g2.gain);
  voix.connect(f2).connect(g2).connect(sortie);

  grave.start(); voix.start(); lfo.start();
  tribune = {
    stop() {
      const now = c.currentTime;
      sortie.gain.cancelScheduledValues(now);
      sortie.gain.setValueAtTime(sortie.gain.value, now);
      sortie.gain.linearRampToValueAtTime(0, now + 0.8);
      setTimeout(() => { grave.stop(); voix.stop(); lfo.stop(); sortie.disconnect(); }, 900);
      tribune = null;
    },
  };
}

export function arreterTribune() {
  tribune?.stop();
}

/** Coup de sifflet : un coup bref puis un coup long. */
export function sifflet() {
  const c = contexte();
  const t0 = c.currentTime + 0.02;
  const coup = (debut: number, duree: number) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 2950;
    const roulement = c.createOscillator();
    roulement.frequency.value = 32;
    const prof = c.createGain(); prof.gain.value = 140;
    roulement.connect(prof).connect(osc.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0, debut);
    g.gain.linearRampToValueAtTime(0.13, debut + 0.02);
    g.gain.setValueAtTime(0.13, debut + duree - 0.04);
    g.gain.linearRampToValueAtTime(0, debut + duree);
    osc.connect(g).connect(master!);
    osc.start(debut); roulement.start(debut);
    osc.stop(debut + duree + 0.05); roulement.stop(debut + duree + 0.05);
  };
  coup(t0, 0.16);
  coup(t0 + 0.26, 0.7);
}

/** Clameur de la tribune (essai). */
export function clameur(force = 1) {
  const c = contexte();
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = bruit(c, 4.5, false);
  const f = c.createBiquadFilter();
  f.type = "bandpass"; f.Q.value = 0.9;
  f.frequency.setValueAtTime(500, t);
  f.frequency.linearRampToValueAtTime(1300, t + 0.6);
  f.frequency.linearRampToValueAtTime(800, t + 4);
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.32 * force, t + 0.35);
  g.gain.setValueAtTime(0.32 * force, t + 1.4);
  g.gain.exponentialRampToValueAtTime(0.001, t + 4.3);
  src.connect(f).connect(g).connect(master!);
  src.start(t);
  src.stop(t + 4.5);
}
