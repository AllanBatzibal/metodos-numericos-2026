// Variable global para controlar la animación
let timer = null;

// Estado del modo paso a paso
const stepMode = { active: false, idx: 0, steps: [] };

// Historial de ejecuciones (máx. 10, persistido en localStorage)
const HISTORY_KEY = 'newton_history';
let history = [];

// Evalúa la función f(x) ingresada por el usuario
function evalF(expr, x) {
  try {
    return math.evaluate(expr, { x });
  } catch {
    return NaN;
  }
}

// Calcula la derivada f'(x) numéricamente
// Usa la diferencia centrada para mayor precisión
function evalD(expr, x) {
  const h = 1e-7;
  return (evalF(expr, x + h) - evalF(expr, x - h)) / (2 * h);
}

// Algoritmo de Newton-Raphson
// Recibe la función, valor inicial x0, tolerancia y máximo de iteraciones
// Devuelve un arreglo con todas las iteraciones
function compute(fn, x0, tol, maxIt) {
  let x = x0;
  let steps = [];

  for (let i = 1; i <= maxIt; i++) {
    const fx  = evalF(fn, x);
    const fpx = evalD(fn, x);

    // Si la derivada es casi cero, el método falla
    if (Math.abs(fpx) < 1e-14) {
      document.getElementById('step-lbl').textContent =
        'Error: la derivada es cero, el método no puede continuar.';
      break;
    }

    // Fórmula de Newton-Raphson
    const x1  = x - fx / fpx;
    const err = Math.abs(x1 - x);

    // Guarda los datos de esta iteración
    steps.push({ i, x, fx, fpx, x1, err });

    // Actualiza x para la siguiente iteración
    x = x1;

    // Si el error es menor a la tolerancia, se encontró la raíz
    if (err < tol) break;
  }

  return steps;
}

// Dibuja un frame de la animación en el canvas
function drawFrame(steps, idx) {
  const cvs = document.getElementById('cvs');
  const ctx = cvs.getContext('2d');
  cvs.width = cvs.offsetWidth * 2;
  cvs.height = 560;
  const W = cvs.width;
  const H = cvs.height;
  const fn = document.getElementById('fn').value;

  // Limpia el canvas antes de dibujar
  ctx.clearRect(0, 0, W, H);

  // Calcula los límites del gráfico basado en todos los puntos
  const xs = steps.map(s => s.x);
  xs.push(steps[steps.length - 1].x1);
  const xMin = Math.min(...xs) - 0.3;
  const xMax = Math.max(...xs) + 0.3;

  // Evalúa varios puntos para saber el rango de Y
  let ys = [];
  for (let px = 0; px <= 200; px++) {
    ys.push(evalF(fn, xMin + (px / 200) * (xMax - xMin)));
  }
  const yMin = Math.min(...ys, 0) - 3;
  const yMax = Math.max(...ys, 0) + 3;

  // Funciones para convertir coordenadas matemáticas a píxeles
  const tx = x => 40 + ((x - xMin) / (xMax - xMin)) * (W - 80);
  const ty = y => 20 + ((yMax - y) / (yMax - yMin)) * (H - 40);

  // Dibuja líneas de grilla
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let gx = Math.ceil(xMin); gx <= xMax; gx++) {
    ctx.beginPath();
    ctx.moveTo(tx(gx), 20);
    ctx.lineTo(tx(gx), H - 20);
    ctx.stroke();
  }

  // Dibuja los ejes X e Y
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  if (0 >= yMin && 0 <= yMax) {
    ctx.beginPath();
    ctx.moveTo(40, ty(0));
    ctx.lineTo(W - 40, ty(0));
    ctx.stroke();
  }
  if (0 >= xMin && 0 <= xMax) {
    ctx.beginPath();
    ctx.moveTo(tx(0), 20);
    ctx.lineTo(tx(0), H - 20);
    ctx.stroke();
  }

  // Dibuja las tangentes anteriores en color tenue
  for (let j = 0; j <= idx; j++) {
    const st = steps[j];
    const alpha = j === idx ? 1 : 0.2 + 0.05 * j;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#7F77DD';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(tx(st.x), ty(st.fx));
    ctx.lineTo(tx(st.x1), ty(0));
    ctx.stroke();
    ctx.setLineDash([]);

    // Punto en la curva
    ctx.fillStyle = '#534AB7';
    ctx.beginPath();
    ctx.arc(tx(st.x), ty(st.fx), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Dibuja la curva de la función
  ctx.strokeStyle = '#0077ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let px = 0; px <= W - 80; px++) {
    const x = xMin + (px / (W - 80)) * (xMax - xMin);
    const y = evalF(fn, x);
    if (isNaN(y)) continue;
    px === 0 ? ctx.moveTo(40 + px, ty(y)) : ctx.lineTo(40 + px, ty(y));
  }
  ctx.stroke();

  // Dibuja el punto actual xₙ₊₁ en el eje X
  const s = steps[idx];
  const done = idx === steps.length - 1;
  ctx.fillStyle = done ? '#ff4d6d' : '#0077ff';
  ctx.beginPath();
  ctx.arc(tx(s.x1), ty(0), 7, 0, Math.PI * 2);
  ctx.fill();

  // Etiqueta con el valor de xₙ₊₁
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(tx(s.x1) + 10, ty(0) - 22, 130, 18);
  ctx.fillStyle = done ? '#ff4d6d' : '#0077ff';
  ctx.font = '11px Space Mono, monospace';
  ctx.fillText(`x = ${s.x1.toFixed(6)}`, tx(s.x1) + 14, ty(0) - 8);
}

