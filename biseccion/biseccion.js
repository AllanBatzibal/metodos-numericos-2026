let timer = null;

// Estado del modo paso a paso
const stepMode = { active: false, idx: 0, steps: [], tol: 0 };

function evalF(expr, x) {
  try {
    return math.evaluate(expr, { x });
  } catch {
    return NaN;
  }
}

function compute(fn, a0, b0, tol) {
  let a = a0;
  let b = b0;
  let steps = [];

  for (let i = 1; i <= 80; i++) {
    const xm = (a + b) / 2;
    const fa = evalF(fn, a);
    const fm = evalF(fn, xm);
    const err = Math.abs((b - a) / 2);

       steps.push({ i, a, b, xm, fm, err });

    if (err < tol || Math.abs(fm) < 1e-14) break;

    if (fa * fm < 0) {
      b = xm;
    } else {
      a = xm;
    }
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

  const s = steps[idx];

  // Calcula los límites del gráfico
  const span = steps[0].b - steps[0].a;
  const xMin = steps[0].a - span * 0.4;
  const xMax = steps[0].b + span * 0.4;

  // Evalúa varios puntos para saber el rango de Y
  let ys = [];
  for (let px = 0; px <= 200; px++) {
    ys.push(evalF(fn, xMin + (px / 200) * (xMax - xMin)));
  }
  const yMin = Math.min(...ys) - 1;
  const yMax = Math.max(...ys) + 1;

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

  // Sombrea el intervalo activo [a, b]
  ctx.fillStyle = 'rgba(0,229,160,0.07)';
  ctx.fillRect(tx(s.a), 20, tx(s.b) - tx(s.a), H - 40);

  // Dibuja líneas punteadas en a y b
  ctx.strokeStyle = 'rgba(0,229,160,0.5)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(tx(s.a), 20);
  ctx.lineTo(tx(s.a), H - 20);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(tx(s.b), 20);
  ctx.lineTo(tx(s.b), H - 20);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dibuja línea punteada en el punto medio xm
  ctx.strokeStyle = '#0077ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(tx(s.xm), 20);
  ctx.lineTo(tx(s.xm), H - 20);
  ctx.stroke();
  ctx.setLineDash([]);

  // Dibuja la curva de la función
  ctx.strokeStyle = '#00e5a0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let px = 0; px <= W - 80; px++) {
    const x = xMin + (px / (W - 80)) * (xMax - xMin);
    const y = evalF(fn, x);
    if (isNaN(y)) continue;
    px === 0 ? ctx.moveTo(40 + px, ty(y)) : ctx.lineTo(40 + px, ty(y));
  }
  ctx.stroke();

  // Dibuja el punto en xm, rojo si es la última iteración
  const done = idx === steps.length - 1;
  ctx.fillStyle = done ? '#ff4d6d' : '#0077ff';
  ctx.beginPath();
  ctx.arc(tx(s.xm), ty(s.fm), 7, 0, Math.PI * 2);
  ctx.fill();

  // Etiqueta con el valor de xm
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(tx(s.xm) + 10, ty(s.fm) - 22, 130, 18);
  ctx.fillStyle = done ? '#ff4d6d' : '#00e5a0';
  ctx.font = '11px Space Mono, monospace';
  ctx.fillText(`xm = ${s.xm.toFixed(6)}`, tx(s.xm) + 14, ty(s.fm) - 8);
}

// Calcula límites del gráfico para bisección
function getBiseccionBounds(steps, fn) {
  const span = steps[0].b - steps[0].a;
  const xMin = steps[0].a - span * 0.4;
  const xMax = steps[0].b + span * 0.4;
  const ys = [];
  for (let px = 0; px <= 200; px++) {
    ys.push(evalF(fn, xMin + (px / 200) * (xMax - xMin)));
  }
  return { xMin, xMax, yMin: Math.min(...ys) - 1, yMax: Math.max(...ys) + 1 };
}

