import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import "@forge/blocks/styles.css";
import "@forge/player/styles.css";
import "./ui/styles.css";

import { queryClient } from "./state/queryClient.js";
import { App } from "./ui/App.js";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
