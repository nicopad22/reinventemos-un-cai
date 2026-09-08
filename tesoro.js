/**
 * Busqueda del Tesoro • Reinventemos el CAI
 * Mecanica de Busqueda QR + Mesa de Crafteo Minecraft
 */

// Sound Engine using Web Audio API
class MCSoundEngine {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playPop() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const now = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {
      console.warn('Audio playPop error:', e);
    }
  }

  playDing() {
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [880, 1174, 1567]; // A5, D6, G6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = this.ctx.currentTime + idx * 0.09;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.35, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.28);
      });
    } catch (e) {
      console.warn('Audio playDing error:', e);
    }
  }

  playWin() {
    try {
      this.init();
      if (!this.ctx) return;
      const chords = [
        { freqs: [523.25, 659.25, 783.99], time: 0.0 },  // C major
        { freqs: [587.33, 739.99, 880.00], time: 0.25 }, // D major
        { freqs: [659.25, 830.61, 987.77], time: 0.5 },  // E major
        { freqs: [783.99, 987.77, 1174.66, 1567.98], time: 0.8 } // High G major + octave
      ];

      chords.forEach(c => {
        c.freqs.forEach(freq => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const start = this.ctx.currentTime + c.time;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.35, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(start);
          osc.stop(start + 0.55);
        });
      });
    } catch (e) {
      console.warn('Audio playWin error:', e);
    }
  }
}

const sounds = new MCSoundEngine();

// Confetti System
class ConfettiSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animating = false;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  burst() {
    this.resize();
    const colors = ['#ff5555', '#ffaa00', '#ffff55', '#55ff55', '#55ffff', '#ff55ff', '#ffffff'];
    for (let i = 0; i < 120; i++) {
      this.particles.push({
        x: this.width / 2,
        y: this.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        size: Math.random() * 8 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        alpha: 1.0,
        decay: Math.random() * 0.008 + 0.005
      });
    }
    if (!this.animating) {
      this.animating = true;
      this.loop();
    }
  }

  loop() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.42; // gravity
      p.rotation += p.rotSpeed;
      p.alpha -= p.decay;

      if (p.alpha <= 0 || p.y > this.height + 20) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      // Pixel block confetti
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
}

// Global Game State and Controller
class TreasureHuntGame {
  constructor() {
    this.data = null;
    this.STORAGE_KEY = 'cai_minecraft_tesoro_v1';
    
    // Total 46 slots:
    // 0..8: Crafting Grid (3x3)
    // 9: Result Slot
    // 10..36: 27 Inventory slots (3x9)
    // 37..45: 9 Hotbar slots (1x9)
    this.state = {
      stepIndex: 0,
      redeemedCodes: [],
      slots: new Array(46).fill(null),
      cakeCrafted: false
    };

    this.heldItem = null; // { item, fromSlotIndex }
    this.activeTab = 'scanner';
    this.html5QrCode = null;
    this.scannerRunning = false;
    this.confetti = null;

    // Slot Coordinate Definitions on craftingtable.png (300 x 283)
    this.slotDefs = this.calculateSlotPositions();
  }

