import { useEffect } from "react";

/** Gedeelde toernooi-decoratie: confetti, de gouden beker en scroll-reveals. */

const CONFETTI_COLORS = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#f8fafc", "#fb923c"];

export function Confetti({ count = 26, once = false }: { count?: number; once?: boolean }) {
  // once: elk snippertje valt één keer en blijft dan weg — voor schermen die
  // uren open blijven staan (podium, kampioen, portaal-slot): batterij > feest
  return (
    <div className={once ? "confetti confetti-once" : "confetti"} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37 + 11) % 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDuration: `${6 + (i % 5) * 1.7}s`,
            animationDelay: `${(i % 9) * 0.9}s`,
            width: i % 3 === 0 ? 6 : 9,
            height: i % 4 === 0 ? 14 : 10,
          }}
        />
      ))}
    </div>
  );
}

/** Gouden wisselbeker, met de hand getekend — geen stockfoto's nodig. */
export function Trophy({ size = 190 }: { size?: number }) {
  return (
    <div className="float-slow" style={{ filter: "drop-shadow(0 22px 30px rgba(251,191,36,.35))" }}>
      <svg width={size} height={size * 1.15} viewBox="0 0 200 230" aria-hidden>
        <defs>
          <linearGradient id="goud" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset=".5" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#b45309" />
          </linearGradient>
          <linearGradient id="goud2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbbf24" />
            <stop offset="1" stopColor="#92400e" />
          </linearGradient>
        </defs>
        <path
          d="M38 40 H18 a4 4 0 0 0 -4 4 c0 34 22 56 46 60 M162 40 h20 a4 4 0 0 1 4 4 c0 34 -22 56 -46 60"
          fill="none"
          stroke="url(#goud)"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <path d="M40 28 h120 v44 c0 40 -26 66 -60 66 s-60 -26 -60 -66 z" fill="url(#goud)" />
        <ellipse cx="100" cy="28" rx="60" ry="9" fill="#fde68a" />
        <path d="M92 136 h16 l6 34 h-28 z" fill="url(#goud2)" />
        <rect x="62" y="172" width="76" height="14" rx="4" fill="url(#goud2)" />
        <rect x="52" y="186" width="96" height="18" rx="5" fill="url(#goud)" />
        <path
          d="M100 62 l7.5 15.2 16.8 2.4 -12.1 11.8 2.8 16.7 -15 -7.9 -15 7.9 2.8 -16.7 -12.1 -11.8 16.8 -2.4 z"
          fill="#fffbeb"
          opacity=".9"
        />
      </svg>
    </div>
  );
}

/** Laat .reveal-elementen omhoog schuiven zodra ze in beeld komen. */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("show"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("show")),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
