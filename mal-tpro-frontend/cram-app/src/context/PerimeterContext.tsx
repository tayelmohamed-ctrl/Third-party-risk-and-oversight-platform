import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CompliancePerimeter, CorridorFilter, CustomerTypeFilter } from "../config/perimeters";
import { isCorridorValidForPerimeter } from "../config/perimeters";

const STORAGE_KEY = "mal-fincrime-perimeter";

interface PerimeterContextValue {
  perimeter: CompliancePerimeter;
  setPerimeter: (p: CompliancePerimeter) => void;
  customerType: CustomerTypeFilter;
  setCustomerType: (t: CustomerTypeFilter) => void;
  corridor: CorridorFilter;
  setCorridor: (c: CorridorFilter) => void;
}

const PerimeterContext = createContext<PerimeterContextValue | null>(null);

function readStoredPerimeter(): CompliancePerimeter {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "global_account" || v === "mal_bank") return v;
  } catch {
    /* ignore */
  }
  return "mal_bank";
}

export function PerimeterProvider({ children }: { children: ReactNode }) {
  const [perimeter, setPerimeterState] = useState<CompliancePerimeter>(readStoredPerimeter);
  const [customerType, setCustomerType] = useState<CustomerTypeFilter>("all");
  const [corridor, setCorridor] = useState<CorridorFilter>("all");

  const setPerimeter = useCallback((p: CompliancePerimeter) => {
    setPerimeterState(p);
    setCorridor((current) => (isCorridorValidForPerimeter(p, current) ? current : "all"));
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ perimeter, setPerimeter, customerType, setCustomerType, corridor, setCorridor }),
    [perimeter, setPerimeter, customerType, corridor],
  );

  return <PerimeterContext.Provider value={value}>{children}</PerimeterContext.Provider>;
}

export function usePerimeter(): PerimeterContextValue {
  const ctx = useContext(PerimeterContext);
  if (!ctx) throw new Error("usePerimeter requires PerimeterProvider");
  return ctx;
}
