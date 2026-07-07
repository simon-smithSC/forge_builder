// Ambient declarations for Vite-provided module shapes. Kept hand-rolled so
// tsc (NodeNext) typechecks without depending on vite/client resolution.

declare module "*.css";

interface ImportMetaEnv {
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
