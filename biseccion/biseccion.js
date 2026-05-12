const script = document.createElement('script');
script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.3/math.min.js';
document.head.appendChild(script);

let timer = null;

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

// Función principal que se ejecuta al presionar el botón
function run() {

  // Detiene cualquier animación previa
  if (timer) clearInterval(timer);

  // Lee los valores del formulario
  const fn  = document.getElementById('fn').value;
  const a   = parseFloat(document.getElementById('a').value);
  const b   = parseFloat(document.getElementById('b').value);
  const tol = parseFloat(document.getElementById('tol').value);
  const spd = parseInt(document.getElementById('spd').value);

  // Valida que f(a) y f(b) tengan signos opuestos
  if (evalF(fn, a) * evalF(fn, b) >= 0) {
    document.getElementById('step-lbl').textContent =
      'Error: f(a) y f(b) deben tener signos opuestos.';
    return;
  }

  // Ejecuta el algoritmo y obtiene todas las iteraciones
  const steps = compute(fn, a, b, tol);
  const last  = steps[steps.length - 1];

  // Muestra los resultados finales en las cajitas de estadísticas
  document.getElementById('s-iter').textContent = last.i;
  document.getElementById('s-root').textContent = last.xm.toFixed(6);
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
      <span>${s.a.toFixed(5)}</span>
      <span>${s.b.toFixed(5)}</span>
      <span>${s.xm.toFixed(6)}</span>
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
      `Iteración ${s.i}: a=${s.a.toFixed(5)}, b=${s.b.toFixed(5)}, xm=${s.xm.toFixed(6)}, Error=${s.err.toFixed(6)}`;

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
}x