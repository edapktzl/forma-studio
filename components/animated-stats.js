'use client';

import { useEffect, useRef, useState } from 'react';
import { copy } from '../lib/content';

function parseValue(value) {
  const match = String(value).match(/^(\d+)(.*)$/);
  return match ? { number: Number(match[1]), suffix: match[2] } : { number: 0, suffix: value };
}

function StatValue({ value, active }) {
  const { number, suffix } = parseValue(value);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || number === 0) { setDisplay(number); return undefined; }
    const started = performance.now();
    const duration = 850;
    let frame;
    const tick = (now) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      setDisplay(Math.round(number * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, number]);

  return <>{display}{suffix}</>;
}

export default function AnimatedStats({ locale }) {
  const ref = useRef(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setActive(true); observer.disconnect(); }
    }, { threshold: 0.35 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return <section ref={ref} className="home-modern-stats" aria-label={locale === 'tr' ? 'Forma Studio istatistikleri' : 'Forma Studio statistics'}>
   <div className="shell home-modern-stats-grid">
    {copy[locale].stats.map(([value, label], index) => <div className={`home-modern-stat home-modern-stat-${index + 1}`} key={label}>
      <strong><StatValue value={value} active={active}/></strong>
      <span>{label}</span>
    </div>)}
   </div>
  </section>;
}
