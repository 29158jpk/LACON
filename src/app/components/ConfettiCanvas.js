'use client';

import { useEffect, useRef } from 'react';

export default function ConfettiCanvas({ active = true, onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Color palette matching Horizon x CPU theme (Neon Blue, Emerald, Cyan, Violet, Gold)
    const colors = [
      '#3b82f6', '#60a5fa', '#93c5fd', // Electric Blue
      '#10b981', '#34d399', '#6ee7b7', // Emerald Green
      '#8b5cf6', '#a78bfa', '#c4b5fd', // Purple / Violet
      '#06b6d4', '#22d3ee', '#67e8f9', // Cyan
      '#fbbf24', '#f59e0b', '#fde047', // Amber / Gold
      '#ec4899', '#f472b6',             // Pink sparkle
    ];

    const particleCount = 140;
    const particles = [];

    // Origin: Center-middle of screen
    const originX = canvas.width / 2;
    const originY = canvas.height / 2 - 40;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
      const velocity = 8 + Math.random() * 16;
      const size = 5 + Math.random() * 8;
      const isCircle = Math.random() > 0.5;

      particles.push({
        x: originX + (Math.random() - 0.5) * 40,
        y: originY + (Math.random() - 0.5) * 40,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 3,
        size,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        opacity: 1,
        gravity: 0.28 + Math.random() * 0.15,
        drag: 0.965,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.1 + Math.random() * 0.1,
        isCircle,
      });
    }

    let startTime = Date.now();
    const duration = 2800; // 2.8s total animation

    const render = () => {
      const elapsed = Date.now() - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let aliveCount = 0;

      particles.forEach(p => {
        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx + Math.sin(p.wobble) * 1.2;
        p.y += p.vy;
        p.wobble += p.wobbleSpeed;
        p.rotation += p.rotationSpeed;

        // Fade out in second half
        if (elapsed > 1200) {
          p.opacity = Math.max(0, 1 - (elapsed - 1200) / 1600);
        }

        if (p.opacity > 0.01 && p.y < canvas.height + 40) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;

          if (p.isCircle) {
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
          } else {
            // Confetti rectangle ribbon
            const scaleY = Math.cos(p.wobble);
            ctx.fillRect(-p.size / 2, (-p.size * scaleY) / 2, p.size, p.size * scaleY);
          }

          ctx.restore();
        }
      });

      if (elapsed < duration && aliveCount > 0) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (onComplete) onComplete();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="confetti-canvas"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999999,
      }}
    />
  );
}
