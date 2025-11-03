import { useEffect, useRef, useState } from "react";
import type { TestConfig, Stimulus } from "./testTypes";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

type OuterPhase = "intro" | "practice" | "done";
type ItemPhase = "scherm1" | "scherm2" | "choice";

const VIEW_MS = 3000;
const CHOICE_MS = 5000;

interface Props {
  config: TestConfig;
}

export function Runner({ config }: Props) {
  const [phase, setPhase] = useState<OuterPhase>("intro");
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [idx, setIdx] = useState(0);
  const [itemPhase, setItemPhase] = useState<ItemPhase>("scherm1");
  const [log, setLog] = useState<any[]>([]);
  const timerRef = useRef<number | null>(null);
  const navigate = useNavigate(); // ← navigation hook

  const current = stimuli[idx] as any;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (itemPhase !== "choice") return;
      const k = e.key.toLowerCase();
      if (k === "b" || k === "1") handleResponse("S1");
      if (k === "o" || k === "2") handleResponse("S2");
      if (k === "g" || k === "3") handleResponse("G");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function start() {
    const items = config.generator(Date.now());
    setStimuli(items.slice(0, config.practiceCount));
    setIdx(0);
    setItemPhase("scherm1");
    setPhase("practice");
  }

  useEffect(() => {
    if (phase !== "practice") return;
    clearTimer();
    if (itemPhase === "scherm1")
      timerRef.current = window.setTimeout(() => setItemPhase("scherm2"), VIEW_MS);
    else if (itemPhase === "scherm2")
      timerRef.current = window.setTimeout(() => setItemPhase("choice"), VIEW_MS);
    else if (itemPhase === "choice")
      timerRef.current = window.setTimeout(() => handleResponse("TIME"), CHOICE_MS);
    return clearTimer;
  }, [itemPhase, phase]);

  function nextItem() {
    const next = idx + 1;
    if (next < stimuli.length) {
      setIdx(next);
      setItemPhase("scherm1");
    } else {
      setPhase("done");
    }
  }

  function handleResponse(resp: string) {
    if (phase !== "practice" || !current) return;
    clearTimer();

    const correct = resp === current.correct;
    setLog((l) => [...l, { idx, stim: current, resp, correct }]);
    nextItem();
  }

  /* ---- fixed button (always visible) ---- */
  const HomeButton = (
    <Button
      variant="ghost"
      onClick={() => navigate("/")}
      className="fixed top-4 left-4 z-50 bg-neutral-900/70 hover:bg-neutral-800 text-white rounded-xl text-sm px-4 py-2"
    >
      ← Home
    </Button>
  );

  /* ---- RENDER ---- */
  if (phase === "intro") {
    return (
      <div className="space-y-4 text-white relative">
        {HomeButton}
        <h2 className="text-xl font-semibold">{config.title}</h2>
        <pre className="whitespace-pre-wrap text-sm text-neutral-600">
          {config.instructionsMD}
        </pre>
        <Button onClick={start}>Oefenen</Button>
      </div>
    );
  }

  if (phase === "done") {
    const correctCount = log.filter((x) => x.correct).length;
    return (
      <div className="space-y-6 text-white relative">
        {HomeButton}
        <h3 className="text-xl font-semibold">
          Resultaten: {correctCount}/{log.length} correct
        </h3>
        <div className="rounded-xl border overflow-hidden bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">Scherm 1</th>
                <th className="p-2 text-left">Scherm 2</th>
                <th className="p-2 text-left">Juiste</th>
                <th className="p-2 text-left">Jouw</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r) => (
                <tr
                  key={r.idx}
                  className={!r.correct ? "bg-red-900/20" : ""}
                >
                  <td className="p-2">{r.idx + 1}</td>
                  <td className="p-2 font-mono">{r.stim.scherm1.text}</td>
                  <td className="p-2 font-mono">{r.stim.scherm2.text}</td>
                  <td className="p-2">{r.stim.correct}</td>
                  <td className="p-2">{r.resp === "TIME" ? "⏱" : r.resp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button onClick={() => { setPhase("intro"); setLog([]); }}>Opnieuw</Button>
      </div>
    );
  }

  const text =
    itemPhase === "scherm1"
      ? current?.scherm1?.text
      : itemPhase === "scherm2"
      ? current?.scherm2?.text
      : "Welke uitkomst is groter?";

  const duration = itemPhase === "choice" ? CHOICE_MS : VIEW_MS;

  return (
    <div className="space-y-5 text-white relative">
      {HomeButton}

      <div className="relative h-56 rounded-2xl border bg-neutral-900 grid place-items-center overflow-hidden">
        <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden bg-transparent">
          <div
            key={itemPhase}
            className="h-full bg-green-500 animate-barfill"
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>

        {itemPhase === "choice" ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-lg text-white">{text}</p>
            <div className="flex gap-3">
              <Button onClick={() => handleResponse("S1")}>S1 (1)</Button>
              <Button onClick={() => handleResponse("S2")}>S2 (2)</Button>
              <Button onClick={() => handleResponse("G")}>G (3)</Button>
            </div>
            <p className="text-xs text-neutral-400">
              Gebruik toetsen 1 / 2 / 3 of klik op de knoppen
            </p>
          </div>
        ) : (
          <span className="text-3xl font-mono">{text}</span>
        )}
      </div>

      <div className="flex justify-between text-sm text-neutral-400">
        <span>
          Item {idx + 1}/{stimuli.length}
        </span>
        <span>Fase: {itemPhase}</span>
      </div>
    </div>
  );
}
