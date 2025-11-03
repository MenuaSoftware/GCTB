import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

/* ---------- timings & shell ---------- */
const VIEW_MS = 7000;     // Scherm 1: twee lijnen tonen
const CHOICE_MS = 10000;  // Scherm 2: antwoord kiezen

type Phase = "intro" | "view" | "choice" | "done";

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: () => number, arr: T[]) =>
  arr[Math.floor(rng() * arr.length)];

/* ---------- char-sets ---------- */
const AZ = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const az = "abcdefghijklmnopqrstuvwxyz";
const DIG = "0123456789";
const ALPHA = AZ + az;
const ALNUM = ALPHA + DIG;
const HEX = "0123456789abcdef";
const TLD = ["com", "net", "org", "be", "nl", "de", "fr", "eu"];
const DOMAINS = ["mail", "app", "news", "portal", "secure", "office", "intra"];

function randWord(r: () => number, len: number, set = az) {
  let s = "";
  for (let i = 0; i < len; i++) s += set[Math.floor(r() * set.length)];
  return s;
}
function randWordAZ(r: () => number, len: number) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHA[Math.floor(r() * ALPHA.length)];
  return s;
}
function randDigits(r: () => number, len: number) {
  let s = "";
  for (let i = 0; i < len; i++) s += DIG[Math.floor(r() * DIG.length)];
  return s;
}

/* ---------- base pattern makers (equal length strings) ---------- */
function makeEmail(r: () => number) {
  const user = randWordAZ(r, 3 + Math.floor(r() * 4)) + randDigits(r, 1 + Math.floor(r() * 3));
  const host = randWord(r, 4 + Math.floor(r() * 3));
  const dom = pick(r, DOMAINS);
  const tld = pick(r, TLD);
  return `${user}@${host}.${dom}.${tld}`; // lengte varieert, maar mutaties houden lengte constant
}

function makeUrl(r: () => number) {
  const sub = ["www", "static", "portal", "app"][Math.floor(r() * 4)];
  const host = randWord(r, 5 + Math.floor(r() * 3));
  const tld = pick(r, TLD);
  const path = `/${randWord(r, 3)}${Math.floor(r() * 10)}${randWord(r, 2)}`;
  return `http://${sub}.${host}.${tld}${path}`;
}

function makePlate(r: () => number) {
  // voorbeelden zoals "SM 83461" of "T 146 LBD"
  const form = Math.floor(r() * 2);
  if (form === 0) {
    return `${AZ[Math.floor(r() * 26)]}${AZ[Math.floor(r() * 26)]} ${randDigits(r, 5)}`;
  }
  return `${AZ[Math.floor(r() * 26)]} ${randDigits(r, 3)} ${randWordAZ(r, 3).toUpperCase()}`;
}

function makeCode(r: () => number) {
  // mix letters/cijfers met vaste spaties of slashes
  const a = randWordAZ(r, 2).toUpperCase();
  const b = randDigits(r, 3);
  const c = randWordAZ(r, 2).toUpperCase();
  const d = randDigits(r, 2);
  return `${a}-${b}/${c}${d}`;
}

function makeAddress(r: () => number) {
  const street = randWord(r, 6)[0].toUpperCase() + randWord(r, 5).slice(1);
  const nr = 1 + Math.floor(r() * 99);
  const add = ["", " bus A", " /1", " B"][Math.floor(r() * 4)];
  // padding zodat lengte vergelijkbaar blijft over varianten
  const num = nr < 10 ? ` ${nr}` : `${nr}`;
  return `${street} ${num}${add}`.padEnd(15, " "); // gelijk houden qua lengte voor mutaties
}

/* choose one producer */
const PRODUCERS = [makeEmail, makeUrl, makePlate, makeCode, makeAddress] as const;

/* ---------- mutate exactly k positions, preserving char class ---------- */
function mutateK(r: () => number, s: string, k: number) {
  const arr = s.split("");
  const idxPool = Array.from({ length: arr.length }, (_, i) => i);
  // kies geen spaties of structurele tekens te vaak
  const structure = new Set([" ", "-", "/", ".", "@", ":"]);
  const candidates = idxPool.filter(i => !structure.has(arr[i]));
  const pool = candidates.length >= k ? candidates : idxPool;

  // shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (let i = 0; i < k && i < pool.length; i++) {
    const p = pool[i];
    const ch = arr[p];
    let newCh = ch;
    const isDigit = /\d/.test(ch);
    const isLetter = /[A-Za-z]/.test(ch);
    if (isDigit) {
      do newCh = DIG[Math.floor(r() * DIG.length)]; while (newCh === ch);
    } else if (isLetter) {
      const set = ch === ch.toUpperCase() ? AZ : az;
      do newCh = set[Math.floor(r() * set.length)]; while (newCh === ch);
    } else {
      // structureel teken → kleine kans op alternatieve structure
      const alt = [".", "-", "/", "_", ":"];
      do newCh = alt[Math.floor(r() * alt.length)]; while (newCh === ch);
    }
    arr[p] = newCh;
  }
  return arr.join("");
}

function diffCount(a: string, b: string) {
  const n = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) d++;
  // als lengtes ooit afwijken (zou niet mogen), tel het restant als verschillen
  return d + Math.abs(a.length - b.length);
}

/* ---------- item ---------- */
type Item = { a: string; b: string; correct: 0|1|2|3|4 };

