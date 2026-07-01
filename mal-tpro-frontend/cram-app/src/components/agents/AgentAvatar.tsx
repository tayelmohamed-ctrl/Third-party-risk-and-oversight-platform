import { AGENTS, type AgentId } from "../../config/agents";

export type AgentAvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

const SIZES: Record<AgentAvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 42,
  lg: 56,
  xl: 72,
};

export interface AgentAvatarProps {
  agent: AgentId;
  size?: AgentAvatarSize;
  /** Pulsing ring — agent is active / working */
  active?: boolean;
  className?: string;
}

/** Distinct character avatar — Sayed (male), Mohsen (male), Jana (female). */
export default function AgentAvatar({ agent, size = "md", active = false, className = "" }: AgentAvatarProps) {
  const px = SIZES[size];
  const profile = AGENTS[agent];
  const ring = active ? "agent-avatar-active" : "";

  return (
    <div
      className={`relative shrink-0 grid place-items-center rounded-2xl ${ring} ${className}`}
      style={{ width: px, height: px }}
      role="img"
      aria-label={`${profile.name} — AI agent, ${profile.role}`}
    >
      <svg
        viewBox="0 0 64 64"
        width={px}
        height={px}
        className="block drop-shadow-sm"
        aria-hidden
      >
        {agent === "sayed" && <SayedCharacter color={profile.color} id="sayed" />}
        {agent === "mohsen" && <MohsenCharacter color={profile.color} id="mohsen" />}
        {agent === "jana" && <JanaCharacter color={profile.color} id="jana" />}
      </svg>
    </div>
  );
}

function Bg({ color, id }: { color: string; id: string }) {
  return (
    <>
      <defs>
        <linearGradient id={`agent-bg-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill={`url(#agent-bg-${id})`} />
      <rect x="2" y="2" width="60" height="60" rx="16" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.5" />
    </>
  );
}

/** Sayed — analyst / scorer: neat hair, glasses, chart badge */
function SayedCharacter({ color, id }: { color: string; id: string }) {
  return (
    <g>
      <Bg color={color} id={id} />
      {/* shoulders / shirt */}
      <path d="M12 58 Q32 48 52 58 L52 64 L12 64 Z" fill="#0d1a3a" />
      <path d="M18 52 Q32 46 46 52" fill="none" stroke="rgba(255,255,255,.25)" strokeWidth="1" />
      {/* neck */}
      <rect x="28" y="38" width="8" height="8" rx="2" fill="#e8c4a8" />
      {/* face */}
      <ellipse cx="32" cy="30" rx="14" ry="15" fill="#e8c4a8" />
      {/* hair — short side part */}
      <path d="M18 26 Q20 14 32 12 Q44 14 46 26 Q44 18 32 16 Q20 18 18 26" fill="#1a1208" />
      <path d="M18 26 Q22 20 28 22" fill="none" stroke="#2a2010" strokeWidth=".8" />
      {/* glasses */}
      <rect x="22" y="27" width="9" height="7" rx="2" fill="none" stroke="#10103C" strokeWidth="1.4" />
      <rect x="33" y="27" width="9" height="7" rx="2" fill="none" stroke="#10103C" strokeWidth="1.4" />
      <path d="M31 30 h2" stroke="#10103C" strokeWidth="1.2" />
      {/* eyes */}
      <circle cx="26.5" cy="30" r="1.2" fill="#10103C" />
      <circle cx="37.5" cy="30" r="1.2" fill="#10103C" />
      {/* smile */}
      <path d="M26 35 Q32 38 38 35" fill="none" stroke="#b8886a" strokeWidth="1.2" strokeLinecap="round" />
      {/* chart badge — scoring */}
      <circle cx="50" cy="14" r="9" fill="#10103C" stroke={color} strokeWidth="1.5" />
      <path d="M45 16 L48 13 L51 15 L54 11" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

/** Mohsen — investigator: wavy hair, magnifier badge */
function MohsenCharacter({ color, id }: { color: string; id: string }) {
  return (
    <g>
      <Bg color={color} id={id} />
      <path d="M12 58 Q32 48 52 58 L52 64 L12 64 Z" fill="#0d1a3a" />
      <path d="M20 50 L32 44 L44 50" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
      <rect x="28" y="38" width="8" height="8" rx="2" fill="#d4a574" />
      <ellipse cx="32" cy="30" rx="14" ry="15" fill="#d4a574" />
      {/* wavy hair */}
      <path d="M17 28 Q18 12 32 11 Q46 12 47 28 Q45 16 32 14 Q19 16 17 28" fill="#2c1810" />
      <path d="M17 24 Q22 18 28 20 M47 24 Q42 18 36 20" fill="none" stroke="#3d2418" strokeWidth=".8" />
      {/* brows — focused */}
      <path d="M23 25 L29 26 M35 26 L41 25" stroke="#2c1810" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="26.5" cy="30" r="1.3" fill="#10103C" />
      <circle cx="37.5" cy="30" r="1.3" fill="#10103C" />
      <path d="M27 36 Q32 38.5 37 36" fill="none" stroke="#9a6848" strokeWidth="1.2" strokeLinecap="round" />
      {/* magnifier badge */}
      <circle cx="50" cy="14" r="9" fill="#10103C" stroke={color} strokeWidth="1.5" />
      <circle cx="48" cy="13" r="3" fill="none" stroke={color} strokeWidth="1.4" />
      <path d="M50.5 15.5 L53 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </g>
  );
}

/** Jana — reporter: shoulder-length hair, document badge */
function JanaCharacter({ color, id }: { color: string; id: string }) {
  return (
    <g>
      <Bg color={color} id={id} />
      <path d="M12 58 Q32 48 52 58 L52 64 L12 64 Z" fill="#0d1a3a" />
      <path d="M22 51 Q32 45 42 51" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1" />
      <rect x="28" y="38" width="8" height="8" rx="2" fill="#f0c9a8" />
      <ellipse cx="32" cy="30" rx="13" ry="14" fill="#f0c9a8" />
      {/* shoulder-length hair */}
      <path d="M17 32 Q16 14 32 12 Q48 14 47 32 Q48 42 44 48 Q32 52 20 48 Q16 42 17 32" fill="#1a0e08" />
      <path d="M17 32 Q20 22 32 20 Q44 22 47 32" fill="none" stroke="#2a1810" strokeWidth=".6" opacity=".5" />
      {/* eyes + lashes hint */}
      <ellipse cx="26.5" cy="30" rx="1.4" ry="1.2" fill="#10103C" />
      <ellipse cx="37.5" cy="30" rx="1.4" ry="1.2" fill="#10103C" />
      <path d="M27 36 Q32 39 37 36" fill="none" stroke="#c99070" strokeWidth="1.2" strokeLinecap="round" />
      {/* document badge */}
      <circle cx="50" cy="14" r="9" fill="#10103C" stroke={color} strokeWidth="1.5" />
      <rect x="45" y="10" width="7" height="9" rx="1" fill="none" stroke={color} strokeWidth="1.2" />
      <path d="M46.5 13 h4 M46.5 15.5 h4 M46.5 18 h2.5" stroke={color} strokeWidth=".9" strokeLinecap="round" />
    </g>
  );
}
