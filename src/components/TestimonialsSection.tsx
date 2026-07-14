import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon } from "lucide-react";

// --- Types ---
export interface Testimonial {
  id?: string;
  text: string;
  image: string;
  name: string;
  role: string;
}

// --- Sous-composant Colonne (identique à l'original, mais sans dark mode) ---
const TestimonialsColumn = (props: {
  className?: string;
  testimonials: Testimonial[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.ul
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-transparent list-none m-0 p-0"
      >
        {[...new Array(2)].map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <motion.li
                key={`${index}-${i}`}
                aria-hidden={index === 1}
                tabIndex={index === 1 ? -1 : 0}
                whileHover={{
                  scale: 1.03,
                  y: -8,
                  boxShadow:
                    "0 25px 50px -12px rgba(0, 0, 0, 0.12), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)",
                  transition: { type: "spring", stiffness: 400, damping: 17 },
                }}
                className="p-10 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-lg shadow-black/5 max-w-xs w-full bg-white dark:bg-neutral-900 transition-all duration-300 cursor-default select-none group"
              >
                <blockquote className="m-0 p-0">
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed font-normal m-0">
                    {text}
                  </p>
                  <footer className="flex items-center gap-3 mt-6">
                    <img
                      width={40}
                      height={40}
                      src={image}
                      alt={`Avatar of ${name}`}
                      className="h-10 w-10 rounded-full object-cover ring-2 ring-neutral-100 dark:ring-neutral-800 group-hover:ring-primary/30 transition-all duration-300"
                    />
                    <div className="flex flex-col">
                      <cite className="font-semibold not-italic tracking-tight leading-5 text-neutral-900 dark:text-white">
                        {name}
                      </cite>
                      <span className="text-sm leading-5 tracking-tight text-neutral-500 dark:text-neutral-500 mt-0.5">
                        {role}
                      </span>
                    </div>
                  </footer>
                </blockquote>
              </motion.li>
            ))}
          </React.Fragment>
        ))}
      </motion.ul>
    </div>
  );
};

// --- Section complète ---
interface TestimonialsSectionProps {
  testimonials: Testimonial[];
  title?: string;
  subtitle?: string;
  badge?: string;
  showDarkToggle?: boolean; // optionnel, si tu veux garder le toggle
}

export default function TestimonialsSection({
  testimonials,
  title = "What our users say",
  subtitle = "Discover how thousands of teams streamline their operations with our platform.",
  badge = "Testimonials",
  showDarkToggle = false,
}: TestimonialsSectionProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  // Répartition en 3 colonnes (comme l'original)
  const firstColumn = testimonials.slice(0, Math.ceil(testimonials.length / 3));
  const secondColumn = testimonials.slice(
    Math.ceil(testimonials.length / 3),
    Math.ceil((2 * testimonials.length) / 3)
  );
  const thirdColumn = testimonials.slice(Math.ceil((2 * testimonials.length) / 3));

  return (
    <section className="bg-transparent py-24 relative overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 50, rotate: -2 }}
        whileInView={{ opacity: 1, y: 0, rotate: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        className="container px-4 z-10 mx-auto"
      >
        {/* Badge & Titre */}
        <div className="flex flex-col items-center justify-center max-w-[540px] mx-auto mb-16">
          <div className="border border-neutral-300 dark:border-neutral-700 py-1 px-4 rounded-full text-xs font-semibold tracking-wide uppercase text-neutral-600 dark:text-neutral-400 bg-neutral-100/50 dark:bg-neutral-800/50">
            {badge}
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mt-6 text-center text-neutral-900 dark:text-white">
            {title}
          </h2>
          <p className="text-center mt-5 text-neutral-500 dark:text-neutral-400 text-lg leading-relaxed max-w-sm">
            {subtitle}
          </p>
        </div>

        {/* Colonnes */}
        <div
          className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_10%,black_90%,transparent)] max-h-[740px] overflow-hidden"
          role="region"
          aria-label="Scrolling Testimonials"
        >
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn
            testimonials={secondColumn}
            className="hidden md:block"
            duration={19}
          />
          <TestimonialsColumn
            testimonials={thirdColumn}
            className="hidden lg:block"
            duration={17}
          />
        </div>
      </motion.div>

      {showDarkToggle && (
        <button
          onClick={() => setIsDark(!isDark)}
          className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100 border shadow-xl hover:scale-110 transition-all"
          aria-label="Toggle Dark Mode"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      )}
    </section>
  );
}