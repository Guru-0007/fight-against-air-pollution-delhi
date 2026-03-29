// ── Ambient Airflow Canvas ──
// Soft, organic fog/mist animation that responds to AQI level

class AmbientSystem {
  constructor() {
    this.canvas = document.getElementById('ambient-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.aqi = 50;
    this.running = true;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initParticles();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  getConfig() {
    if (this.aqi <= 50) return { count: 30, color: [200, 225, 245], speed: 0.15, size: 80 };
    if (this.aqi <= 100) return { count: 50, color: [210, 210, 190], speed: 0.2, size: 90 };
    if (this.aqi <= 200) return { count: 80, color: [220, 195, 170], speed: 0.25, size: 100 };
    return { count: 120, color: [210, 185, 175], speed: 0.3, size: 110 };
  }

  initParticles() {
    const cfg = this.getConfig();
    this.particles = [];
    for (let i = 0; i < cfg.count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * cfg.speed,
        vy: (Math.random() - 0.3) * cfg.speed * 0.5,
        size: Math.random() * cfg.size + 40,
        opacity: Math.random() * 0.08 + 0.02,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  updateAQI(aqi) {
    this.aqi = aqi;
    this.initParticles();

    // Update the ambient gradient based on AQI
    const gradient = document.getElementById('ambient-gradient');
    if (gradient) {
      if (aqi <= 50) {
        gradient.style.background = 'linear-gradient(135deg, rgba(190, 225, 245, 0.5) 0%, rgba(200, 235, 250, 0.3) 50%, rgba(210, 240, 235, 0.4) 100%)';
      } else if (aqi <= 100) {
        gradient.style.background = 'linear-gradient(135deg, rgba(220, 225, 210, 0.5) 0%, rgba(230, 230, 215, 0.3) 50%, rgba(225, 220, 200, 0.4) 100%)';
      } else if (aqi <= 200) {
        gradient.style.background = 'linear-gradient(135deg, rgba(235, 215, 195, 0.5) 0%, rgba(230, 210, 190, 0.3) 50%, rgba(225, 205, 185, 0.4) 100%)';
      } else {
        gradient.style.background = 'linear-gradient(135deg, rgba(225, 200, 190, 0.5) 0%, rgba(215, 195, 185, 0.3) 50%, rgba(210, 190, 180, 0.5) 100%)';
      }
    }
  }

  animate() {
    if (!this.running) return;
    const cfg = this.getConfig();
    const [r, g, b] = cfg.color;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const time = Date.now() * 0.001;

    for (const p of this.particles) {
      // Gentle organic motion
      p.x += p.vx + Math.sin(time + p.phase) * 0.1;
      p.y += p.vy + Math.cos(time * 0.7 + p.phase) * 0.05;

      // Wrap around
      if (p.x < -p.size) p.x = this.canvas.width + p.size;
      if (p.x > this.canvas.width + p.size) p.x = -p.size;
      if (p.y < -p.size) p.y = this.canvas.height + p.size;
      if (p.y > this.canvas.height + p.size) p.y = -p.size;

      // Draw soft fog blob
      const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      const breathe = Math.sin(time * 0.5 + p.phase) * 0.02;
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${p.opacity + breathe})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }

    requestAnimationFrame(() => this.animate());
  }
}

export const ambientSystem = new AmbientSystem();
