"use client";

import { cn } from "@ozilcuts/ui";
import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";

type HomeMotionSectionProps = Omit<
  HTMLMotionProps<"section">,
  "initial" | "whileInView" | "viewport" | "transition"
>;

/**
 * Scroll-revealed section for the marketing homepage; no motion when the user
 * prefers reduced motion.
 */
export function HomeMotionSection({
  className,
  children,
  ...props
}: HomeMotionSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.section
      {...props}
      className={cn(className)}
      initial={reduceMotion ? false : { opacity: 0, y: 20 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-48px 0px -24px 0px", amount: 0.2 }}
      transition={{
        duration: 0.4,
        ease: [0.2, 0, 0, 1],
      }}
    >
      {children}
    </motion.section>
  );
}
