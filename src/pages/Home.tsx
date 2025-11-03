import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

const tests = [
  { id: "arith",  title: "GETALVAARDIGHEIDSTEST",  desc: "Vergelijk twee uitkomsten: S1/S2/G." },
  { id: "plaats", title: "PLAATSBEPALINGSTEST",    desc: "Onthoud en kies de juiste pijlencombinatie." },
  { id: "woord",  title: "WOORDGEHEUGENTEST",      desc: "Onthoud 3 regels, kies 0–3 overeenkomsten." },
  { id: "t3", title: "Test 3", desc: "Placeholder." },
  { id: "t4", title: "Test 4", desc: "Placeholder." },
  { id: "t5", title: "Test 5", desc: "Placeholder." },
  { id: "t6", title: "Test 6", desc: "Placeholder." },
];

export function Home() {
  return (
    <div className="min-h-screen grid place-items-center bg-neutral-50 dark:bg-neutral-950 text-white">
      <div className="container">
        <h1 className="text-3xl font-bold text-center mb-8">GCTB Oefenapp</h1>

        <div className="mx-auto grid max-w-5xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tests.map((t) => {
            // Special-case paden die niet via TestShell gaan
            const path =
              t.id === "plaats" ? "/test/plaats" :
              t.id === "woord"  ? "/test/woord"  :
              `/test/${t.id}`;

            return (
              <Card key={t.id}>
                <CardHeader>
                  <CardTitle>{t.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <p className="text-sm text-neutral-500">{t.desc}</p>
                  <Link to={path} className="w-full">
                    <Button className="w-full">Start</Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
