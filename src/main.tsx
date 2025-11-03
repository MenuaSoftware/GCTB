import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";

import { Home } from "./pages/Home";
import { TestShell } from "./pages/TestShell";
import { Results } from "./pages/Results";
import PlaatsTest from "./pages/PlaatsTest";
import WoordTest from "./pages/WoordTest";
import ReasonTest from "./pages/ReasonTest";
import FoutTest from "./pages/FoutTest";

const router = createBrowserRouter([
  { path: "/", element: <Home /> },
  { path: "/test/plaats", element: <PlaatsTest /> },
  { path: "/test/woord",  element: <WoordTest /> },
  { path: "/test/rede",   element: <ReasonTest /> },
  { path: "/test/fout",   element: <FoutTest /> },
  { path: "/test/:id",    element: <TestShell /> },
  { path: "/result/:id",  element: <Results /> },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
