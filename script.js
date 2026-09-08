// Target date: Tomorrow at 13:30:00 (Tuesday, September 8, 2026)
function getTargetDate() {
  const urlParam = new URLSearchParams(window.location.search).get('target');
  if (urlParam) {
    const parsed = new Date(urlParam);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date('2026-09-08T13:45:00-03:00');
}

const targetDate = getTargetDate();

const daysEl = document.getElementById('days');
const hoursEl = document.getElementById('hours');
const minutesEl = document.getElementById('minutes');
const secondsEl = document.getElementById('seconds');

let prevSeconds = null;
let prevMinutes = null;
let prevHours = null;
let prevDays = null;

function pad(num) {
  return String(num).padStart(2, '0');
}

function triggerPulse(element) {
  element.classList.remove('tick');
  // Trigger reflow to restart CSS animation
  void element.offsetWidth;
  element.classList.add('tick');
}

function updateCountdown() {
  const now = new Date();
  if (now.getTime() >= targetDate.getTime()) {
    window.location.replace('tesoro.html' + window.location.search);
    return;
  }
  const diff = Math.max(0, targetDate.getTime() - now.getTime());

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  const formattedDays = pad(days);
  const formattedHours = pad(hours);
  const formattedMinutes = pad(minutes);
  const formattedSeconds = pad(seconds);

  if (daysEl.textContent !== formattedDays) {
    daysEl.textContent = formattedDays;
    if (prevDays !== null) triggerPulse(daysEl);
    prevDays = formattedDays;
  }

  if (hoursEl.textContent !== formattedHours) {
    hoursEl.textContent = formattedHours;
    if (prevHours !== null) triggerPulse(hoursEl);
    prevHours = formattedHours;
  }

  if (minutesEl.textContent !== formattedMinutes) {
    minutesEl.textContent = formattedMinutes;
    if (prevMinutes !== null) triggerPulse(minutesEl);
    prevMinutes = formattedMinutes;
  }

  if (secondsEl.textContent !== formattedSeconds) {
    secondsEl.textContent = formattedSeconds;
    if (prevSeconds !== null) triggerPulse(secondsEl);
    prevSeconds = formattedSeconds;
  }

  // Update document title with purely numerical countdown
  document.title = `${formattedDays} : ${formattedHours} : ${formattedMinutes} : ${formattedSeconds}`;
}

updateCountdown();
setInterval(updateCountdown, 1000);

// --- Atmospheric Canvas: Deep Oceanic Abyss & Floating Cyan Motes ---
const canvas = document.getElementById('abyss');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];
const PARTICLE_COUNT = 65;

const mouse = {
  x: -1000,
  y: -1000,
  radius: 180
};

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = -1000;
  mouse.y = -1000;
});

function resizeCanvas() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  initParticles();
}

class Particle {
  constructor() {
    this.reset(true);
  }

  reset(initial = false) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : height + 10;
    this.size = Math.random() * 2.2 + 0.6;
    this.speedY = -(Math.random() * 0.45 + 0.15);
    this.speedX = (Math.random() - 0.5) * 0.25;
    this.opacity = Math.random() * 0.55 + 0.15;
    this.baseOpacity = this.opacity;
    this.pulseSpeed = Math.random() * 0.02 + 0.008;
    this.pulsePhase = Math.random() * Math.PI * 2;
  }

  update() {
    this.y += this.speedY;
    this.x += this.speedX;

    this.pulsePhase += this.pulseSpeed;
    this.opacity = this.baseOpacity + Math.sin(this.pulsePhase) * 0.15;

    // React softly to cursor
    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < mouse.radius && dist > 0) {
      const force = (mouse.radius - dist) / mouse.radius;
      this.x -= (dx / dist) * force * 1.5;
      this.y -= (dy / dist) * force * 1.5;
    }

    if (this.y < -10 || this.x < -20 || this.x > width + 20) {
      this.reset();
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 247, 255, ${Math.max(0, this.opacity)})`;
    ctx.shadowBlur = this.size * 6;
    ctx.shadowColor = 'rgba(0, 247, 255, 0.8)';
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);

  // Subtle interactive cyan bloom at cursor
  if (mouse.x > 0 && mouse.y > 0) {
    const radialGrad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
    radialGrad.addColorStop(0, 'rgba(0, 247, 255, 0.045)');
    radialGrad.addColorStop(0.5, 'rgba(0, 247, 255, 0.015)');
    radialGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);
  }

  // Draw and update particles
  for (let i = 0; i < particles.length; i++) {
    particles[i].update();
    particles[i].draw();
  }

  requestAnimationFrame(animate);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
requestAnimationFrame(animate);
