import React, { useEffect, useRef } from 'react';

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

    // Mouse tilt interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetMouseX = 0;
    let targetMouseY = 0;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      targetMouseX = (x / width) * 0.5;
      targetMouseY = (y / height) * 0.5;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Generate 3D Brain Point Cloud (ellipsoidal double lobes with neural cortex folds)
    const points = [];
    const numPoints = 220;
    const phiStep = Math.PI * (3 - Math.sqrt(5)); // Golden ratio angle

    for (let i = 0; i < numPoints; i++) {
      const y = 1 - (i / (numPoints - 1)) * 2; // -1 to 1
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = phiStep * i;

      // Sculpt two brain hemispheres (left & right lobe offset)
      const isLeft = Math.cos(theta) < 0;
      const lobeOffset = isLeft ? -0.18 : 0.18;

      // Add cortex surface turbulence/folds
      const foldNoise = Math.sin(y * 10) * Math.cos(theta * 8) * 0.12;
      const radius = (0.85 + foldNoise) * 160;

      const x = Math.cos(theta) * radiusAtY * radius + lobeOffset * 100;
      const z = Math.sin(theta) * radiusAtY * radius;
      const py = y * radius * 0.9;

      points.push({
        origX: x,
        origY: py,
        origZ: z,
        x,
        y: py,
        z,
        pulseOffset: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
        size: 1.8 + Math.random() * 2.2,
      });
    }

    // Floating Background Ambient Particles
    const particles = [];
    const numParticles = 60;
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: (Math.random() - 0.5) * width * 1.2,
        y: (Math.random() - 0.5) * height * 1.2,
        z: Math.random() * 400 - 200,
        speedY: -0.2 - Math.random() * 0.4,
        size: 1 + Math.random() * 2,
        alpha: 0.1 + Math.random() * 0.4,
      });
    }

    let angleY = 0;
    let angleX = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse interpolation
      mouseX += (targetMouseX - mouseX) * 0.05;
      mouseY += (targetMouseY - mouseY) * 0.05;

      angleY += 0.006;
      angleX = Math.sin(angleY * 0.5) * 0.15 + mouseY;

      const cosY = Math.cos(angleY + mouseX);
      const sinY = Math.sin(angleY + mouseX);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      const centerX = width / 2;
      const centerY = height / 2;

      // Color Tokens
      const primaryColor = isDark ? '99, 102, 241' : '91, 92, 255'; // Indigo
      const accentColor = isDark ? '0, 217, 255' : '0, 174, 239'; // Cyan
      const purpleColor = isDark ? '168, 85, 247' : '147, 51, 234'; // Purple

      // Render Floating Particles
      particles.forEach((p) => {
        p.y += p.speedY;
        if (p.y < -height / 2) p.y = height / 2;

        const screenX = centerX + p.x;
        const screenY = centerY + p.y;

        ctx.fillStyle = `rgba(${accentColor}, ${p.alpha * (isDark ? 0.6 : 0.8)})`;
        ctx.beginPath();
        ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Transform 3D points
      const transformedPoints = points.map((p) => {
        // Y rotation
        let x1 = p.origX * cosY - p.origZ * sinY;
        let z1 = p.origX * sinY + p.origZ * cosY;

        // X rotation
        let y2 = p.origY * cosX - z1 * sinX;
        let z2 = p.origY * sinX + z1 * cosX;

        // Perspective projection
        const focalLength = 400;
        const scale = focalLength / (focalLength + z2 + 100);
        const projX = centerX + x1 * scale;
        const projY = centerY + y2 * scale;

        p.pulseOffset += p.pulseSpeed;
        const pulse = (Math.sin(p.pulseOffset) + 1) / 2;

        return {
          projX,
          projY,
          scale,
          z: z2,
          pulse,
          size: p.size * scale,
        };
      });

      // Sort points by z for realistic depth rendering
      transformedPoints.sort((a, b) => b.z - a.z);

      // Draw Synaptic Connections between close points
      for (let i = 0; i < transformedPoints.length; i++) {
        const p1 = transformedPoints[i];
        let maxConnections = 0;

        for (let j = i + 1; j < transformedPoints.length; j++) {
          if (maxConnections >= 3) break;
          const p2 = transformedPoints[j];
          const dx = p1.projX - p2.projX;
          const dy = p1.projY - p2.projY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const maxDist = 55 * p1.scale;
          if (dist < maxDist) {
            maxConnections++;
            const alpha = (1 - dist / maxDist) * 0.35 * Math.min(p1.scale, 1);

            const isAccentLine = (i + j) % 5 === 0;
            const lineColor = isAccentLine ? accentColor : primaryColor;

            ctx.strokeStyle = `rgba(${lineColor}, ${alpha})`;
            ctx.lineWidth = (isAccentLine ? 1.2 : 0.8) * p1.scale;
            ctx.beginPath();
            ctx.moveTo(p1.projX, p1.projY);
            ctx.lineTo(p2.projX, p2.projY);
            ctx.stroke();
          }
        }
      }

      // Draw Nodes
      transformedPoints.forEach((p, idx) => {
        const isCyan = idx % 7 === 0;
        const isPurple = idx % 11 === 0;
        const nodeColor = isCyan ? accentColor : isPurple ? purpleColor : primaryColor;

        const baseAlpha = (p.z + 200) / 400;
        const alpha = Math.max(0.15, Math.min(0.95, baseAlpha * (0.6 + p.pulse * 0.4)));

        // Glow halo on high pulses
        if (p.pulse > 0.7 && p.scale > 0.8) {
          ctx.fillStyle = `rgba(${nodeColor}, ${alpha * 0.3})`;
          ctx.beginPath();
          ctx.arc(p.projX, p.projY, p.size * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core point
        ctx.fillStyle = `rgba(${nodeColor}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.projX, p.projY, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

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