// Calcula límites del gráfico para Newton-Raphson
function getNewtonBounds(steps, fn) {
  const xs = steps.map(s => s.x);
  xs.push(steps[steps.length - 1].x1);
  const xMin = Math.min(...xs) - 0.3;
  const xMax = Math.max(...xs) + 0.3;
  const ys = [];
  for (let px = 0; px <= 200; px++) {
    ys.push(evalF(fn, xMin + (px / 200) * (xMax - xMin)));
  }
  return { xMin, xMax, yMin: Math.min(...ys, 0) - 3, yMax: Math.max(...ys, 0) + 3 };
}

// Dibuja la gráfica estática final con todas las tangentes superpuestas
function drawStaticFrame(steps) {
  const cvs = document.getElementById('cvs');
  const ctx = cvs.getContext('2d');
  cvs.width = cvs.offsetWidth * 2;
  cvs.height = 560;
  const W = cvs.width;
  const H = cvs.height;
  const fn = document.getElementById('fn').value;
  const last = steps[steps.length - 1];
  const root = last.x1;

  ctx.clearRect(0, 0, W, H);

  const { xMin, xMax, yMin, yMax } = getNewtonBounds(steps, fn);
  const tx = x => 40 + ((x - xMin) / (xMax - xMin)) * (W - 80);
  const ty = y => 20 + ((yMax - y) / (yMax - yMin)) * (H - 40);

  // Grilla y ejes
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let gx = Math.ceil(xMin); gx <= xMax; gx++) {
    ctx.beginPath();
    ctx.moveTo(tx(gx), 20);
    ctx.lineTo(tx(gx), H - 20);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  if (0 >= yMin && 0 <= yMax) {
    ctx.beginPath();
    ctx.moveTo(40, ty(0));
    ctx.lineTo(W - 40, ty(0));
    ctx.stroke();
  }
  if (0 >= xMin && 0 <= xMax) {
    ctx.beginPath();
    ctx.moveTo(tx(0), 20);
    ctx.lineTo(tx(0), H - 20);
    ctx.stroke();
  }

  // Curva de la función
  ctx.strokeStyle = '#0077ff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let px = 0; px <= W - 80; px++) {
    const x = xMin + (px / (W - 80)) * (xMax - xMin);
    const y = evalF(fn, x);
    if (isNaN(y)) continue;
    px === 0 ? ctx.moveTo(40 + px, ty(y)) : ctx.lineTo(40 + px, ty(y));
  }
  ctx.stroke();

  // Tangentes anteriores en lila tenue (opacity ~0.15)
  const n = steps.length;
  steps.forEach((st, j) => {
    if (j === n - 1) return;
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = '#7F77DD';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(tx(st.x), ty(st.fx));
    ctx.lineTo(tx(st.x1), ty(0));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#534AB7';
    ctx.beginPath();
    ctx.arc(tx(st.x), ty(st.fx), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Tangente final en azul brillante
  ctx.strokeStyle = '#3395ff';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(tx(last.x), ty(last.fx));
  ctx.lineTo(tx(last.x1), ty(0));
  ctx.stroke();
  ctx.fillStyle = '#0077ff';
  ctx.beginPath();
  ctx.arc(tx(last.x), ty(last.fx), 5, 0, Math.PI * 2);
  ctx.fill();

  // Raíz final en rojo
  ctx.fillStyle = '#ff4d6d';
  ctx.beginPath();
  ctx.arc(tx(root), ty(0), 10, 0, Math.PI * 2);
  ctx.fill();

  const label = `Raíz ≈ ${root.toFixed(6)}`;
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(tx(root) + 12, ty(0) - 28, 160, 20);
  ctx.fillStyle = '#ff4d6d';
  ctx.font = 'bold 12px Space Mono, monospace';
  ctx.fillText(label, tx(root) + 16, ty(0) - 14);
}

function readParams() {
  return {
    fn: document.getElementById('fn').value,
    x0: parseFloat(document.getElementById('x0').value),
    tol: parseFloat(document.getElementById('tol').value),
    maxIt: parseInt(document.getElementById('maxit').value, 10),
    spd: parseInt(document.getElementById('spd').value, 10)
  };
}

function updateStats(last) {
  document.getElementById('s-iter').textContent = last.i;
  document.getElementById('s-root').textContent = last.x1.toFixed(6);
  document.getElementById('s-err').textContent = last.err.toFixed(6);
}

function buildTable(steps) {
  const body = document.getElementById('itbody');
  body.innerHTML = '';

  steps.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'irow' + (i === steps.length - 1 ? ' done' : '');
    row.id = 'row-' + i;
    row.innerHTML = `
      <span>${s.i}</span>
      <span>${s.x.toFixed(5)}</span>
      <span>${s.fx.toFixed(5)}</span>
      <span>${s.x1.toFixed(6)}</span>
      <span>${s.err.toFixed(6)}</span>
    `;
    body.appendChild(row);
  });
}

