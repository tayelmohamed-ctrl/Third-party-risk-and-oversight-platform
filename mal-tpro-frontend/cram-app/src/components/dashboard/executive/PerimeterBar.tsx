import clsx from "clsx";
import { usePerimeter } from "../../../context/PerimeterContext";
import {
  corridorOptionsForPerimeter,
  PERIMETERS,
  type CompliancePerimeter,
  type CorridorFilter,
  type CustomerTypeFilter,
} from "../../../config/perimeters";

type Props = {
  compact?: boolean;
};

export function PerimeterSwitch({ compact }: Props) {
  const { perimeter, setPerimeter } = usePerimeter();

  return (
    <div
      className={clsx(
        "inline-flex items-center rounded-full border border-line bg-panel2 p-0.5 gap-0.5",
        compact ? "text-[10px]" : "text-[11px]",
      )}
      role="group"
      aria-label="Compliance perimeter"
    >
      {(Object.keys(PERIMETERS) as CompliancePerimeter[]).map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => setPerimeter(id)}
          className={clsx(
            "rounded-full px-2.5 py-1 font-semibold transition border-none cursor-pointer",
            perimeter === id
              ? id === "mal_bank"
                ? "bg-ai/20 text-white shadow-[inset_0_0_0_1px_rgba(169,83,223,.35)]"
                : "bg-sayed/20 text-white shadow-[inset_0_0_0_1px_rgba(57,185,237,.35)]"
              : "bg-transparent text-muted hover:text-ink",
          )}
          title={PERIMETERS[id].subtitle}
        >
          {PERIMETERS[id].label}
        </button>
      ))}
    </div>
  );
}

export function DashboardFilters() {
  const { customerType, setCustomerType, corridor, setCorridor, perimeter } = usePerimeter();

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className="text-[10px] uppercase tracking-wider text-faint font-semibold">Customer</span>
      {(["all", "individual", "sme"] as CustomerTypeFilter[]).map((t) => (
        <FilterChip
          key={t}
          active={customerType === t}
          onClick={() => setCustomerType(t)}
          label={t === "all" ? "All" : t === "individual" ? "Individual" : "SME"}
        />
      ))}
      <span className="text-faint mx-1">·</span>
      <span className="text-[10px] uppercase tracking-wider text-faint font-semibold">Corridor</span>
      {corridorOptionsForPerimeter(perimeter).map((c) => (
        <FilterChip
          key={c.id}
          active={corridor === c.id}
          onClick={() => setCorridor(c.id)}
          label={c.label}
        />
      ))}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold border cursor-pointer transition",
        active
          ? "bg-panel3 border-ai/40 text-ink"
          : "bg-transparent border-line text-muted hover:border-ai/30",
      )}
    >
      {label}
    </button>
  );
}
