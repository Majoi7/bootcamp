import * as React from "react";
import { motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { Link } from "@tanstack/react-router";

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
  hoverColor = "#38bdf8",
}) => {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [rotation, setRotation] = useState(0);
  const maxRotation = 8;
  const [isMobile, setIsMobile] = useState(false);

  // Détection mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia("(max-width: 768px)").matches || "ontouchstart" in window);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Gestion souris (desktop uniquement)
  useEffect(() => {
    if (!showTooltip || isMobile) return;
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
      const midpoint = window.innerWidth / 2;
      const distanceFromMidpoint = Math.abs(e.clientX - midpoint);
      const rotation = (distanceFromMidpoint / midpoint) * maxRotation;
      setRotation(e.clientX > midpoint ? rotation : -rotation);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [showTooltip, isMobile]);

  // Gestion touch (mobile)
  const handleTouchStart = useCallback(() => setIsHovered(true), []);
  const handleTouchEnd = useCallback(() => setIsHovered(false), []);

  // Texte répété adapté à la largeur
  const getRepeatedText = () => {
    const repeatCount = isMobile ? 6 : 10;
    return Array(repeatCount).fill(text).join(" - ") + " -";
  };

  // Font size responsive
  const getResponsiveFontSize = () => {
    if (isMobile) return "3rem"; // 48px sur mobile
    return fontSize;
  };

  // Speed adapté (plus rapide sur mobile pour l'effet)
  const getResponsiveSpeed = () => {
    if (isMobile) return speed * 0.6;
    return speed;
  };

  const repeatedText = getRepeatedText();
  const responsiveFontSize = getResponsiveFontSize();
  const responsiveSpeed = getResponsiveSpeed();

  return (
    <>
      {/* Tooltip - desktop uniquement */}
      {showTooltip && !isMobile && (
        <div
          className={`following-tooltip fixed z-[99] transition-opacity duration-300 font-bold px-6 py-3 md:px-12 md:py-6 rounded-xl md:rounded-3xl text-nowrap pointer-events-none
            ${isHovered ? "opacity-100" : "opacity-0"}
            bg-primary text-primary-foreground text-sm md:text-base
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

      <main className="relative w-full overflow-hidden py-4 md:py-0">
        <motion.div
          className="whitespace-nowrap"
          onMouseEnter={() => !isMobile && setIsHovered(true)}
          onMouseLeave={() => !isMobile && setIsHovered(false)}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          animate={{
            x: [0, -1000],
            transition: {
              repeat: Infinity,
              duration: responsiveSpeed,
              ease: "linear",
            },
          }}
        >
          <Link to={link}>
            <span
              className={`cursor-pointer font-bold tracking-tight py-4 md:py-10 m-0 transition-all duration-300 block
                ${textColor ? "" : "text-foreground"}
              `}
              style={{
                fontSize: responsiveFontSize,
                color: textColor || undefined,
                lineHeight: isMobile ? 1.2 : 1,
              }}
              onMouseEnter={(e) => {
                if (hoverColor && !isMobile) e.currentTarget.style.color = hoverColor;
              }}
              onMouseLeave={(e) => {
                if (hoverColor && !isMobile) e.currentTarget.style.color = textColor || "";
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