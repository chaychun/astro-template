import { motion } from "motion/react";
import type { ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

/**
 * Small reference island showing the Astro + Motion pattern.
 *
 * Import as a client component in an .astro file:
 *   import FadeIn from "@/components/FadeIn";
 *   <FadeIn client:load delay={0.2}>Hello</FadeIn>
 *
 * Delete or replace once the real component system exists.
 */
export default function FadeIn({ children, delay = 0, className }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
