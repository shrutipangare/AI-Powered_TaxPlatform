"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Lightweight "preview as client" toggle — not a real auth/role system, just
// enough to demonstrate that return status (challenge 06) is legible to
// both audiences from the same underlying data, with appropriate detail
// per audience rather than two separate products.
export type ViewMode = "staff" | "client";

const ViewModeContext = createContext<{
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
} | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>("staff");
  return (
    <ViewModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const ctx = useContext(ViewModeContext);
  if (!ctx) throw new Error("useViewMode must be used inside ViewModeProvider");
  return ctx;
}
