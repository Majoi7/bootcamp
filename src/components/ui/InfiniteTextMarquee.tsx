import * as React from "react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router"; // adapte l'import selon ta config

type InfiniteTextMarqueeProps = {
  text?: string;
  link?: string;
  speed?: number;
  showTooltip?: boolean;
  tooltipText?: string;
  fontSize?: string;
  textColor?: string;
  hoverColor?: string;
};

export const InfiniteTextMarquee: React.FC<InfiniteTextMarqueeProps> = ({
  text = "BootCamp",
  link = "/inscription",
  speed = 30,
  showTooltip = true,
  tooltipText = "Réserver ma place",
  fontSize = "8rem",
  textColor = "",
  hoverColor = "#38bdf8", // couleur sky-400 par défaut
}) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState(0);
  const maxRotation = 8;

  useEffect(() => {
    if (!showTooltip) return;
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      const midpoint = window.innerWidth / 2;
      const distanceFromMidpoint = Math.abs(e.clientX - midpoint);
      const rotation = (distanceFromMidpoint / midpoint) * maxRotation;
      setRotation(e.clientX > midpoint ? rotation : -rotation);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [showTooltip]);

  const repeatedText = Array(10).fill(text).join(" - ") + " -";

  return (
    <>
      {showTooltip && (
        <div
          className={`following-tooltip fixed z-[99] transition-opacity duration-300 font-bold px-12 py-6 rounded-3xl text-nowrap
            ${isHovered ? "opacity-100" : "opacity-0"}
            bg-primary text-primary-foreground
          `}
          style={{
            top: `${cursorPosition.y}px`,
            left: `${cursorPosition.x}px`,
            transform: `rotateZ(${rotation}deg) translate(-50%, -140%)`,
          }}
        >
          <p>{tooltipText}</p>
        </div>
      )}

      <main className="relative w-full overflow-hidden">
        <motion.div
          className="whitespace-nowrap"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          animate={{
            x: [0, -1000],
            transition: {
              repeat: Infinity,
              duration: speed,
              ease: "linear",
            },
          }}
        >
          <Link to={link}>
            <span
              className={`cursor-pointer font-bold tracking-tight py-10 m-0 transition-all duration-300 ${
                textColor ? "" : "text-foreground"
              }`}
              style={{
                fontSize,
                color: textColor || undefined,
              }}
              onMouseEnter={(e) => {
                if (hoverColor) e.currentTarget.style.color = hoverColor;
              }}
              onMouseLeave={(e) => {
                if (hoverColor) e.currentTarget.style.color = textColor || "";
              }}
            >
              {repeatedText}
            </span>
          </Link>
        </motion.div>
      </main>
    </>
  );
};