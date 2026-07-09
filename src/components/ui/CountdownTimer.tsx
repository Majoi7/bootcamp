import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string; // Format: "2026-08-01T00:00:00"
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const calculateTimeLeft = (): TimeLeft => {
    const difference = new Date(targetDate).getTime() - new Date().getTime();
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  const pad = (num: number) => num.toString().padStart(2, "0");

  return (
    <section className="w-full bg-gradient-to-r from-orange-500 to-red-500 py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 backdrop-blur px-4 py-1.5 text-sm font-medium text-white mb-6">
          Ouverture des inscriptions
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-10">
          Le Bootcamp commence dans
        </h2>
        <div className="flex items-center justify-center gap-3 md:gap-4">
          {[
            { value: timeLeft.days, label: "jours" },
            { value: timeLeft.hours, label: "heures" },
            { value: timeLeft.minutes, label: "min" },
            { value: timeLeft.seconds, label: "sec" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center bg-white/20 backdrop-blur rounded-xl px-4 py-3 md:px-6 md:py-4 min-w-[60px] md:min-w-[80px]"
            >
              <span className="text-2xl md:text-4xl font-bold text-white tabular-nums">
                {pad(item.value)}
              </span>
              <span className="text-[10px] md:text-xs text-white/80 uppercase mt-1">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default CountdownTimer;