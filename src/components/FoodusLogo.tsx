import { motion, useAnimation } from 'framer-motion';
import { useEffect, useId, useRef } from 'react';

type Controls = ReturnType<typeof useAnimation>;

interface FoodusLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Animated "Fooduś" logo where the "oo" are cute kawaii eyes.
 * - Soft round eyes with a large glossy pupil.
 * - Pupils gently drift to look around (very subtle, like a living thing).
 * - Blink is done with a skin-tone eyelid that slides down naturally from the
 *   top, giving a real "blink" look rather than the whole eye squishing.
 */
export function FoodusLogo({ className = '', size = 'md' }: FoodusLogoProps) {
  const pupil = useAnimation();
  const lid = useAnimation();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const textSize = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-5xl sm:text-6xl',
  }[size];

  const eyePx = { sm: 24, md: 34, lg: 46 }[size];

  // Blink — eyelid slides from above (y: -34) to closed (y: 0) and back.
  useEffect(() => {
    let cancelled = false;

    const blink = () =>
      lid.start({
        y: [-34, -2, -34],
        transition: { duration: 0.28, times: [0, 0.4, 1], ease: 'easeInOut' },
      });

    const loop = () => {
      const delay = 2800 + Math.random() * 3500;
      timerRef.current = setTimeout(async () => {
        if (cancelled) return;
        await blink();
        if (!cancelled && Math.random() < 0.2) {
          await new Promise(r => setTimeout(r, 120));
          await blink();
        }
        if (!cancelled) loop();
      }, delay);
    };

    loop();
    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [lid]);

  // Gentle looking around — very subtle movement.
  useEffect(() => {
    let cancelled = false;

    const wander = async () => {
      while (!cancelled) {
        const x = (Math.random() - 0.5) * 3;
        const y = (Math.random() - 0.5) * 2;
        await pupil.start({ x, y, transition: { duration: 1.2, ease: 'easeInOut' } });
        await new Promise(r => setTimeout(r, 1200 + Math.random() * 2000));
      }
    };

    void wander();
    return () => { cancelled = true; };
  }, [pupil]);

  return (
    <span className={`inline-flex items-baseline font-extrabold tracking-tight select-none ${textSize} ${className}`}>
      <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">F</span>
      <span className="inline-flex items-center gap-[3px] mx-[1px]" style={{ transform: 'translateY(10%)' }}>
        <Eye px={eyePx} pupil={pupil} lid={lid} />
        <Eye px={eyePx} pupil={pupil} lid={lid} />
      </span>
      <span className="bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">duś</span>
    </span>
  );
}

function Eye({
  px,
  pupil,
  lid,
}: {
  px: number;
  pupil: Controls;
  lid: Controls;
}) {
  const id = useId();

  return (
    <svg width={px} height={px} viewBox="0 0 36 36" className="drop-shadow-sm" aria-hidden>
      <defs>
        <clipPath id={`${id}-clip`}>
          <circle cx="18" cy="18" r="16" />
        </clipPath>
        <radialGradient id={`${id}-iris`} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#6ee7b7" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#064e3b" />
        </radialGradient>
      </defs>

      {/* Eye outline — soft shadow/stroke */}
      <circle cx="18" cy="18" r="16.5" fill="none" stroke="#d1fae5" strokeWidth="1.5" />
      {/* Sclera */}
      <circle cx="18" cy="18" r="16" fill="#ffffff" />

      <g clipPath={`url(#${id}-clip)`}>
        {/* Pupil assembly — moves together */}
        <motion.g animate={pupil} initial={{ x: 0, y: 0 }}>
          {/* Iris — big and friendly */}
          <circle cx="18" cy="18" r="10" fill={`url(#${id}-iris)`} />
          {/* Inner pupil */}
          <circle cx="18" cy="18.5" r="5" fill="#022c22" />
          {/* Main highlight — top-left, big and glossy */}
          <ellipse cx="14" cy="13.5" rx="3.2" ry="2.8" fill="#ffffff" opacity="0.92" />
          {/* Secondary small sparkle */}
          <circle cx="21" cy="21" r="1.4" fill="#ffffff" opacity="0.6" />
        </motion.g>

        {/* Eyelid — skin-toned rectangle that sits above and drops to blink.
            The curved bottom edge gives a natural lid shape. */}
        <motion.rect
          animate={lid}
          initial={{ y: -34 }}
          x="-1"
          y="0"
          width="38"
          height="20"
          rx="2"
          fill="#fde9d9"
        />
        {/* Eyelid bottom edge — slight curve for realism */}
        <motion.ellipse
          animate={lid}
          initial={{ cy: -14 }}
          cx="18"
          cy="20"
          rx="18"
          ry="4"
          fill="#fde9d9"
        />
      </g>
    </svg>
  );
}