function genItem(seed: number): Item {
  const r = mulberry32(seed);
  const prod = pick(r, PRODUCERS);
  const base = prod(r);

  // verdeling van 0..4 verschillen, iets vaker 1–3
  const wheel = [0,1,1,2,2,2,3,3,4];
  const k = pick(r, wheel) as 0|1|2|3|4;

  const mutated = mutateK(r, base, k);
  // safety: forceer exact k (zeldzaam dat mutatie toevallig hetzelfde char kiest)
  let b = mutated;
  let tries = 0;
  while (diffCount(base, b) !== k && tries++ < 5) {
    b = mutateK(r, base, k);
  }

  return { a: base, b, correct: k };
}

/* ---------- component ---------- */
export default function FoutTest() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [seed, setSeed] = useState(Date.now());
  const [idx, setIdx] = useState(0);
  const [log, setLog] = useState<{ idx:number; guess:number; correct:number; a:string; b:string }[]>([]);
  const timer = useRef<number | null>(null);
  const navigate = useNavigate();

  const items = useMemo(() => Array.from({ length: 12 }, (_, i) => genItem(seed + i)), [seed]);
  const it = items[idx];

useEffect(() => {
  return () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
    }
  };
}, []);


  function start() {
    setSeed(Date.now());
    setIdx(0);
    setLog([]);
    setPhase("view");
    timer.current = window.setTimeout(() => setPhase("choice"), VIEW_MS);
  }

  useEffect(() => {
    if (phase === "view") {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPhase("choice"), VIEW_MS);
    } else if (phase === "choice") {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(() => choose(-1), CHOICE_MS);
    }
  }, [phase, idx]);

  function choose(n: number) {
    if (timer.current) clearTimeout(timer.current);
    setLog(l => [...l, { idx, guess: n, correct: it.correct, a: it.a, b: it.b }]);
    if (idx < items.length - 1) {
      setIdx(idx + 1);
      setPhase("view");
    } else {
      setPhase("done");
    }
  }

  // keyboard 0..4
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "choice") return;
      if (["0","1","2","3","4"].includes(e.key)) choose(parseInt(e.key, 10));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  const HomeButton = (
    <Button
      variant="ghost"
      onClick={() => navigate("/")}
      className="fixed top-4 left-4 z-50 bg-neutral-900/70 hover:bg-neutral-800 text-white rounded-xl text-sm px-4 py-2"
    >
      ← Home
    </Button>
  );

  const Shell = (node: React.ReactNode) => (
    <div className="min-h-screen grid place-items-center p-6 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-3xl text-white relative">
        {HomeButton}
        {node}
        <div className="mt-2 text-right text-sm text-neutral-400">
          {phase === "done" ? `${items.length}/${items.length}` : `${idx + 1}/${items.length}`}
        </div>
      </div>
    </div>
  );

  if (phase === "intro") {
    return Shell(
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">FOUTDETECTIE-TEST</h2>
        <p className="text-sm text-neutral-400">
          Scherm 1: zie een correcte lijn en een kopie. Scherm 2: kies hoeveel karakters verschillen (0–4).
          Toetsenbord: 0–4.
        </p>
        <Button onClick={start}>Oefenen</Button>
      </div>
    );
  }

  if (phase === "done") {
    const ok = log.filter(r => r.guess === r.correct).length;
    return Shell(
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Resultaten: {ok}/{log.length} correct</h3>
        <div className="rounded-2xl border overflow-hidden bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Eerste lijn</th>
                <th className="p-2 text-left">Tweede lijn</th>
                <th className="p-2 text-left">Juiste</th>
                <th className="p-2 text-left">Jouw</th>
              </tr>
            </thead>
            <tbody>
              {log.map(r => (
                <tr key={r.idx} className={r.guess !== r.correct ? "bg-red-900/20" : ""}>
                  <td className="p-2">{r.idx + 1}</td>
                  <td className="p-2 font-mono">{r.a}</td>
                  <td className="p-2 font-mono">{r.b}</td>
                  <td className="p-2">{r.correct}</td>
                  <td className="p-2">{r.guess < 0 ? "⏱" : r.guess}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button onClick={() => setPhase("intro")}>Opnieuw</Button>
      </div>
    );
  }

  if (phase === "view") {
    return Shell(
      <div className="relative h-56 rounded-2xl border bg-neutral-900 grid place-items-center overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
          <div
            key={"view-" + idx}
            className="h-full bg-green-500 animate-barfill"
            style={{ animationDuration: `${VIEW_MS}ms` }}
          />
        </div>
        <div className="grid gap-3 place-items-center">
          <div className="text-sm uppercase tracking-wide text-neutral-400">Scherm 1</div>
          <div className="text-xl font-mono">Eerste lijn: <span className="font-bold">{it.a}</span></div>
          <div className="text-xl font-mono">Tweede lijn: <span className="font-bold">{it.b}</span></div>
        </div>
      </div>
    );
  }

  // choice
  return Shell(
    <div className="relative rounded-2xl border bg-neutral-900 overflow-hidden p-6">
      <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
        <div
          key={"choice-" + idx}
          className="h-full bg-green-500 animate-barfill"
          style={{ animationDuration: `${CHOICE_MS}ms` }}
        />
      </div>
      <div className="space-y-6">
        <div className="text-sm text-neutral-400 text-center">
          Specifieer het aantal verschillen in de tweede lijn.
        </div>
        <div className="grid grid-cols-5 gap-3">
          {[0,1,2,3,4].map(n => (
            <Button key={n} onClick={() => choose(n)} className="w-full">[{n}]</Button>
          ))}
        </div>
        <p className="text-xs text-neutral-400 text-center">Toetsen: 0 / 1 / 2 / 3 / 4</p>
      </div>
    </div>
  );
}
