/**
 * Motion primitives — wraps framer-motion for consistent site-wide animation.
 *
 * Usage:
 *   <FadeUp>       — fade in + slide up on scroll (most common)
 *   <FadeIn>       — plain fade in on scroll
 *   <SlideIn>      — slide from side
 *   <Stagger>      — wraps a list; children cascade with delay
 *   <StaggerItem>  — individual item inside <Stagger>
 *   <ScaleIn>      — scale up from 0.85 on scroll
 *   <MotionCard>   — card with hover lift + subtle shadow
 */
import React from 'react';
import {
  motion,
  useReducedMotion,
  type Variants,
  type HTMLMotionProps,
} from 'framer-motion';

/* ── Shared spring / easing ───────────────────────────────────────────── */
export const ease = [0.22, 1, 0.36, 1] as const;
export const spring = { type: 'spring', stiffness: 320, damping: 28 } as const;

/* ── Viewport once — only animate when first entering view ───────────── */
const viewport = { once: true, margin: '-60px 0px' };

/* ── FadeUp ──────────────────────────────────────────────────────────── */
interface FadeUpProps extends HTMLMotionProps<'div'> {
  delay?: number;
  distance?: number;
  duration?: number;
}

export function FadeUp({
  children,
  delay = 0,
  distance = 28,
  duration = 0.55,
  ...props
}: FadeUpProps) {
  const noMotion = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, y: noMotion ? 0 : distance },
    visible: { opacity: 1, y: 0, transition: { duration, delay, ease } },
  };
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ── FadeIn ──────────────────────────────────────────────────────────── */
interface FadeInProps extends HTMLMotionProps<'div'> {
  delay?: number;
  duration?: number;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  ...props
}: FadeInProps) {
  const variants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration, delay, ease } },
  };
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ── SlideIn ─────────────────────────────────────────────────────────── */
interface SlideInProps extends HTMLMotionProps<'div'> {
  from?: 'left' | 'right';
  delay?: number;
  distance?: number;
}

export function SlideIn({
  children,
  from = 'left',
  delay = 0,
  distance = 48,
  ...props
}: SlideInProps) {
  const noMotion = useReducedMotion();
  const x = noMotion ? 0 : from === 'left' ? -distance : distance;
  const variants: Variants = {
    hidden: { opacity: 0, x },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, delay, ease } },
  };
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ── ScaleIn ─────────────────────────────────────────────────────────── */
interface ScaleInProps extends HTMLMotionProps<'div'> {
  delay?: number;
}

export function ScaleIn({ children, delay = 0, ...props }: ScaleInProps) {
  const noMotion = useReducedMotion();
  const variants: Variants = {
    hidden: { opacity: 0, scale: noMotion ? 1 : 0.88 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, delay, ease },
    },
  };
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ── Stagger container + item ────────────────────────────────────────── */
interface StaggerProps extends HTMLMotionProps<'div'> {
  staggerDelay?: number;
  initialDelay?: number;
}

export function Stagger({
  children,
  staggerDelay = 0.08,
  initialDelay = 0,
  ...props
}: StaggerProps) {
  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: staggerDelay, delayChildren: initialDelay },
    },
  };
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={container}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends HTMLMotionProps<'div'> {
  distance?: number;
}

export function StaggerItem({
  children,
  distance = 24,
  ...props
}: StaggerItemProps) {
  const noMotion = useReducedMotion();
  const item: Variants = {
    hidden: { opacity: 0, y: noMotion ? 0 : distance },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
  };
  return (
    <motion.div variants={item} {...props}>
      {children}
    </motion.div>
  );
}

/* ── MotionCard — lift + shadow on hover ─────────────────────────────── */
export function MotionCard({
  children,
  className,
  ...props
}: HTMLMotionProps<'div'>) {
  return (
    <motion.div
      className={className}
      whileHover={{ y: -4, boxShadow: '0 12px 32px -6px rgba(20,23,42,0.14)' }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/* ── MotionButton — subtle press feedback ────────────────────────────── */
export function MotionButton({
  children,
  className,
  ...props
}: HTMLMotionProps<'button'>) {
  return (
    <motion.button
      className={className}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

/* ── Re-export motion for one-off usage ──────────────────────────────── */
export { motion };
