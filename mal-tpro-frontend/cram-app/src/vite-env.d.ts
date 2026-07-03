/// <reference types="vite/client" />

declare module "@partner" {
  import type { ComponentType } from "react";
  const App: ComponentType;
  export default App;
}

interface Window {
  storage?: {
    get(k: string): Promise<{ key: string; value: string; shared: boolean } | null>;
    set(k: string, v: string): Promise<{ key: string; value: string; shared: boolean }>;
    delete(k: string): Promise<{ key: string; deleted: boolean; shared: boolean }>;
    list(prefix?: string): Promise<{ keys: string[]; prefix: string; shared: boolean }>;
  };
}
