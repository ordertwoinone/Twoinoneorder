"use client";

import { useEffect, useRef } from "react";

interface FadeInSectionProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger delay in ms before the animation starts */
  delay?: number;
}

export default function FadeInSection({ children, className = "", delay = 0 }: FadeInSectionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.unobserve(el);

        const run = () => {
          if (delay) {
            el.style.animationDelay = `${delay}ms`;
          }
          el.classList.add("is-visible");
        };

        // rAF ensures the hidden state is painted before we trigger the animation,
        // avoiding the "already visible on mount" flash.
        requestAnimationFrame(() => requestAnimationFrame(run));
      },
      {
        threshold: 0,
        rootMargin: "0px 0px -40px 0px", // trigger 40px before bottom of viewport
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`fade-section ${className}`}>
      {children}
    </div>
  );
}
