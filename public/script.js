(() => {
  let target = Date.UTC(2026, 9, 26, 12, 0, 0); // lunes 26 de octubre, 9:00 en Chile (UTC−3)
  let offset = 0;
  let synced = false;
  let wasLive = false;
  let finishing = false;
  let loopStarted = false;

  const C = {
    fondo: '#2e0e19',
    burdeo: '#561729',
    sombra: '#1d0810',
    celeste: '#a9d8f0',
    crema: '#f4ede4',
    apagado: '#7a3a4d'
  };

  // Fuente propia de 5×7.
  const F = {
    '0': ['01110','10001','10011','10101','11001','10001','01110'],
    '1': ['00100','01100','00100','00100','00100','00100','01110'],
    '2': ['01110','10001','00001','00010','00100','01000','11111'],
    '3': ['11110','00001','00001','01110','00001','00001','11110'],
    '4': ['00010','00110','01010','10010','11111','00010','00010'],
    '5': ['11111','10000','11110','00001','00001','10001','01110'],
    '6': ['00110','01000','10000','11110','10001','10001','01110'],
    '7': ['11111','00001','00010','00100','01000','01000','01000'],
    '8': ['01110','10001','10001','01110','10001','10001','01110'],
    '9': ['01110','10001','10001','01111','00001','00010','01100'],
    ':': ['0','1','1','0','1','1','0'],
    ';': ['0','0','0','0','0','0','0'], // los dos puntos apagados, del mismo ancho
    ' ': ['000','000','000','000','000','000','000'],
    '·': ['0','0','0','1','0','0','0'],
    'A': ['01110','10001','10001','11111','10001','10001','10001'],
    'C': ['01110','10001','10000','10000','10000','10001','01110'],
    'D': ['11110','10001','10001','10001','10001','10001','11110'],
    'E': ['11111','10000','10000','11110','10000','10000','11111'],
    'G': ['01110','10001','10000','10111','10001','10001','01111'],
    'H': ['10001','10001','10001','11111','10001','10001','10001'],
    'I': ['111','010','010','010','010','010','111'],
    'L': ['10000','10000','10000','10000','10000','10000','11111'],
    'M': ['10001','11011','10101','10101','10001','10001','10001'],
    'N': ['10001','11001','10101','10011','10001','10001','10001'],
    'O': ['01110','10001','10001','10001','10001','10001','01110'],
    'R': ['11110','10001','10001','11110','10100','10010','10001'],
    'S': ['01111','10000','10000','01110','00001','00001','11110'],
    'T': ['11111','00100','00100','00100','00100','00100','00100'],
    'U': ['10001','10001','10001','10001','10001','10001','01110'],
  };

  const ancho = (t) => [...t].reduce((w, ch) => w + (F[ch] || F[' '])[0].length + 1, -1);

  function texto(g, t, x, y, col, sombra) {
    for (const ch of t) {
      const gl = F[ch] || F[' '];
      gl.forEach((fila, j) => [...fila].forEach((b, i) => {
        if (b !== '1') return;
        if (sombra) { g.fillStyle = sombra; g.fillRect(x + i, y + j + 1, 1, 1); }
        g.fillStyle = col; g.fillRect(x + i, y + j, 1, 1);
      }));
      x += gl[0].length + 1;
    }
  }

  // Lienzo lógico de baja resolución, escalado con un factor entero.
  const cv = document.getElementById('cv');
  const g = cv.getContext('2d');
  const LW = 96;
  const LH = 64;
  let esc = 1;

  function ajustar() {
    const dpr = window.devicePixelRatio || 1;
    esc = Math.max(1, Math.floor(Math.min((innerWidth * 0.92) / LW, (innerHeight * 0.8) / LH) * dpr));
    cv.width = LW * esc;
    cv.height = LH * esc;
    cv.style.width = cv.width / dpr + 'px';
    cv.style.height = cv.height / dpr + 'px';
  }
  addEventListener('resize', ajustar);
  ajustar();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dos = (n) => String(n).padStart(2, '0');
  const nowMs = () => Date.now() + offset;

  const o = document.createElement('canvas');
  o.width = LW;
  o.height = LH;
  const p = o.getContext('2d');
  const big = document.createElement('canvas');
  const bigCtx = big.getContext('2d');

  async function fetchState() {
    const t0 = Date.now();
    const res = await fetch('/api/t', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const data = await res.json();
    const t1 = Date.now();
    if (typeof data.t === 'number') target = data.t;
    if (typeof data.n === 'number') {
      offset = data.n - Math.round((t0 + t1) / 2);
      synced = true;
    }
    return data;
  }

  function warmOrigin(url) {
    try {
      const origin = new URL(url).origin;
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      link.crossOrigin = '';
      document.head.appendChild(link);
    } catch {}
  }

  async function resolveRedirect(liveTransition) {
    if (finishing) return;
    finishing = true;

    const minWaitPromise = liveTransition
      ? new Promise((resolve) => setTimeout(resolve, 1500))
      : Promise.resolve();

    let backoff = 150;
    while (true) {
      try {
        const data = await fetchState();
        if (data.u) {
          warmOrigin(data.u);
          await minWaitPromise;
          window.location.replace(data.u);
          return;
        }
        const rem = target - nowMs();
        if (rem > 2000) {
          finishing = false;
          wasLive = true;
          return;
        }
        const waitMs = Math.max(100, Math.min(1000, rem + 40));
        await new Promise((r) => setTimeout(r, waitMs));
      } catch {
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(2000, backoff * 1.5);
      }
    }
  }

  function dibujar(t) {
    const resta = Math.max(0, target - nowMs());
    if (resta > 0) wasLive = true;

    const s = Math.floor(resta / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor(s / 60) % 60;
    const sg = s % 60;

    p.fillStyle = C.fondo;
    p.fillRect(0, 0, LW, LH);

    // Placa burdeo con borde.
    p.fillStyle = C.sombra;
    p.fillRect(5, 15, 86, 30);
    p.fillStyle = C.burdeo;
    p.fillRect(4, 13, 88, 30);
    p.fillStyle = C.celeste;
    p.fillRect(4, 13, 88, 1);

    // Dígitos grandes (cada pixel de la fuente = 2×2).
    const bt = `${dos(Math.min(h, 99))}:${dos(m)}:${dos(sg)}`;
    big.width = ancho(bt);
    big.height = 8;
    const parpadeo = reduce || Math.floor(t / 500) % 2 === 0;
    texto(bigCtx, parpadeo ? bt : bt.replace(/:/g, ';'), 0, 0, C.crema, C.sombra);
    p.imageSmoothingEnabled = false;
    const bx = Math.round((LW - big.width * 2) / 2);
    p.drawImage(big, bx, 18, big.width * 2, big.height * 2);

    // Rótulos bajo cada par de dígitos.
    const col = (w0, lbl) => texto(p, lbl, Math.round(bx + w0 * 2 + (11 * 2 - ancho(lbl)) / 2), 35, C.celeste);
    col(0, 'HRS');
    col(14, 'MIN');
    col(28, 'SEG');

    // Fecha de apertura.
    const f = 'LUN 26 OCT · 09:00';
    texto(p, f, Math.round((LW - ancho(f)) / 2), 49, C.apagado);

    // Línea de latido que avanza.
    // La punta recorre de x=4 a x=91 y sigue 24 pasos más, hasta que la cola sale, antes de volver a partir.
    const yb = 6;
    const fase = reduce ? 44 : 4 + Math.floor(t / 40) % (88 + 24);
    for (let x = 4; x < 92; x++) {
      const cerca = fase - x; // 0 = punta de la línea; negativo = todavía no llega
      const dy = cerca >= 0 ? [-1, 3, -4, -2][cerca] || 0 : 0;
      p.fillStyle = cerca >= 0 && cerca < 24 ? C.celeste : C.burdeo;
      p.fillRect(x, yb + dy, 1, 1);
      if (dy) {
        p.fillRect(x, yb + Math.min(0, dy), 1, Math.abs(dy) + 1);
      }
    }

    g.imageSmoothingEnabled = false;
    g.drawImage(o, 0, 0, LW * esc, LH * esc);

    if (resta === 0 && !finishing) {
      resolveRedirect(wasLive);
    }
    requestAnimationFrame(dibujar);
  }

  function startLoop() {
    if (!loopStarted) {
      loopStarted = true;
      requestAnimationFrame(dibujar);
    }
  }

  async function init() {
    const fallbackTimer = setTimeout(() => {
      if (!synced && !finishing && target - Date.now() > 5000) {
        startLoop();
      }
    }, 350);

    try {
      const data = await fetchState();
      clearTimeout(fallbackTimer);
      if (data.u && (!wasLive || data.n - data.t > 5000)) {
        window.location.replace(data.u);
        return;
      }
      startLoop();
    } catch {
      clearTimeout(fallbackTimer);
      if (!finishing) startLoop();
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !finishing) {
      fetchState()
        .then((data) => {
          if (data.u && (!wasLive || data.n - data.t > 5000)) {
            window.location.replace(data.u);
            return;
          }
          if (!finishing) startLoop();
        })
        .catch(() => {
          if (!finishing) startLoop();
        });
    }
  });

  setInterval(() => {
    if (!document.hidden && !finishing) {
      fetchState().catch(() => {});
    }
  }, 20000);

  init();
})();