// Dibuja la gráfica estática final con todas las iteraciones superpuestas
function drawStaticFrame(steps) {
  const cvs = document.getElementById('cvs');
  const ctx = cvs.getContext('2d');
  cvs.width = cvs.offsetWidth * 2;
  cvs.height = 560;
  const W = cvs.width;
  const H = cvs.height;
  const fn = document.getElementById('fn').value;
  const last = steps[steps.length - 1];
  const root = last.xm;

  ctx.clearRect(0, 0, W, H);

  const { xMin, xMax, yMin, yMax } = getBiseccionBounds(steps, fn);
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

  // Todas las bandas [a,b] con opacidad decreciente
  const n = steps.length;
  steps.forEach((s, j) => {
    const alpha = 0.05 + 0.1 * ((j + 1) / n);
    ctx.fillStyle = `rgba(0,229,160,${alpha})`;
    ctx.fillRect(tx(s.a), 20, tx(s.b) - tx(s.a), H - 40);
  });

  // Curva de la función
  ctx.strokeStyle = '#00e5a0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let px = 0; px <= W - 80; px++) {
    const x = xMin + (px / (W - 80)) * (xMax - xMin);
    const y = evalF(fn, x);
    if (isNaN(y)) continue;
    px === 0 ? ctx.moveTo(40 + px, ty(y)) : ctx.lineTo(40 + px, ty(y));
  }
  ctx.stroke();

  // Puntos medios de cada iteración en tono tenue
  steps.forEach((s, j) => {
    if (j === n - 1) return;
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#0077ff';
    ctx.beginPath();
    ctx.arc(tx(s.xm), ty(s.fm), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });

  // Raíz final destacada
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

// Lee parámetros del formulario
function readParams() {
  return {
    fn: document.getElementById('fn').value,
    a: parseFloat(document.getElementById('a').value),
    b: parseFloat(document.getElementById('b').value),
    tol: parseFloat(document.getElementById('tol').value),
    spd: parseInt(document.getElementById('spd').value, 10)
  };
}

// Valida signos opuestos en f(a) y f(b)
function validateInterval(fn, a, b) {
  if (evalF(fn, a) * evalF(fn, b) >= 0) {
    document.getElementById('step-lbl').textContent =
      'Error: f(a) y f(b) deben tener signos opuestos.';
    return false;
  }
  return true;
}

// Actualiza estadísticas finales
function updateStats(last) {
  document.getElementById('s-iter').textContent = last.i;
  document.getElementById('s-root').textContent = last.xm.toFixed(6);
  document.getElementById('s-err').textContent = last.err.toFixed(6);
}

// Construye la tabla de iteraciones con columna f(xm)
function buildTable(steps, tol) {
  const body = document.getElementById('itbody');
  body.innerHTML = '';

  steps.forEach((s, i) => {
    const isRoot = Math.abs(s.fm) < tol;
    const row = document.createElement('div');
    row.className = 'irow' + (i === steps.length - 1 ? ' done' : '');
    row.id = 'row-' + i;
    row.innerHTML = `
      <span>${s.i}</span>
      <span>${s.a.toFixed(5)}</span>
      <span>${s.b.toFixed(5)}</span>
      <span>${s.xm.toFixed(6)}</span>
      <span class="${isRoot ? 'cell-root' : ''}">${s.fm.toFixed(6)}</span>
      <span>${s.err.toFixed(6)}</span>
    `;
    body.appendChild(row);
  });
}

// Resalta la fila activa en la tabla
function highlightRow(idx, steps) {
  document.querySelectorAll('.irow:not(.hd)').forEach(r => r.classList.remove('active'));
  const row = document.getElementById('row-' + idx);
  if (row) {
    row.classList.add('active');
    row.scrollIntoView({ block: 'nearest' });
  }
  const s = steps[idx];
  document.getElementById('step-lbl').textContent =
    `Iteración ${s.i}: a=${s.a.toFixed(5)}, b=${s.b.toFixed(5)}, xm=${s.xm.toFixed(6)}, f(xm)=${s.fm.toFixed(6)}, Error=${s.err.toFixed(6)}`;
}

// Detiene animación y resetea modo paso a paso
function stopAnimation() {
  if (timer) clearInterval(timer);
  timer = null;
  stepMode.active = false;
  document.getElementById('step-controls').hidden = true;
}

// Actualiza estado del botón "Siguiente paso"
function updateNextButton() {
  const btn = document.getElementById('btn-next');
  const atEnd = stepMode.idx >= stepMode.steps.length - 1;
  btn.disabled = atEnd;
}

// Ejecuta el cálculo y prepara resultados compartidos
function executeCalculation() {
  stopAnimation();
  const { fn, a, b, tol } = readParams();
  if (!validateInterval(fn, a, b)) return null;

  const steps = compute(fn, a, b, tol);
  if (steps.length === 0) return null;

  const last = steps[steps.length - 1];
  updateStats(last);
  buildTable(steps, tol);

  return { steps, tol, last };
}

// Función principal — animación automática
function run() {
  const result = executeCalculation();
  if (!result) return;

  const { steps, last } = result;
  const { fn, spd } = readParams();

  // Guardar en historial solo al animar
  history.unshift({
    id: Date.now(),
    fn,
    root: last.xm,
    iterations: last.i,
    date: formatHistoryDate(new Date())
  });
  if (history.length > HISTORY_MAX) history.pop();
  saveHistory();
  renderHistory();

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

// Modo paso a paso
function runStepMode() {
  const result = executeCalculation();
  if (!result) return;

  stepMode.active = true;
  stepMode.idx = 0;
  stepMode.steps = result.steps;
  stepMode.tol = result.tol;

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

// ——— Historial (versión simplificada) ———

const HISTORY_KEY = 'biseccion_history';
const HISTORY_MAX = 8;
let history = [];

// Formato DD/MM/YYYY HH:MM
function formatHistoryDate(d) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

function renderHistory() {
  const list = document.getElementById('history-list');
  if (history.length === 0) {
    list.innerHTML = '<p class="history-empty">Sin ejecuciones previas.</p>';
    return;
  }

  list.innerHTML = history.map(entry => `
    <div class="history-row">
      <span class="history-line">
        <span class="history-mono">[ f(x) = ${escapeHtml(entry.fn)} ]</span>
        <span class="history-label"> → </span>
        <span class="history-mono">raíz: ${entry.root.toFixed(6)}</span>
        <span class="history-label"> | </span>
        <span class="history-mono">${entry.iterations} iter</span>
        <span class="history-label"> | </span>
        <span class="history-mono">${entry.date}</span>
      </span>
      <button type="button" class="history-del" onclick="deleteHistory(${entry.id})" aria-label="Eliminar">&#10005;</button>
    </div>
  `).join('');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function deleteHistory(id) {
  history = history.filter(h => h.id !== id);
  saveHistory();
  renderHistory();
}

document.addEventListener('DOMContentLoaded', loadHistory);