  calculateSlotPositions() {
    const defs = [];
    // 3x3 Crafting Grid (indices 0..8)
    const gridX = [53, 84, 115];
    const gridY = [31, 62, 93];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        defs.push({
          type: 'crafting',
          left: (gridX[c] / 300) * 100,
          top: (gridY[r] / 283) * 100,
          width: (23 / 300) * 100,
          height: (23 / 283) * 100
        });
      }
    }

    // Result Slot (index 9)
    defs.push({
      type: 'result',
      left: (207 / 300) * 100,
      top: (55 / 283) * 100,
      width: (36 / 300) * 100,
      height: (36 / 283) * 100
    });

    // 27 Inventory Slots (indices 10..36)
    const invX = [16, 47, 77, 108, 139, 169, 200, 231, 261];
    const invY = [146, 176, 207];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 9; c++) {
        defs.push({
          type: 'inventory',
          left: (invX[c] / 300) * 100,
          top: (invY[r] / 283) * 100,
          width: (23 / 300) * 100,
          height: (23 / 283) * 100
        });
      }
    }

    // 9 Hotbar Slots (indices 37..45)
    for (let c = 0; c < 9; c++) {
      defs.push({
        type: 'hotbar',
        left: (invX[c] / 300) * 100,
        top: (244 / 283) * 100,
        width: (23 / 300) * 100,
        height: (23 / 283) * 100
      });
    }

    return defs;
  }

  async init() {
    this.confetti = new ConfettiSystem(document.getElementById('confetti-canvas'));
    await this.loadData();
    this.loadState();
    this.renderSlotElements();
    this.checkRecipe();
    this.renderSlots();
    this.updateClueBanner();
    this.setupEventListeners();
    this.setupNavigation();
    this.setupQRScanner();

    // Check URL parameters for direct redemption (?code=...)
    this.checkUrlRedeem();
  }

  async loadData() {
    try {
      const res = await fetch('tesoro_data.json');
      if (!res.ok) throw new Error('Error al cargar datos del tesoro');
      this.data = await res.json();
    } catch (e) {
      console.error('Error loading tesoro_data.json:', e);
      this.showToast('Error cargando configuracion del juego', 'error');
    }
  }

  loadState() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.slots)) {
          this.state.stepIndex = parsed.stepIndex || 0;
          this.state.redeemedCodes = parsed.redeemedCodes || [];
          this.state.cakeCrafted = parsed.cakeCrafted || false;
          // Ensure slots length is 46
          for (let i = 0; i < 46; i++) {
            this.state.slots[i] = parsed.slots[i] || null;
          }
        }
      }
    } catch (e) {
      console.warn('Error reading localStorage:', e);
    }
  }

  saveState() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Error saving to localStorage:', e);
    }
  }

  // Render the HTML slots once inside #slots-layer
  renderSlotElements() {
    const layer = document.getElementById('slots-layer');
    layer.innerHTML = '';

    this.slotDefs.forEach((def, index) => {
      const slotEl = document.createElement('div');
      slotEl.className = `slot slot-${def.type}`;
      slotEl.dataset.slotIndex = index;
      slotEl.style.left = `${def.left}%`;
      slotEl.style.top = `${def.top}%`;
      slotEl.style.width = `${def.width}%`;
      slotEl.style.height = `${def.height}%`;

      // Click / Tap Handler
      slotEl.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleSlotClick(index);
      });

      // Touch Drag & Drop support for mobile
      let touchMoved = false;
      slotEl.addEventListener('touchstart', (e) => {
        touchMoved = false;
        // If holding an item and touching a slot, we will let touchend or click handle it
        // If not holding an item and touching a slot with item, update floating position immediately
        if (e.touches && e.touches[0]) {
          const t = e.touches[0];
          const el = document.getElementById('floating-hand-item');
          el.style.left = `${t.clientX}px`;
          el.style.top = `${t.clientY}px`;
        }
      }, { passive: true });

      slotEl.addEventListener('touchmove', () => {
        touchMoved = true;
      }, { passive: true });

      slotEl.addEventListener('touchend', (e) => {
        if (touchMoved && this.heldItem && e.changedTouches && e.changedTouches[0]) {
          const t = e.changedTouches[0];
          const targetEl = document.elementFromPoint(t.clientX, t.clientY);
          const targetSlot = targetEl ? targetEl.closest('.slot') : null;
          if (targetSlot && targetSlot.dataset.slotIndex !== undefined) {
            const targetIdx = parseInt(targetSlot.dataset.slotIndex, 10);
            e.preventDefault();
            this.handleSlotClick(targetIdx);
          }
        }
      });

      layer.appendChild(slotEl);
    });
  }

  // Update visually what each slot contains
  renderSlots() {
    const slotElements = document.querySelectorAll('#slots-layer .slot');
    slotElements.forEach((el, index) => {
      const item = this.state.slots[index];
      el.innerHTML = '';
      el.classList.remove('selected-slot');

      if (this.heldItem && this.heldItem.fromSlotIndex === index) {
        el.classList.add('selected-slot');
      }

      if (item) {
        const img = document.createElement('img');
        img.src = item.sprite;
        img.alt = item.name;
        img.className = 'item-icon';
        img.title = item.name;
        el.appendChild(img);
      }
    });
  }

  updateClueBanner() {
    const badgeEl = document.getElementById('clue-badge');
    const textEl = document.getElementById('clue-text');

    if (!badgeEl || !textEl || !this.data || !this.data.steps) return;

    if (this.state.stepIndex < this.data.steps.length) {
      const currentStep = this.data.steps[this.state.stepIndex];
      badgeEl.textContent = `PISTA ${currentStep.step} DE ${this.data.steps.length}`;
      textEl.textContent = currentStep.hint;
    } else {
      badgeEl.textContent = 'COMPLETO';
      textEl.textContent = 'Todos los ingredientes listos! Hora de craftear el pastel.';
    }
  }

  // Handle slot click (Minecraft inventory behavior)
  handleSlotClick(slotIndex) {
    sounds.playPop();

    // Result Slot Click
    if (slotIndex === 9) {
      const resultItem = this.state.slots[9];
      if (resultItem && resultItem.id === 'cake') {
        this.craftCake();
      }
      return;
    }

    // If NO item is held in hand:
    if (!this.heldItem) {
      const itemInSlot = this.state.slots[slotIndex];
      if (itemInSlot) {
        // Pick up item!
        this.heldItem = {
          item: itemInSlot,
          fromSlotIndex: slotIndex
        };
        this.state.slots[slotIndex] = null;
        this.updateFloatingHandItem();
        this.checkRecipe();
        this.renderSlots();
      }
      return;
    }

    // If an item IS held in hand:
    const itemInTarget = this.state.slots[slotIndex];
    if (!itemInTarget) {
      // Place into empty slot
      this.state.slots[slotIndex] = this.heldItem.item;
      this.heldItem = null;
      this.hideFloatingHandItem();
    } else {
      // Swap items
      const temp = itemInTarget;
      this.state.slots[slotIndex] = this.heldItem.item;
      this.heldItem = {
        item: temp,
        fromSlotIndex: slotIndex
      };
      this.updateFloatingHandItem();
    }

    this.checkRecipe();
    this.saveState();
    this.renderSlots();
  }

  // Check 3x3 crafting grid against recipe
  checkRecipe() {
    if (!this.data || !this.data.recipe) return;

    const targetGrid = this.data.recipe.grid; // 9 items
    let match = true;

    for (let i = 0; i < 9; i++) {
      const slotItem = this.state.slots[i];
      const requiredId = targetGrid[i];
      if (!slotItem || slotItem.id !== requiredId) {
        match = false;
        break;
      }
    }

    if (match) {
      this.state.slots[9] = {
        id: this.data.recipe.result.id,
        name: this.data.recipe.result.name,
        sprite: this.data.recipe.result.sprite
      };
    } else {
      this.state.slots[9] = null;
    }
  }

  // Crafting action
  craftCake() {
    // Clear 9 crafting slots
    for (let i = 0; i < 9; i++) {
      this.state.slots[i] = null;
    }

    this.state.slots[9] = null;
    this.state.cakeCrafted = true;
    this.saveState();
    this.renderSlots();

    // Sound and celebration
    sounds.playWin();
    this.confetti.burst();

    // Show celebration modal
    const winModal = document.getElementById('modal-win');
    winModal.classList.add('open');
  }

  // Clear Crafting Grid: return items from 0..8 back to empty inventory slots
  clearCraftingTable() {
    sounds.playPop();
    let returned = 0;
    for (let i = 0; i < 9; i++) {
      const item = this.state.slots[i];
      if (item) {
        // Find empty inventory or hotbar slot (10..45)
        const emptyIdx = this.findEmptyInventorySlot();
        if (emptyIdx !== -1) {
          this.state.slots[emptyIdx] = item;
          this.state.slots[i] = null;
          returned++;
        }
      }
    }

    if (this.heldItem) {
      const emptyIdx = this.findEmptyInventorySlot();
      if (emptyIdx !== -1) {
        this.state.slots[emptyIdx] = this.heldItem.item;
        this.heldItem = null;
        this.hideFloatingHandItem();
      }
    }

    this.checkRecipe();
    this.saveState();
    this.renderSlots();

    if (returned > 0) {
      this.showToast('Ingredientes devueltos al inventario', 'success');
    }
  }

  findEmptyInventorySlot() {
    // Check hotbar first (37..45), then main inventory (10..36)
    for (let i = 37; i <= 45; i++) {
      if (!this.state.slots[i]) return i;
    }
    for (let i = 10; i <= 36; i++) {
      if (!this.state.slots[i]) return i;
    }
    return -1;
  }

  // Floating hand item tracking
  updateFloatingHandItem() {
    const el = document.getElementById('floating-hand-item');
    const img = document.getElementById('floating-item-img');
    if (this.heldItem) {
      img.src = this.heldItem.item.sprite;
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }

  hideFloatingHandItem() {
    const el = document.getElementById('floating-hand-item');
    el.style.display = 'none';
  }

  setupEventListeners() {
    // Track mouse & touch position for floating held item
    const moveHandler = (x, y) => {
      if (this.heldItem) {
        const el = document.getElementById('floating-hand-item');
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
      }
    };

    window.addEventListener('mousemove', (e) => moveHandler(e.clientX, e.clientY));
    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        moveHandler(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    // Cancel held item if clicking outside
    document.addEventListener('click', (e) => {
      if (this.heldItem && !e.target.closest('.slot') && !e.target.closest('.crafting-gui-wrapper')) {
        // Return item back to origin
        if (!this.state.slots[this.heldItem.fromSlotIndex]) {
          this.state.slots[this.heldItem.fromSlotIndex] = this.heldItem.item;
        } else {
          const empty = this.findEmptyInventorySlot();
          if (empty !== -1) this.state.slots[empty] = this.heldItem.item;
        }
        this.heldItem = null;
        this.hideFloatingHandItem();
        this.checkRecipe();
        this.saveState();
        this.renderSlots();
      }
    });

    // Manual code form submit
    const manualForm = document.getElementById('form-manual-code');
    manualForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('input-manual-code');
      const code = input.value.trim();
      if (code) {
        this.redeemCode(code);
        input.value = '';
      }
    });

    // Dev test buttons
    document.querySelectorAll('.dev-test-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.dataset.code;
        if (code) this.redeemCode(code);
      });
    });

    // Clear Crafting Table
    document.getElementById('btn-clear-crafting').addEventListener('click', () => {
      this.clearCraftingTable();
    });

    // Reset Game button
    document.getElementById('btn-reset-game').addEventListener('click', () => {
      if (confirm('Deseas reiniciar la busqueda del tesoro y vaciar tu inventario?')) {
        this.resetGame();
      }
    });

    // Hints modal
    document.getElementById('btn-open-hints').addEventListener('click', () => {
      this.openHintsModal();
    });
    document.getElementById('btn-close-hints').addEventListener('click', () => {
      document.getElementById('modal-hints').classList.remove('open');
    });

    // Redeem Modal actions
    document.getElementById('btn-close-redeem-continue').addEventListener('click', () => {
      document.getElementById('modal-redeem').classList.remove('open');
      this.switchTab('scanner');
    });
    document.getElementById('btn-close-redeem-inventory').addEventListener('click', () => {
      document.getElementById('modal-redeem').classList.remove('open');
      this.switchTab('inventory');
    });

    // Win Modal action
    document.getElementById('btn-close-win').addEventListener('click', () => {
      document.getElementById('modal-win').classList.remove('open');
    });
  }

  // Setup navigation tabs
  setupNavigation() {
    const scannerBtn = document.getElementById('nav-btn-scanner');
    const inventoryBtn = document.getElementById('nav-btn-inventory');

    scannerBtn.addEventListener('click', () => this.switchTab('scanner'));
    inventoryBtn.addEventListener('click', () => this.switchTab('inventory'));
  }

  switchTab(tabName) {
    if (this.activeTab === tabName) return;
    this.activeTab = tabName;
    document.body.dataset.activeTab = tabName;

    // Update nav buttons
    document.getElementById('nav-btn-scanner').classList.toggle('active', tabName === 'scanner');
    document.getElementById('nav-btn-inventory').classList.toggle('active', tabName === 'inventory');

    if (tabName === 'scanner') {
      this.resumeScanner();
    } else {
      this.pauseScanner();
    }
  }

  // QR Code Scanner Setup
  setupQRScanner() {
    if (typeof Html5Qrcode === 'undefined') {
      console.warn('Html5Qrcode not loaded');
      return;
    }

    try {
      this.html5QrCode = new Html5Qrcode('reader');
      this.startScanner();
    } catch (e) {
      console.error('QR Scanner init error:', e);
    }
  }

  startScanner() {
    if (!this.html5QrCode || this.scannerRunning) return;

    const qrConfig = {
      fps: 10,
      qrbox: { width: 220, height: 220 }
    };

    this.html5QrCode.start(
      { facingMode: 'environment' },
      qrConfig,
      (decodedText) => {
        this.handleQrScanSuccess(decodedText);
      },
      (errorMsg) => {
        // Ignored scan frame errors
      }
    ).then(() => {
      this.scannerRunning = true;
    }).catch(err => {
      console.warn('Camera permission or availability error:', err);
      this.scannerRunning = false;
    });
  }

  pauseScanner() {
    if (this.html5QrCode && this.scannerRunning) {
      this.html5QrCode.pause();
    }
  }

  resumeScanner() {
    if (this.html5QrCode && this.scannerRunning) {
      this.html5QrCode.resume();
    } else if (this.html5QrCode && !this.scannerRunning) {
      this.startScanner();
    }
  }

  handleQrScanSuccess(decodedText) {
    sounds.playDing();
    this.redeemCode(decodedText);
  }

  // URL Parameter Redemption Check
  // Extract code from full URLs (e.g. http://reinventemos.cl/tesoro?qr=qpkcNh) or raw strings
  extractCode(raw) {
    if (!raw) return '';
    let str = String(raw).trim();

    // Check for URL query param (?qr=..., ?code=..., ?c=...)
    try {
      let urlObj;
      if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('//')) {
        urlObj = new URL(str, window.location.origin);
      } else if (str.includes('?')) {
        urlObj = new URL(str, 'http://dummy.local');
      }

      if (urlObj) {
        const param = urlObj.searchParams.get('qr') || 
                      urlObj.searchParams.get('code') || 
                      urlObj.searchParams.get('c');
        if (param) return param.trim();
      }
    } catch (e) {
      // Fallback to regex
    }

    // Regex fallback for ?qr=... or &qr=...
    const match = str.match(/[?&](?:qr|code|c)=([^&#]+)/i);
    if (match) {
      return decodeURIComponent(match[1]).trim();
    }

    return str;
  }

  // URL Parameter Redemption Check on page load
  checkUrlRedeem() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('qr') || params.get('code') || params.get('c');
    if (code) {
      setTimeout(() => {
        this.redeemCode(code);
        // Clean URL query without reloading
        window.history.replaceState({}, '', window.location.pathname);
      }, 400);
    }
  }

  // Core Redemption Logic (Sequential Order Enforced)
  redeemCode(rawCode) {
    if (!this.data || !this.data.steps) return;

    const cleanCode = this.extractCode(rawCode);
    if (!cleanCode) return;

    // Match exact case first, then case-insensitive
    let matchedStepIndex = this.data.steps.findIndex(s => s.code === cleanCode);
    if (matchedStepIndex === -1) {
      matchedStepIndex = this.data.steps.findIndex(s => s.code.toLowerCase() === cleanCode.toLowerCase());
    }

    if (matchedStepIndex === -1) {
      this.showToast('Codigo QR no reconocido. Busca un codigo valido del CAI.', 'error');
      return;
    }

    const step = this.data.steps[matchedStepIndex];

    // Already redeemed?
    if (matchedStepIndex < this.state.stepIndex) {
      this.showToast(`Ya canjeaste este ingrediente (${step.itemName})!`, 'error');
      return;
    }

    // Out of order (future step)?
    if (matchedStepIndex > this.state.stepIndex) {
      const currentStep = this.data.steps[this.state.stepIndex];
      this.showToast(`Aun no es momento de este ingrediente! Sigue el orden de pistas. Pista actual: "${currentStep.hint}"`, 'error');
      return;
    }

    // Correct step!
    const itemDef = this.data.items[step.itemId];
    if (!itemDef) return;

    // Add unstacked items to inventory
    let addedCount = 0;
    for (let q = 0; q < step.quantity; q++) {
      const emptySlot = this.findEmptyInventorySlot();
      if (emptySlot !== -1) {
        this.state.slots[emptySlot] = {
          id: itemDef.id,
          name: itemDef.name,
          sprite: itemDef.sprite
        };
        addedCount++;
      }
    }

    // Advance step
    this.state.stepIndex++;
    this.state.redeemedCodes.push(cleanCode);
    this.saveState();
    this.checkRecipe();
    this.renderSlots();
    this.updateClueBanner();

    sounds.playDing();

    // Show Redeem Modal
    const modal = document.getElementById('modal-redeem');
    document.getElementById('redeem-item-name').textContent = `${step.quantity > 1 ? step.quantity + 'x ' : ''}${step.itemName}`;
    document.getElementById('redeem-item-img').src = itemDef.sprite;
    document.getElementById('redeem-message').textContent = step.redeemedMessage;
    document.getElementById('redeem-next-hint').textContent = step.nextHint;
    modal.classList.add('open');
  }

  // Open History of Hints Modal
  openHintsModal() {
    const list = document.getElementById('hints-list');
    list.innerHTML = '';

    if (!this.data || !this.data.steps) return;

    this.data.steps.forEach((step, idx) => {
      const isUnlocked = idx <= this.state.stepIndex;
      const isCompleted = idx < this.state.stepIndex;

      const itemCard = document.createElement('div');
      itemCard.style.padding = '8px';
      itemCard.style.border = '2px solid #222';
      itemCard.style.fontSize = '10px';
      itemCard.style.background = isCompleted ? '#2a402a' : (isUnlocked ? '#392b1a' : '#222222');
      itemCard.style.color = isUnlocked ? '#ffffff' : '#777777';

      let statusTag = isCompleted ? '✓ OBTENIDO' : (isUnlocked ? '★ PISTA ACTUAL' : '🔒 BLOQUEADO');
      itemCard.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px; color: ${isUnlocked ? '#ffff55' : '#888'};">
          Paso ${step.step}: ${step.itemName} (${statusTag})
        </div>
        <div>${isUnlocked ? step.hint : 'Sigue la aventura para desbloquear esta pista.'}</div>
      `;
      list.appendChild(itemCard);
    });

    document.getElementById('modal-hints').classList.add('open');
  }

  // Toast notifications
  showToast(msg, type = 'info') {
    const toast = document.getElementById('mc-toast');
    toast.textContent = msg;
    toast.className = `mc-toast show ${type}`;

    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3600);
  }

  // Reset Game for testing
  resetGame() {
    this.state = {
      stepIndex: 0,
      redeemedCodes: [],
      slots: new Array(46).fill(null),
      cakeCrafted: false
    };
    this.heldItem = null;
    this.hideFloatingHandItem();
    this.saveState();
    this.checkRecipe();
    this.renderSlots();
    this.updateClueBanner();
    this.showToast('Partida reiniciada.', 'info');
  }
}

// Start game on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const game = new TreasureHuntGame();
  game.init();
  window.currentGame = game; // Accessible for dev testing in console
});
