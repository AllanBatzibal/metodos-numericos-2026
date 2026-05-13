// Librería math.js para evaluar funciones escritas por el usuario
const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.3/math.min.js';
document.head.appendChild(script);

// Variable global para controlar la animación
let timer = null;

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

// Función principal que se ejecuta al presionar el botón
function run() {

  // Detiene cualquier animación previa
  if (timer) clearInterval(timer);

  // Lee los valores del formulario
  const fn    = document.getElementById('fn').value;
  const x0    = parseFloat(document.getElementById('x0').value);
  const tol   = parseFloat(document.getElementById('tol').value);
  const maxIt = parseInt(document.getElementById('maxit').value);
  const spd   = parseInt(document.getElementById('spd').value);

  // Ejecuta el algoritmo y obtiene todas las iteraciones
  const steps = compute(fn, x0, tol, maxIt);

  // Si no hubo iteraciones, sale
  if (steps.length === 0) return;

  const last = steps[steps.length - 1];

  // Muestra los resultados finales en las cajitas de estadísticas
  document.getElementById('s-iter').textContent = last.i;
  document.getElementById('s-root').textContent = last.x1.toFixed(6);
  document.getElementById('s-err').textContent  = last.err.toFixed(6);

  // Construye la tabla de iteraciones
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

  // Inicia la animación frame por frame
  let idx = 0;
  const delay = Math.round(1200 / spd);

  timer = setInterval(() => {

    // Dibuja el frame actual
    drawFrame(steps, idx);

    // Actualiza el texto informativo debajo de la gráfica
    const s = steps[idx];
    document.getElementById('step-lbl').textContent =
      `Iteración ${s.i}: xₙ=${s.x.toFixed(5)}, f(xₙ)=${s.fx.toFixed(5)}, xₙ₊₁=${s.x1.toFixed(6)}, Error=${s.err.toFixed(6)}`;

    // Resalta la fila activa en la tabla
    document.querySelectorAll('.irow:not(.hd)').forEach(r => r.classList.remove('active'));
    const row = document.getElementById('row-' + idx);
    if (row) {
      row.classList.add('active');
      row.scrollIntoView({ block: 'nearest' });
    }

    idx++;

    // Detiene la animación al llegar a la última iteración
    if (idx >= steps.length) clearInterval(timer);

  }, delay);
}