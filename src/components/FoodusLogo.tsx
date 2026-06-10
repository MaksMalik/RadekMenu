import { motion, useAnimation } from 'framer-motion';
import { useEffect, useRef } from 'react';

interface FoodusLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Animated "Fooduś" logo where the "oo" are cute eyes that
 * look around gently and blink periodically.
 */
export function FoodusLogo({ className = '', size = 'md' }: FoodusLogoProps) {
  const controls = useAnimation();
  const blinkControls = useAnimation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sizeClasses = {
    sm: 'text-base sm:text-lg',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-3xl sm:text-4xl',
  };

  const eyeSize = {
    sm: { outer: 'w-4 h-4', pupil: 'w-1.5 h-1.5' },
    md: { outer: 'w-6 h-6', pupil: 'w-2 h-2' },
    lg: { outer: 'w-7 h-7', pupil: 'w-2.5 h-2.5' },
  };

  // Blinking animation — randomly every 2-5s
  useEffect(() => {
    const blink = async () => {
      await blinkControls.start({ scaleY: 0.1, transition: { duration: 0.08 } });
      await blinkControls.start({ scaleY: 1, transition: { duration: 0.12 } });
    };

    const scheduleNext = () => {
      const delay = 2000 + Math.random() * 3000;
      intervalRef.current = setTimeout(() => {
        void blink().then(scheduleNext);
      }, delay);
    };

    scheduleNext();
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [blinkControls]);

  // Gentle look-around animation
  useEffect(() => {
    const sequence = async () => {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const x = (Math.random() - 0.5) * 3;
        const y = (Math.random() - 0.5) * 2;
        await controls.start({ x, y, transition: { duration: 1.5, ease: 'easeInOut' } });
        await new Promise(r => setTimeout(r, 800 + Math.random() * 1500));
      }
    };
    void sequence();
  }, [controls]);

  return (
    <span className={`inline-flex items-center font-extrabold tracking-tight select-none ${sizeClasses[size]} ${className}`}>
      <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">F</span>
      {/* First "o" eye */}
      <Eye controls={controls} blinkControls={blinkControls} eyeSize={eyeSize[size]} />
      {/* Second "o" eye */}
      <Eye controls={controls} blinkControls={blinkControls} eyeSize={eyeSize[size]} />
      <span className="bg-gradient-to-r from-emerald-500 to-emerald-400 bg-clip-text text-transparent">duś</span>
    </span>
  );
}

function Eye({
  controls,
  blinkControls,
  eyeSize,
}: {
  controls: ReturnType<typeof useAnimation>;
  blinkControls: ReturnType<typeof useAnimation>;
  eyeSize: { outer: string; pupil: string };
}) {
  return (
    <motion.span
      animate={blinkControls}
      className={`relative inline-flex items-center justify-center ${eyeSize.outer} rounded-full bg-white border-2 border-emerald-600 mx-[1px]`}
      style={{ originY: 0.5 }}
    >
      <motion.span
        animate={controls}
        className={`${eyeSize.pupil} rounded-full bg-emerald-800`}
      />
    </motion.span>
  );
}
