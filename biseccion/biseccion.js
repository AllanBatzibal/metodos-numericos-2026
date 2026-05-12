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