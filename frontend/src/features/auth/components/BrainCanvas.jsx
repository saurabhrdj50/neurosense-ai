import React, { useEffect, useRef } from 'react';

/**
 * Neon Brain Hero Image Component with Background Removal & Glow Animation
 * Features:
 * - On-the-fly Canvas Luminance Keying: Removes black background from neon_brain_hero.png
 * - Glowing Outer Neon Halo (Magenta & Cyan radial gradients)
 * - Interactive Mouse Tilt & Organic Floating Oscillations
 * - Synaptic Light Sparks & Orbiting Satellites
 * - Works seamlessly on Light and Dark modes!
 */
export default function BrainCanvas({ isDark = true }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const parent = canvas.parentElement;
    if (!parent) return;

    let width = (canvas.width = parent.offsetWidth || 800);
    let height = (canvas.height = parent.offsetHeight || 600);

    const handleResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Mouse tilt tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      targetMouseX = (x / width) * 20;
      targetMouseY = (y / height) * 20;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Load High-Res Neon Wireframe Brain Image Asset
    const rawImg = new Image();
    rawImg.src = '/images/glowing_brain_3d_isolated.png';
    let processedCanvas = null;
    let imgLoaded = false;

    rawImg.onload = () => {
      // Create offscreen canvas to process background removal (Luminance Keying)
      const offscreen = document.createElement('canvas');
      offscreen.width = rawImg.width;
      offscreen.height = rawImg.height;
      const offCtx = offscreen.getContext('2d');
      offCtx.drawImage(rawImg, 0, 0);

      const imgData = offCtx.getImageData(0, 0, rawImg.width, rawImg.height);
      const data = imgData.data;

      // Loop through pixels and make black/dark pixels transparent
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Perceived Luminance
        const brightness = r * 0.299 + g * 0.587 + b * 0.114;

        if (brightness < 20) {
          // Pure black background -> transparent
          data[i + 3] = 0;
        } else if (brightness < 50) {
          // Soft edge feathering threshold
          const alpha = (brightness - 20) / 30;
          data[i + 3] = Math.round(data[i + 3] * alpha);
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      processedCanvas = offscreen;
      imgLoaded = true;
    };

    // ── Floating Synaptic Sparks (Magenta & Cyan) ───────────────
    const particles = [];
    for (let i = 0; i < 60; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 500,
        y: (Math.random() - 0.5) * 500,
        speedY: -0.2 - Math.random() * 0.4,
        speedX: (Math.random() - 0.5) * 0.3,
        size: 1.5 + Math.random() * 2.8,
        alpha: 0.25 + Math.random() * 0.65,
        isMagenta: i % 2 === 0,
        freq: 0.8 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2,
      });
    }

    // ── Orbiting Satellites ─────────────────────────────────────
    const satellites = [];
    for (let k = 0; k < 10; k++) {
      satellites.push({
        radius: 220 + (k % 3) * 25,
        angle: (Math.PI * 2 * k) / 10,
        speed: 0.008 + (k % 2) * 0.006,
        size: 2.4 + Math.random() * 1.6,
        isCyan: k % 2 === 0,
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.016;

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      const centerX = width > 900 ? width * 0.70 + mouseX : width * 0.58 + mouseX;
      const bob = Math.sin(time * 1.2) * 12; // Floating bobbing
      const centerY = height / 2 + mouseY + bob;

      const cyanRgb = isDark ? '6, 182, 212' : '14, 165, 233';     // Cyan
      const magentaRgb = isDark ? '217, 70, 239' : '192, 38, 211'; // Magenta
      const purpleRgb = isDark ? '168, 85, 247' : '147, 51, 234';  // Purple

      // ── 1. DRAW INTENSE NEON GLOWING RADIAL HALO ────────────────
      ctx.save();
      const haloGrad = ctx.createRadialGradient(
        centerX, centerY - 10, 10,
        centerX, centerY - 10, 240
      );
      haloGrad.addColorStop(0, 'rgba(255, 255, 255, 0.90)');
      haloGrad.addColorStop(0.2, `rgba(${magentaRgb}, ${isDark ? 0.65 : 0.45})`);
      haloGrad.addColorStop(0.55, `rgba(${purpleRgb}, ${isDark ? 0.35 : 0.22})`);
      haloGrad.addColorStop(0.85, `rgba(${cyanRgb}, ${isDark ? 0.15 : 0.08})`);
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(centerX, centerY - 10, 240, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── 2. CONCENTRIC ORBITAL RINGS & SATELLITES ────────────────
      ctx.save();
      ctx.lineWidth = 1.2;
      [210, 240, 270].forEach((r, idx) => {
        ctx.save();
        ctx.strokeStyle = idx % 2 === 0 ? `rgba(${magentaRgb}, 0.28)` : `rgba(${cyanRgb}, 0.28)`;
        ctx.setLineDash([8, 12]);
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, r, r * 0.72, Math.PI / 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Satellites
      satellites.forEach((sat) => {
        sat.angle += sat.speed;
        const sx = centerX + Math.cos(sat.angle) * sat.radius;
        const sy = centerY + Math.sin(sat.angle) * (sat.radius * 0.72);
        const col = sat.isCyan ? cyanRgb : magentaRgb;

        ctx.fillStyle = `rgba(${col}, 0.95)`;
        ctx.beginPath();
        ctx.arc(sx, sy, sat.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(${col}, 0.35)`;
        ctx.beginPath();
        ctx.arc(sx, sy, sat.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      // ── 3. FLOATING SYNAPTIC PARTICLES ──────────────────────────
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        if (p.y < -250) p.y = 250;
        if (p.x < -250) p.x = 250;
        if (p.x > 250) p.x = -250;

        const twinkle = 0.5 + 0.5 * Math.sin(time * p.freq + p.phase);
        const colorStr = p.isMagenta ? magentaRgb : cyanRgb;

        ctx.fillStyle = `rgba(${colorStr}, ${p.alpha * twinkle})`;
        ctx.beginPath();
        ctx.arc(centerX + p.x, centerY + p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // ── 4. DRAW TRANSPARENT GLOWING BRAIN IMAGE ───────────────
      if (imgLoaded && processedCanvas) {
        ctx.save();

        // Calculate fit scale (max height ~440px)
        const imgMaxH = Math.min(height * 0.76, 450);
        const scale = imgMaxH / processedCanvas.height;
        const drawW = processedCanvas.width * scale;
        const drawH = processedCanvas.height * scale;

        const imgX = centerX - drawW / 2;
        const imgY = centerY - drawH / 2;

        // Multi-Layer Outer Neon Glow Drop Shadow
        ctx.shadowColor = `rgba(${magentaRgb}, 0.85)`;
        ctx.shadowBlur = 35;

        // Draw processed image with transparent background
        ctx.drawImage(processedCanvas, imgX, imgY, drawW, drawH);

        // Second pass overlay for extra vivid color pop
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowColor = `rgba(${cyanRgb}, 0.9)`;
        ctx.shadowBlur = 20;
        ctx.drawImage(processedCanvas, imgX, imgY, drawW, drawH);

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDark]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
