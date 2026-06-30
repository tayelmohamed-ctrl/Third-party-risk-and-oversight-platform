import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { PLATFORM_USERS, type PlatformUserId } from "../config/platformUsers";
import { getPlatformUser, getPlatformUserId, setPlatformUser } from "../lib/authSession";

export default function UserAccessSwitcher() {
  const [userId, setUserId] = useState<PlatformUserId>(() => getPlatformUserId());
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = getPlatformUser();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function select(id: PlatformUserId) {
    setPlatformUser(id);
    setUserId(id);
    setOpen(false);
    window.location.reload();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-2 py-1 rounded-lg border border-line bg-panel2 hover:bg-panel3 transition text-left"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2a2350] to-[#16203e] border border-line grid place-items-center font-bold text-xs text-[#cfc8ff] shrink-0">
          {user.initials}
        </div>
        <div className="text-[12px] max-md:hidden min-w-0">
          <b className="block truncate">{user.name}</b>
          <div className="text-muted text-[10.5px] truncate">{user.title}</div>
        </div>
        <ChevronDown size={14} className="text-muted shrink-0 max-md:hidden" aria-hidden />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1.5 w-[300px] z-50 rounded-xl border border-line bg-panel shadow-2xl overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-lineSoft text-[10px] text-faint uppercase tracking-wide">
            Switch access profile
          </div>
          {PLATFORM_USERS.map((u) => (
            <button
              key={u.id}
              type="button"
              role="option"
              aria-selected={u.id === userId}
              onClick={() => select(u.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-lineSoft last:border-0 hover:bg-panel2 transition ${
                u.id === userId ? "bg-ai/10" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-panel3 border border-line grid place-items-center text-[10px] font-bold text-[#cfc8ff]">
                  {u.initials}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold">{u.name}</div>
                  <div className="text-[10.5px] text-muted">{u.title}</div>
                </div>
              </div>
              <div className="text-[10px] text-faint mt-1.5 ml-9">{u.roles.join(" · ")}</div>
            </button>
          ))}
          <div className="px-3 py-2 text-[10px] text-faint bg-panel2">
            Dev mode — maps to Bearer token roles. Production uses bank IdP (OIDC).
          </div>
        </div>
      )}
    </div>
  );
}
