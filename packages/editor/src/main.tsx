import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

// Anvil (tool chrome) loads first so editor css wins specificity ties;
// blocks/player css skin learner content only (--forge-*/--fb-*).
// fonts.css declares Geist Sans + JetBrains Mono @font-face and falls back
// gracefully until packages/ui/scripts/fetch-fonts.mjs has been run once.
import "@forge/ui/fonts.css";
import "@forge/ui/anvil.css";
import "@forge/ui/components.css";
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
