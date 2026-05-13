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