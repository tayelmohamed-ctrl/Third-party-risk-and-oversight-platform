import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { ActivityRegisterOption } from "../../lib/activityRegisterIndex";
import { searchActivities } from "../../lib/activityRegisterIndex";
import type { CompliancePerimeter } from "../../config/perimeters";

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="act-search__mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function ActivitySearchCombobox({
  perimeter,
  value,
  onChange,
  placeholder = "Search business activities…",
  disabled,
}: {
  perimeter: CompliancePerimeter;
  value: ActivityRegisterOption | null;
  onChange: (option: ActivityRegisterOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () => searchActivities(query, perimeter, 14),
    [query, perimeter],
  );

  useEffect(() => {
    if (value) setQuery(value.label);
  }, [value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, perimeter]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const select = useCallback(
    (opt: ActivityRegisterOption) => {
      onChange(opt);
      setQuery(opt.label);
      setOpen(false);
    },
    [onChange],
  );

  const clear = () => {
    onChange(null);
    setQuery("");
    inputRef.current?.focus();
  };

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[activeIndex]) {
      e.preventDefault();
      select(results[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="act-search" ref={rootRef}>
      <div className={`act-search__input-wrap ${open ? "act-search__input-wrap--open" : ""}`}>
        <Search size={16} className="act-search__icon" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          className="act-search__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={placeholder}
          disabled={disabled}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button type="button" className="act-search__clear" onClick={clear} aria-label="Clear">
            <X size={14} />
          </button>
        )}
      </div>

      {open && !disabled && (
        <ul id={listId} className="act-search__list" role="listbox">
          {results.length === 0 ? (
            <li className="act-search__empty">No activities match — try a different keyword or ISIC code</li>
          ) : (
            results.map((opt, i) => (
              <li key={opt.id} role="option" aria-selected={i === activeIndex}>
                <button
                  type="button"
                  className={`act-search__option ${i === activeIndex ? "act-search__option--active" : ""}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => select(opt)}
                >
                  <div className="act-search__option-label">
                    {highlightMatch(opt.label, query)}
                  </div>
                  <div className="act-search__option-sub">{opt.subtitle}</div>
                  <div className="act-search__option-group">{opt.group}</div>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      {value && (
        <div className="act-search__selected">
          Selected: <b>{value.label}</b>
          {value.rakezCode && <span className="mono text-faint"> · {value.rakezCode}</span>}
        </div>
      )}
    </div>
  );
}
