import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

/** ---------- Model ---------- */
type ThemeId = "speed" | "distance" | "height" | "weight" | "size" | "leftright";

type Theme = {
  id: ThemeId;
  pool: string[];                       // kandidaten (we kiezen er 3 uit)
  greaterTxt: string;                   // “X <greater> dan Y”  => X > Y
  lesserTxt: string;                    // “X <lesser> dan Y”   => X < Y
  askMax: string;                       // vraag voor maximum
  askMin: string;                       // vraag voor minimum
  // voor leftright gebruiken we eigen tekst (links/rechts)
};

const THEMES: Theme[] = [
  {
    id: "speed",
    pool: ["Helikopter", "Veerboot", "Tram", "Truck"],
    greaterTxt: "vlugger dan",
    lesserTxt: "trager dan",
    askMax: "Wat is vlugst?",
    askMin: "Wat is traagst?",
  },
  {
    id: "distance",
    pool: ["Berg", "Bos", "Meer", "Rivier"],
    greaterTxt: "verder dan",
    lesserTxt: "dichterbij dan",
    askMax: "Wat is verst?",
    askMin: "Wat is dichtst bij?",
  },
  {
    id: "height",
    pool: ["Brug", "Kerk", "Boom"],
    greaterTxt: "hoger dan",
    lesserTxt: "lager dan",
    askMax: "Wat is hoogst?",
    askMin: "Wat is laagst?",
  },
  {
    id: "weight",
    pool: ["Helm", "Bajonet", "Geweer"],
    greaterTxt: "zwaarder dan",
    lesserTxt: "lichter dan",
    askMax: "Wat is zwaarst?",
    askMin: "Wat is lichtst?",
  },
  {
    id: "size",
    pool: ["Politieman", "Pompier", "Piloot"],
    greaterTxt: "groter dan",
    lesserTxt: "kleiner dan",
    askMax: "Wie is de grootste?",
    askMin: "Wie is kleinst?",
  },
  // leftright heeft eigen zinnen (“links van” / “rechts van”)
  {
    id: "leftright",
    pool: ["Patrouille", "Regiment", "Compagnie"],
    greaterTxt: "rechts van", // groter = meer naar rechts
    lesserTxt: "links van",
    askMax: "Wat is verst naar rechts?",
    askMin: "Wat is verst naar links?",
  },
];

/** ---------- RNG helpers ---------- */
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
const sample3 = (rng: () => number, arr: string[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, 3);
};

/** ---------- Item generator ---------- */
type Item = {
  theme: ThemeId;
  statements: [string, string];
  question: string;
  options: string[];   // lengte 3
  correct: string;     // exact label in options
};

const VIEW_MS = 8000;
const CHOICE_MS = 10000;

function makeItem(seed: number): Item {
  const rng = mulberry32(seed);
  const theme = pick(rng, THEMES);

  // kies 3 kandidaten en een totale orde (low < mid < high)
  const [A, B, C] = sample3(rng, theme.pool);
  const order = sample3(rng, [A, B, C]); // willekeurig
  const low = order[0], mid = order[1], high = order[2];

  const askMax = rng() < 0.5;

  // statements: maak twee vergelijkingen die de keten impliceren
  let s1 = "", s2 = "";

  if (theme.id === "leftright") {
    // waarde = x-positie; low = meest links, high = meest rechts
    // “mid rechts van low” + “mid links van high”
    s1 = `${mid} ${theme.greaterTxt} ${low}`;  // rechts van
    s2 = `${mid} ${theme.lesserTxt} ${high}`;  // links van
  } else {
    // voor overige thema’s (scalar)
    // toevallig kiezen of we de ‘greater’ of ‘lesser’ formulering gebruiken,
    // maar steeds consistent met de orde.
    const useLesser1 = rng() < 0.5;
    const useLesser2 = rng() < 0.5;

    // mid vs low
    s1 = useLesser1
      ? `${low} ${theme.lesserTxt} ${mid}`     // low < mid
      : `${mid} ${theme.greaterTxt} ${low}`;   // mid > low
    // high vs mid
    s2 = useLesser2
      ? `${mid} ${theme.lesserTxt} ${high}`    // mid < high
      : `${high} ${theme.greaterTxt} ${mid}`;  // high > mid
  }

  const question = askMax ? theme.askMax : theme.askMin;
  const correct = askMax ? high : low;

  // shuffle opties
  const opts = sample3(rng, [A, B, C]);

  return {
    theme: theme.id,
    statements: [s1, s2],
    question,
    options: opts,
    correct,
  };
}

