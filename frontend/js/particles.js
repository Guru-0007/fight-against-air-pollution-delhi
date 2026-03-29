// Background Particle Simulation

class ParticleSystem {
  constructor() {
    this.canvas = document.getElementById('particle-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.density = 50; // default safe
    this.color = 'rgba(0, 255, 136, 0.4)'; // Safe Green default
    this.speedMult = 1;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
    
    this.initParticles();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  initParticles() {
    this.particles = [];
    // Max 300 particles for performance
    const count = Math.min(this.density, 300);
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 + 0.2, // slightly downwards representing heavy particles
        size: Math.random() * 2 + 0.5
      });
    }
  }

  updateAQI(aqi) {
    if (aqi <= 50) {
      this.density = 50;
      this.color = 'rgba(0, 255, 136, 0.4)'; // Green
      this.speedMult = 0.5;
    } else if (aqi <= 100) {
      this.density = 100;
      this.color = 'rgba(255, 174, 0, 0.4)'; // Yellow
      this.speedMult = 1;
    } else if (aqi <= 200) {
      this.density = 150;
      this.color = 'rgba(255, 0, 60, 0.4)'; // Red
      this.speedMult = 1.5;
    } else {
      this.density = 250;
      this.color = 'rgba(180, 0, 255, 0.5)'; // Dark Purple/Maroon indicator
      this.speedMult = 2;
    }
    this.initParticles();
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = this.color;
    // adding a subtle glow to particles
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = this.color;
    
    for (let i = 0; i < this.particles.length; i++) {
      let p = this.particles[i];
      p.x += p.vx * this.speedMult;
      p.y += p.vy * this.speedMult;
      
      // wrap around
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y > this.canvas.height) p.y = 0;
      
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    requestAnimationFrame(() => this.animate());
  }
}

export const particleSystem = new ParticleSystem();
