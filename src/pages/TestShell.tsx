import { useParams } from "react-router-dom";
import { getTest } from "../engine/testRegistry";
import { Runner } from "../engine/runner";

export function TestShell() {
  const { id } = useParams<{ id: string }>();
  const config = id ? getTest(id) : null;
  if (!config) return <div className="p-6">Test niet gevonden.</div>;

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-neutral-50 dark:bg-neutral-950">
      <div className="w-full max-w-3xl">
        <Runner config={config} />
      </div>
    </div>
  );
}