/** ---------- Component ---------- */
export default function ReasonTest() {
  const [phase, setPhase] = useState<"intro" | "item" | "choice" | "done">("intro");
  const [seed, setSeed] = useState(Date.now());
  const [idx, setIdx] = useState(0);
  const [log, setLog] = useState<{ idx: number; guess: string; correct: string; item: Item }[]>([]);
  const timer = useRef<number | null>(null);
  const navigate = useNavigate();

  const items = useMemo(() => Array.from({ length: 12 }, (_, i) => makeItem(seed + i)), [seed]);
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
    setPhase("item");
    timer.current = window.setTimeout(() => setPhase("choice"), VIEW_MS);
  }

  useEffect(() => {
    if (phase === "item") {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setPhase("choice"), VIEW_MS);
    }
    if (phase === "choice") {
      if (timer.current) clearTimeout(timer.current);
      timer.current = window.setTimeout(() => choose("⏱"), CHOICE_MS);
    }
  }, [phase, idx]);

  function next() {
    if (idx < items.length - 1) {
      setIdx(idx + 1);
      setPhase("item");
    } else {
      setPhase("done");
    }
  }

  function choose(guess: string) {
    if (timer.current) clearTimeout(timer.current);
    setLog((l) => [...l, { idx, guess, correct: it.correct, item: it }]);
    next();
  }

  // keyboard (1/2/3)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "choice") return;
      if (e.key === "1") choose(it.options[0]);
      if (e.key === "2") choose(it.options[1]);
      if (e.key === "3") choose(it.options[2]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, it]);

  const HomeBtn = (
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
        {HomeBtn}
        {node}
      </div>
    </div>
  );

  if (phase === "intro") {
    return Shell(
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">REDENEERTEST</h2>
        <p className="text-sm text-neutral-400">
          Lees twee zinnen. Beantwoord vervolgens de vraag door één van de drie antwoorden te kiezen.
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
                <th className="p-2 text-left">Zin 1</th>
                <th className="p-2 text-left">Zin 2</th>
                <th className="p-2 text-left">Vraag</th>
                <th className="p-2 text-left">Juiste</th>
                <th className="p-2 text-left">Jouw</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r) => (
                <tr key={r.idx} className={r.guess !== r.correct ? "bg-red-900/20" : ""}>
                  <td className="p-2">{r.idx + 1}</td>
                  <td className="p-2">{r.item.statements[0]}</td>
                  <td className="p-2">{r.item.statements[1]}</td>
                  <td className="p-2">{r.item.question}</td>
                  <td className="p-2">{r.item.correct}</td>
                  <td className="p-2">{r.guess}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button onClick={() => setPhase("intro")}>Opnieuw</Button>
      </div>
    );
  }

  // ITEM: toon 2 zinnen
  if (phase === "item") {
    return Shell(
      <>
        <div className="relative h-56 rounded-2xl border bg-neutral-900 grid place-items-center overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
            <div
              key={"item-" + idx}
              className="h-full bg-green-500 animate-barfill"
              style={{ animationDuration: `${VIEW_MS}ms` }}
            />
          </div>
          <div className="grid place-items-center gap-2 text-center">
            <div className="text-lg">{it.statements[0]}</div>
            <div className="text-lg">{it.statements[1]}</div>
            <div className="mt-2 text-sm text-neutral-400">{it.question}</div>
          </div>
        </div>
        <div className="mt-2 text-right text-sm text-neutral-400">
          {idx + 1}/{items.length}
        </div>
      </>
    );
  }

  // CHOICE
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
        <div className="grid gap-6 place-items-center text-center">
          <div className="text-sm text-neutral-400">Vraag</div>
          <div className="text-xl">{it.question}</div>
          <div className="flex gap-3">
            {it.options.map((opt, i) => (
              <Button key={opt} onClick={() => choose(opt)}>
                {opt} ({i + 1})
              </Button>
            ))}
          </div>
          <div className="text-xs text-neutral-400">Toetsen: 1 / 2 / 3</div>
        </div>
      </div>
      <div className="mt-2 text-right text-sm text-neutral-400">
        {idx + 1}/{items.length}
      </div>
    </>
  );
}
