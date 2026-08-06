export function GrilloMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path d="M 64 34 Q 56 18 46 10" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M 74 34 Q 88 22 102 16" stroke="currentColor" strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="68" cy="70" r="38" fill="#3fa844" stroke="currentColor" strokeWidth="5" />
      <path d="M 50 52 Q 40 65 44 82" stroke="#7ed957" strokeWidth="10" strokeLinecap="round" fill="none" opacity="0.6" />
      <circle cx="82" cy="62" r="12" fill="#ffffff" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="85" cy="64" r="6" fill="currentColor" />
      <circle cx="87" cy="61" r="2.5" fill="#ffffff" />
      <path d="M 84 86 Q 93 92 102 86" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function GrilloLogo({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[7px] ${className}`}>
      <GrilloMark size={size} />
      <span
        style={{ fontFamily: "var(--font-sans)", letterSpacing: "-0.03em" }}
        className="font-bold leading-none text-[20px]"
      >
        Grillo
      </span>
    </span>
  );
}
