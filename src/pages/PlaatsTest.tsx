import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { ArrowImg } from "../components/ArrowImg";
import { useNavigate } from "react-router-dom";

type Color = "b" | "w";
type Dir = "left_up" | "left_down" | "right_up" | "right_down";
type Tile = { top: { color: Color; dir: Dir }; bottom: { color: Color; dir: Dir } };

const VIEW_MS = 8000;
const CHOICE_MS = 10000;

const DIR_LABEL: Record<Dir, string> = {
  right_up: "RECHTS OP",
  left_up: "LINKS OP",
  right_down: "RECHTS NEER",
  left_down: "LINKS NEER",
};
const COLOR_LABEL: Record<Color, string> = { b: "ZWART", w: "WIT" };

// RNG helpers
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = <T,>(rng: () => number, arr: T[]) => arr[Math.floor(rng() * arr.length)];
const shuffle = <T,>(rng: () => number, a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ------------------------------------------------------------------
// Generator met balans + moeilijkere afleiders
// ------------------------------------------------------------------
function genItem(seed: number) {
  const r = mulberry32(seed);
  const colors: Color[] = ["b", "w"];
  const dirs: Dir[] = ["left_up", "left_down", "right_up", "right_down"];

  // 90% kans op verschillende kleuren
  const diffColor = r() < 0.9;
  const topColor: Color = pick(r, colors);
  const botColor: Color = diffColor ? (topColor === "b" ? "w" : "b") : topColor;

  const topDir: Dir = pick(r, dirs);
  const botDir: Dir = pick(r, dirs);

  const correct: Tile = {
    top: { color: topColor, dir: topDir },
    bottom: { color: botColor, dir: botDir },
  };

  // 50% kans op omgekeerde tekstvolgorde
  const swappedOrder = r() < 0.5;

  // Afleiders die lijken op correcte oplossing
  const tiles: Tile[] = [correct];
  const used = new Set<string>();
  used.add(`${topColor}-${botColor}-${topDir}-${botDir}`);

  while (tiles.length < 6) {
    const changeColorTop = r() < 0.3;
    const changeColorBottom = r() < 0.3;
    const changeDirTop = r() < 0.5;
    const changeDirBottom = r() < 0.5;

    const t: Tile = {
      top: {
        color: changeColorTop ? (topColor === "b" ? "w" : "b") : topColor,
        dir: changeDirTop ? pick(r, dirs.filter((d) => d !== topDir)) : topDir,
      },
      bottom: {
        color: changeColorBottom ? (botColor === "b" ? "w" : "b") : botColor,
        dir: changeDirBottom ? pick(r, dirs.filter((d) => d !== botDir)) : botDir,
      },
    };

    const key = `${t.top.color}-${t.bottom.color}-${t.top.dir}-${t.bottom.dir}`;
    if (!used.has(key)) {
      used.add(key);
      tiles.push(t);
    }
  }

  shuffle(r, tiles);

  const answer = tiles.findIndex(
    (t) =>
      t.top.color === correct.top.color &&
      t.top.dir === correct.top.dir &&
      t.bottom.color === correct.bottom.color &&
      t.bottom.dir === correct.bottom.dir
  );

  return {
    rules: { topColor, botColor, topDir, botDir, swappedOrder },
    tiles,
    answer,
  };
}

// ------------------------------------------------------------------
// Component
// ------------------------------------------------------------------
export default function PlaatsTest() {
  const [phase, setPhase] = useState<"intro" | "rules" | "choice" | "done">("intro");
  const [seed, setSeed] = useState(Date.now());
  const [idx, setIdx] = useState(0);
  const [log, setLog] = useState<{ idx: number; pick: number; correct: number }[]>([]);
  const timer = useRef<number | null>(null);
  const navigate = useNavigate();

  const items = useMemo(() => Array.from({ length: 12 }, (_, i) => genItem(seed + i)), [seed]);
  const it = items[idx];

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

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
      timer.current = window.setTimeout(() => pickTile(-1), CHOICE_MS);
    }
  }, [phase, idx]);

  function pickTile(pick: number) {
    if (timer.current) clearTimeout(timer.current);
    setLog((l) => [...l, { idx, pick, correct: it.answer }]);
    if (idx < items.length - 1) {
      setIdx(idx + 1);
      setPhase("rules");
    } else {
      setPhase("done");
    }
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

  // Shell-layout — identiek aan Runner
  const Shell = (children: React.ReactNode) => (
    <div className="min-h-screen grid place-items-center p-6 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-3xl text-white relative">
        {HomeButton}
        {children}
      </div>
    </div>
  );

  // ------------------------ Fases ------------------------
  if (phase === "intro") {
    return Shell(
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">PLAATSBEPALINGSTEST</h2>
        <p className="text-sm text-neutral-400">
          Scherm 1 toont twee regels (kleur en richting, BOVEN/ONDER). Onthoud ze.
          Scherm 2: kies de enige tegel die beide regels volgt.
        </p>
        <Button onClick={start}>Oefenen</Button>
      </div>
    );
  }

  if (phase === "done") {
    const ok = log.filter((r) => r.pick === r.correct).length;
    return Shell(
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">
          Resultaten: {ok}/{log.length} correct
        </h3>
        <div className="rounded-2xl border overflow-hidden bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Kleurenregel</th>
                <th className="p-2 text-left">Richtingsregel</th>
                <th className="p-2 text-left">Juiste</th>
                <th className="p-2 text-left">Jouw</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r) => (
                <tr key={r.idx} className={r.pick !== r.correct ? "bg-red-900/20" : ""}>
                  <td className="p-2">{r.idx + 1}</td>
                  <td className="p-2">
                    {COLOR_LABEL[items[r.idx].rules.topColor]} BOVEN {COLOR_LABEL[items[r.idx].rules.botColor]}
                  </td>
                  <td className="p-2">
                    {DIR_LABEL[items[r.idx].rules.topDir]} BOVEN {DIR_LABEL[items[r.idx].rules.botDir]}
                  </td>
                  <td className="p-2">{r.correct + 1}</td>
                  <td className="p-2">{r.pick < 0 ? "⏱" : r.pick + 1}</td>
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
      <div className="relative h-56 rounded-2xl border bg-neutral-900 grid place-items-center overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
          <div
            key={"rules-" + idx}
            className="h-full bg-green-500 animate-barfill"
            style={{ animationDuration: `${VIEW_MS}ms` }}
          />
        </div>

        <div className="grid place-items-center gap-3">
          {it.rules.swappedOrder ? (
            <>
              <div className="text-2xl font-mono">
                {DIR_LABEL[it.rules.topDir]} BOVEN {DIR_LABEL[it.rules.botDir]}
              </div>
              <div className="text-2xl font-mono">
                {COLOR_LABEL[it.rules.topColor]} BOVEN {COLOR_LABEL[it.rules.botColor]}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-mono">
                {COLOR_LABEL[it.rules.topColor]} BOVEN {COLOR_LABEL[it.rules.botColor]}
              </div>
              <div className="text-2xl font-mono">
                {DIR_LABEL[it.rules.topDir]} BOVEN {DIR_LABEL[it.rules.botDir]}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Choice-phase
  return Shell(
    <div className="relative rounded-2xl border bg-neutral-900 overflow-hidden p-6">
      <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
        <div
          key={"choice-" + idx}
          className="h-full bg-green-500 animate-barfill"
          style={{ animationDuration: `${CHOICE_MS}ms` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {it.tiles.map((t, i) => (
          <button
            key={i}
            onClick={() => pickTile(i)}
            className="rounded-xl border border-neutral-700 hover:border-neutral-400 p-3 bg-white"
          >
            <div className="flex flex-col items-center gap-2">
              <ArrowImg color={t.top.color} dir={t.top.dir} />
              <ArrowImg color={t.bottom.color} dir={t.bottom.dir} />
            </div>
            <div className="mt-2 text-[10px] text-neutral-600 text-center">Optie {i + 1}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
