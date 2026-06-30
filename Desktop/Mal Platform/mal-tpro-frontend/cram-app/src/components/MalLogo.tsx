// Mal arabesque-star logomark (radial petal ring with brand gradient)
export default function MalLogo({ size = 30 }: { size?: number }) {
  const petals = Array.from({ length: 10 }, (_, k) => k * 36);
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-label="Mal logomark">
      <defs>
        <linearGradient id="malg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A953DF" />
          <stop offset="1" stopColor="#39B9ED" />
        </linearGradient>
      </defs>
      <g fill="url(#malg)">
        {petals.map((deg) => (
          <g key={deg} transform={`rotate(${deg} 50 50)`}>
            <rect x="45.5" y="5" width="9" height="24" rx="4.5" />
          </g>
        ))}
      </g>
    </svg>
  );
}