function highlightRow(idx, steps) {
  document.querySelectorAll('.irow:not(.hd)').forEach(r => r.classList.remove('active'));
  const row = document.getElementById('row-' + idx);
  if (row) {
    row.classList.add('active');
    row.scrollIntoView({ block: 'nearest' });
  }
  const s = steps[idx];
  document.getElementById('step-lbl').textContent =
    `Iteración ${s.i}: xₙ=${s.x.toFixed(5)}, f(xₙ)=${s.fx.toFixed(5)}, xₙ₊₁=${s.x1.toFixed(6)}, Error=${s.err.toFixed(6)}`;
}

function stopAnimation() {
  if (timer) clearInterval(timer);
  timer = null;
  stepMode.active = false;
  document.getElementById('step-controls').hidden = true;
}

function updateNextButton() {
  const btn = document.getElementById('btn-next');
  btn.disabled = stepMode.idx >= stepMode.steps.length - 1;
}

function executeCalculation() {
  stopAnimation();
  const { fn, x0, tol, maxIt } = readParams();
  const steps = compute(fn, x0, tol, maxIt);

  if (steps.length === 0) return null;

  const last = steps[steps.length - 1];
  updateStats(last);
  buildTable(steps);
  addHistoryEntry({
    fn,
    params: { x0, tol, maxIt },
    root: last.x1,
    iterations: last.i,
    error: last.err
  });

  return { steps, last };
}

// Función principal que se ejecuta al presionar el botón Animar
function run() {
  const result = executeCalculation();
  if (!result) return;

  const { steps } = result;
  const { spd } = readParams();
  let idx = 0;
  const delay = Math.round(1200 / spd);

  drawFrame(steps, 0);
  highlightRow(0, steps);

  timer = setInterval(() => {
    idx++;
    if (idx >= steps.length) {
      drawStaticFrame(steps);
      highlightRow(steps.length - 1, steps);
      clearInterval(timer);
      timer = null;
      return;
    }
    drawFrame(steps, idx);
    highlightRow(idx, steps);
  }, delay);
}

function runStepMode() {
  const result = executeCalculation();
  if (!result) return;

  stepMode.active = true;
  stepMode.idx = 0;
  stepMode.steps = result.steps;

  document.getElementById('step-controls').hidden = false;
  updateNextButton();
  drawFrame(stepMode.steps, 0);
  highlightRow(0, stepMode.steps);
}

function nextStep() {
  if (!stepMode.active || stepMode.idx >= stepMode.steps.length - 1) return;

  stepMode.idx++;
  const atEnd = stepMode.idx >= stepMode.steps.length - 1;

  if (atEnd) {
    drawStaticFrame(stepMode.steps);
  } else {
    drawFrame(stepMode.steps, stepMode.idx);
  }
  highlightRow(stepMode.idx, stepMode.steps);
  updateNextButton();
}

function resetStepMode() {
  if (!stepMode.active || stepMode.steps.length === 0) return;

  stepMode.idx = 0;
  drawFrame(stepMode.steps, 0);
  highlightRow(0, stepMode.steps);
  updateNextButton();
}

// ——— Historial ———

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    history = raw ? JSON.parse(raw) : [];
  } catch {
    history = [];
  }
  renderHistory();
}

function saveHistory() {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addHistoryEntry({ fn, params, root, iterations, error }) {
  history.unshift({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    fn,
    params,
    root,
    iterations,
    error
  });
  if (history.length > 10) history.pop();
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (history.length === 0) {
    list.innerHTML = '<p class="history-empty">Sin ejecuciones previas.</p>';
    return;
  }

  list.innerHTML = history.map(entry => `
    <div class="history-card" data-id="${entry.id}">
      <div class="history-card-body">
        <span class="history-fn">${escapeHtml(entry.fn)}</span>
        <span class="history-meta">Raíz: ${entry.root.toFixed(6)} · ${entry.iterations} iter · err ${entry.error.toFixed(6)}</span>
      </div>
      <div class="history-card-actions">
        <button type="button" class="history-btn" onclick="reuseHistory(${entry.id})" title="Reusar">&#8634;</button>
        <button type="button" class="history-btn history-btn-del" onclick="deleteHistory(${entry.id})" title="Eliminar">&#10005;</button>
      </div>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function reuseHistory(id) {
  const entry = history.find(h => h.id === id);
  if (!entry) return;

  document.getElementById('fn').value = entry.fn;
  document.getElementById('x0').value = entry.params.x0;
  document.getElementById('tol').value = entry.params.tol;
  document.getElementById('maxit').value = entry.params.maxIt;
}

function deleteHistory(id) {
  history = history.filter(h => h.id !== id);
  saveHistory();
  renderHistory();
}

document.addEventListener('DOMContentLoaded', loadHistory);
