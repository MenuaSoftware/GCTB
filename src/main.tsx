import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import { Home } from "./pages/Home";
import { TestShell } from "./pages/TestShell";
import { Results } from "./pages/Results";
import PlaatsTest from "./pages/PlaatsTest";
import WoordTest from "./pages/WoordTest"; // ← NIEUW

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  // specifieke routes EERST
  { path: "/test/plaats", element: <PlaatsTest /> },
  { path: "/test/woord", element: <WoordTest /> },   // ← NIEUW
  // overige tests via shell (bv. arith)
  { path: "/test/:id", element: <TestShell /> },
  { path: "/result/:id", element: <Results /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
