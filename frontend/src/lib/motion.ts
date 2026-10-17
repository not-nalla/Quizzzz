import { Variants, Transition } from "framer-motion";

export const transitionFast: Transition = {
  duration: 0.18,
  ease: [0.16, 1, 0.3, 1],
};

export const transitionMedium: Transition = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1],
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitionFast,
  },
};

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitionMedium,
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.14, ease: [0.16, 1, 0.3, 1] },
  },
};

export const tabContentVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: transitionFast },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

export const panelFadeIn: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: transitionFast },
};

