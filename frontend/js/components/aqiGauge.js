export class AQIGauge {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    // Cyberpunk dimensions
    this.size = 220;
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.center = this.size / 2;
    this.radius = this.size / 2 - 20;
    
    this.currentAqi = 0;
    this.targetAqi = 0;
    this.animationSpeed = 2; // Speed of gauge needle catching up
    this.animating = false;
  }

  getAQIColor(val) {
    if (val <= 50) return '#00ff88'; // Safe
    if (val <= 100) return '#ffae00'; // Moderate
    if (val <= 200) return '#ff003c'; // Unhealthy
    return '#b400ff'; // Hazardous
  }

  setAQI(val) {
    this.targetAqi = val;
    if (!this.animating) {
      this.animating = true;
      this.animate();
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.size, this.size);

    // Track Background Curve
    this.ctx.beginPath();
    this.ctx.arc(this.center, this.center, this.radius, Math.PI * 0.75, Math.PI * 2.25);
    this.ctx.lineWidth = 15;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
    this.ctx.stroke();

    // Value Fill Curve
    const pct = Math.min(this.currentAqi / 500, 1);
    const endAngle = Math.PI * 0.75 + (Math.PI * 1.5 * pct);
    const color = this.getAQIColor(this.currentAqi);

    this.ctx.beginPath();
    this.ctx.arc(this.center, this.center, this.radius, Math.PI * 0.75, endAngle);
    this.ctx.lineWidth = 15;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = color;
    
    // Neon glow effect
    this.ctx.shadowBlur = 15;
    this.ctx.shadowColor = color;
    this.ctx.stroke();

    // Reset shadow for next draws
    this.ctx.shadowBlur = 0;

    // Inner details (Scan circles)
    this.ctx.beginPath();
    this.ctx.arc(this.center, this.center, this.radius - 25, 0, Math.PI * 2);
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    this.ctx.setLineDash([5, 10]);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  animate() {
    if (Math.abs(this.currentAqi - this.targetAqi) < 1) {
      this.currentAqi = this.targetAqi;
      this.draw();
      this.animating = false;
      return;
    }
    
    // Ease into target
    this.currentAqi += (this.targetAqi - this.currentAqi) * 0.1;
    this.draw();
    
    document.getElementById('aqi-display-num').textContent = Math.round(this.currentAqi);
    document.getElementById('aqi-display-num').style.color = this.getAQIColor(this.currentAqi);
    
    requestAnimationFrame(() => this.animate());
  }
}
