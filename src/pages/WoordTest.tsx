import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";
import { BANK, ALL_CATEGORIES, type Category } from "../data/wordbank";

type Phase = "intro" | "rules" | "choice" | "done";

const VIEW_MS = 6000;
const CHOICE_MS = 8000;

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: () => number, arr: T[]) => arr[Math.floor(rng() * arr.length)];
const pickOther = <T,>(rng: () => number, arr: T[], not: T) =>
  pick(rng, arr.filter((x) => x !== not));

type Item = {
  rules: Category[];
  words: string[];
  correctCount: 0 | 1 | 2 | 3;
};

function genItem(seed: number): Item {
  const r = mulberry32(seed);

  const rules: Category[] = [
    pick(r, ALL_CATEGORIES),
    pick(r, ALL_CATEGORIES),
    pick(r, ALL_CATEGORIES),
  ];

  const correctCount = Math.floor(r() * 4) as 0 | 1 | 2 | 3;

  const idxs = [0, 1, 2];
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  const matchIdx = new Set(idxs.slice(0, correctCount));

  const words: string[] = [0, 1, 2].map((i) => {
    const cat = rules[i];
    if (matchIdx.has(i)) {
      return pick(r, BANK[cat]);
    } else {
      const otherCat = pickOther(r, ALL_CATEGORIES, cat);
      return pick(r, BANK[otherCat]);
    }
  });

  if (r() < 0.35) {
    const a = Math.floor(r() * 3);
    let b = Math.floor(r() * 3);
    if (a === b) b = (b + 1) % 3;
    [words[a], words[b]] = [words[b], words[a]];
  }

  return { rules, words, correctCount };
}

export default function WoordTest() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [seed, setSeed] = useState(Date.now());
  const [idx, setIdx] = useState(0);
  const [log, setLog] = useState<{ idx: number; guess: number; correct: number; item: Item }[]>([]);
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
    setPhase("rules");
    timer.current = window.setTimeout(() => setPhase("choice"), VIEW_MS);
  }

  useEffect(() => {
    if (phase === "rules") {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPhase("choice"), VIEW_MS);
    }
    if (phase === "choice") {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(() => choose(-1), CHOICE_MS);
    }
  }, [phase, idx]);

  function next() {
    if (idx < items.length - 1) {
      setIdx(idx + 1);
      setPhase("rules");
    } else {
      setPhase("done");
    }
  }

  function choose(guess: number) {
    if (timer.current) clearTimeout(timer.current);
    setLog((l) => [...l, { idx, guess, correct: it.correctCount, item: it }]);
    next();
  }

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
      </div>
    </div>
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "choice") return;
      if (["0", "1", "2", "3"].includes(e.key)) choose(parseInt(e.key, 10));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase]);

  if (phase === "intro") {
    return Shell(
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">WOORDGEHEUGENTEST</h2>
        <p className="text-sm text-neutral-400">
          Scherm 1: onthoud drie regels in volgorde. Scherm 2: beslis hoeveel woorden
          op dezelfde positie overeenkomen met hun regel. Antwoord 0–3.
        </p>
        <Button onClick={start}>Oefenen</Button>
      </div>
    );
  }

  if (phase === "done") {
    const ok = log.filter((r) => r.guess === r.correct).length;
    return Shell(
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Resultaten: {ok}/{log.length} correct</h3>
        <div className="rounded-2xl border overflow-hidden bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Regels</th>
                <th className="p-2 text-left">Woorden</th>
                <th className="p-2 text-left">Juiste</th>
                <th className="p-2 text-left">Jouw</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r) => (
                <tr key={r.idx} className={r.guess !== r.correct ? "bg-red-900/20" : ""}>
                  <td className="p-2">{r.idx + 1}</td>
                  <td className="p-2">{r.item.rules.join(" • ")}</td>
                  <td className="p-2">{r.item.words.join(" • ")}</td>
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

  if (phase === "rules") {
    return Shell(
      <>
        <div className="relative h-56 rounded-2xl border bg-neutral-900 grid place-items-center overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
            <div
              key={"rules-" + idx}
              className="h-full bg-green-500 animate-barfill"
              style={{ animationDuration: `${VIEW_MS}ms` }}
            />
          </div>
          <div className="grid gap-2 place-items-center">
            <div className="text-sm uppercase tracking-wide text-neutral-400">REGELS</div>
            <div className="text-2xl font-mono">
              {it.rules[0]} • {it.rules[1]} • {it.rules[2]}
            </div>
            <div className="text-xs text-neutral-400">Onthoud de volgorde</div>
          </div>
        </div>

        <div className="mt-2 text-right text-sm text-neutral-400">
          {idx + 1}/{items.length}
        </div>
      </>
    );
  }

  return Shell(
    <>
      <div className="relative rounded-2xl border bg-neutral-900 overflow-hidden p-6">
        <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
          <div
            key={"choice-" + idx}
            className="h-full bg-green-500 animate-barfill"
            style={{ animationDuration: `${CHOICE_MS}ms` }}
          />
        </div>
        <div className="space-y-6">
          <div className="grid gap-2 place-items-center">
            <div className="text-sm uppercase tracking-wide text-neutral-400">WOORDEN</div>
            <div className="text-2xl font-mono">
              {it.words[0]} • {it.words[1]} • {it.words[2]}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((n) => (
              <Button key={n} onClick={() => choose(n)} className="w-full">
                [{n}]
              </Button>
            ))}
          </div>
          <p className="text-xs text-neutral-400 text-center">Toetsenbord: 0 / 1 / 2 / 3</p>
        </div>
      </div>

      <div className="mt-2 text-right text-sm text-neutral-400">
        {idx + 1}/{items.length}
      </div>
    </>
  );
}
