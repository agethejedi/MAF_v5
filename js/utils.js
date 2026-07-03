// js/utils.js

export const VERSION = "MAFv5.0";

// ── DOM HELPERS ───────────────────────────────────────────────
export const el  = s => document.querySelector(s);
export const els = s => Array.from(document.querySelectorAll(s));

export function toast(msg, type = 'info') {
  const t = el('#toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast toast-${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── SOUND ─────────────────────────────────────────────────────
export const SFX = {
  ok:      new Audio('assets/sfx/correct.wav'),
  bad:     new Audio('assets/sfx/wrong.wav'),
  fanfare: new Audio('assets/sfx/correct.wav'), // swap for fanfare.wav when available
};
Object.values(SFX).forEach(a => { a.preload = 'auto'; });

export function playCorrect() {
  SFX.ok.currentTime = 0;
  SFX.ok.play().catch(() => {});
}
export function playWrong() {
  SFX.bad.currentTime = 0;
  SFX.bad.play().catch(() => {});
}
export function playFanfare() {
  SFX.fanfare.currentTime = 0;
  SFX.fanfare.play().catch(() => {});
}

// ── TIME HELPERS ──────────────────────────────────────────────
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function normalizeTimeString(s) {
  if (!s) return '';
  s = s.replace(/\s+/g, '');
  const m = s.match(/^(\d{1,2})[:hH]?(\d{2})$/);
  if (!m) return s;
  const h  = String(parseInt(m[1], 10));
  const mn = String(parseInt(m[2], 10)).padStart(2, '0');
  return `${h}:${mn}`;
}

export function fmtMs(ms) {
  return (ms / 1000).toFixed(2) + 's';
}

export function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── CLOCK SVG ─────────────────────────────────────────────────
export function clockSVG(timeStr, size = 180) {
  const [h, m] = timeStr.split(':').map(n => parseInt(n, 10));
  const cx = size / 2, cy = size / 2, r = size * 0.42;
  const mAngle = (m / 60) * 2 * Math.PI;
  const hAngle = ((h % 12) / 12 + m / 720) * 2 * Math.PI;
  function hand(angle, length, width, color) {
    const x = cx + Math.sin(angle) * length;
    const y = cy - Math.cos(angle) * length;
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`;
  }
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a  = (i / 12) * 2 * Math.PI;
    const x1 = cx + Math.sin(a) * (r - 8);
    const y1 = cy - Math.cos(a) * (r - 8);
    const x2 = cx + Math.sin(a) * r;
    const y2 = cy - Math.cos(a) * r;
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--ora)" stroke-width="2"/>`;
  }
  return `<svg class="clock" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--bg)" stroke="var(--edge)" stroke-width="3"/>
    ${ticks}
    ${hand(hAngle, r * 0.55, 5, 'var(--cream)')}
    ${hand(mAngle, r * 0.80, 3, 'var(--ora-lt)')}
    <circle cx="${cx}" cy="${cy}" r="5" fill="var(--ora)"/>
  </svg>`;
}

// ── PROBLEM GENERATOR (Grades 1–8) ────────────────────────────

const BOUNDS = {
  easy:   { 1:{min:0,max:10},  2:{min:0,max:20},  3:{min:0,max:50},
            4:{min:0,max:100}, 5:{min:0,max:200}, 6:{min:0,max:500},
            7:{min:0,max:999}, 8:{min:0,max:9999} },
  medium: { 1:{min:5,max:20},  2:{min:10,max:50}, 3:{min:10,max:100},
            4:{min:10,max:500},5:{min:10,max:999}, 6:{min:10,max:9999},
            7:{min:10,max:9999},8:{min:10,max:99999} },
  hard:   { 1:{min:10,max:20}, 2:{min:20,max:100},3:{min:20,max:200},
            4:{min:50,max:999},5:{min:50,max:9999},6:{min:50,max:99999},
            7:{min:50,max:99999},8:{min:50,max:999999} },
};

const TIMES_TABLES = { easy: 6, medium: 9, hard: 12 };

function bounds(grade, difficulty) {
  return BOUNDS[difficulty]?.[grade] || { min: 0, max: 20 };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function makeProblem({ grade = 1, types = ['add', 'sub'], difficulty = 'easy' }) {
  const b    = bounds(grade, difficulty);
  const pick = types[Math.floor(Math.random() * types.length)];

  // ── Basic arithmetic ──────────────────────────────────────
  if (pick === 'add') {
    const a = randInt(b.min, b.max), c = randInt(b.min, b.max);
    return { type: pick, question: `${a} + ${c}`, answer: a + c, mode: 'numeric' };
  }
  if (pick === 'sub') {
    const a = randInt(b.min, b.max), c = randInt(b.min, b.max);
    const A = Math.max(a, c), B = Math.min(a, c);
    return { type: pick, question: `${A} − ${B}`, answer: A - B, mode: 'numeric' };
  }
  if (pick === 'mul') {
    const lim = TIMES_TABLES[difficulty] || 6;
    const x = randInt(0, lim), y = randInt(0, lim);
    return { type: pick, question: `${x} × ${y}`, answer: x * y, mode: 'numeric' };
  }
  if (pick === 'div') {
    const lim = TIMES_TABLES[difficulty] || 6;
    const y = randInt(1, lim), x = y * randInt(1, lim);
    return { type: pick, question: `${x} ÷ ${y}`, answer: Math.floor(x / y), mode: 'numeric' };
  }

  // ── Fractions (Grades 4+) ─────────────────────────────────
  if (pick === 'fraction') {
    const den  = randInt(2, difficulty === 'easy' ? 4 : difficulty === 'medium' ? 8 : 12);
    const num1 = randInt(1, den - 1);
    const num2 = randInt(1, den - 1);
    const sum  = num1 + num2;
    if (sum <= den) {
      return { type: pick, question: `${num1}/${den} + ${num2}/${den} = ?/\${den}`, answer: sum, mode: 'numeric',
               hint: `Add the numerators: ${num1} + ${num2}` };
    }
    return { type: pick, question: `${num1}/${den} + ${num2}/${den} (simplify)`, answer: sum, mode: 'numeric',
             hint: `Add numerators, then simplify` };
  }

  // ── Decimals (Grades 4+) ──────────────────────────────────
  if (pick === 'decimal') {
    const places = difficulty === 'easy' ? 1 : 2;
    const factor = Math.pow(10, places);
    const a = randInt(10, 99) / factor;
    const c = randInt(10, 99) / factor;
    const ans = Math.round((a + c) * factor) / factor;
    return { type: pick, question: `${a} + ${c}`, answer: ans, mode: 'decimal',
             hint: `Line up the decimal points` };
  }

  // ── Percentages (Grades 5+) ───────────────────────────────
  if (pick === 'percent') {
    const pcts = [10, 20, 25, 50, 75, 100];
    const pct  = pcts[randInt(0, difficulty === 'easy' ? 2 : pcts.length - 1)];
    const whole = randInt(10, difficulty === 'hard' ? 500 : 100);
    const ans  = Math.round((pct / 100) * whole);
    return { type: pick, question: `What is ${pct}% of ${whole}?`, answer: ans, mode: 'numeric',
             hint: `${pct}% means ${pct}/100` };
  }

  // ── Basic Algebra (Grades 7–8) ────────────────────────────
  if (pick === 'algebra') {
    const x   = randInt(1, difficulty === 'hard' ? 20 : 10);
    const b2  = randInt(1, difficulty === 'hard' ? 30 : 15);
    const lhs = x * randInt(1, 5) + b2;
    const coef = Math.round((lhs - b2));
    // e.g. "If 3x + 4 = 19, what is x?"
    const c3 = Math.round(coef / x);
    return { type: pick, question: `If ${c3}x + ${b2} = ${lhs}, what is x?`, answer: x, mode: 'numeric',
             hint: `Subtract ${b2} from both sides, then divide by ${c3}` };
  }

  // ── Geometry (Grades 6–8) ─────────────────────────────────
  if (pick === 'geometry') {
    const shapes = ['rect_area', 'rect_perim', 'triangle_area'];
    const shape  = shapes[randInt(0, shapes.length - 1)];
    if (shape === 'rect_area') {
      const w = randInt(2, 20), h = randInt(2, 20);
      return { type: pick, question: `Rectangle: width ${w}, height ${h}. Area = ?`, answer: w * h, mode: 'numeric',
               hint: `Area = width × height` };
    }
    if (shape === 'rect_perim') {
      const w = randInt(2, 20), h = randInt(2, 20);
      return { type: pick, question: `Rectangle: width ${w}, height ${h}. Perimeter = ?`, answer: 2 * (w + h), mode: 'numeric',
               hint: `Perimeter = 2 × (width + height)` };
    }
    // triangle area
    const base = randInt(2, 20), h2 = randInt(2, 20) * 2; // ensure even for clean answer
    return { type: pick, question: `Triangle: base ${base}, height ${h2}. Area = ?`, answer: (base * h2) / 2, mode: 'numeric',
             hint: `Area = (base × height) ÷ 2` };
  }

  // ── Clocks ────────────────────────────────────────────────
  if (pick === 'clock_digital') {
    const h = randInt(1, 12), m = randInt(0, 11) * 5;
    const shown = `${h}:${String(m).padStart(2, '0')}`;
    return { type: pick, question: 'What time is shown?', shown, answer: shown, mode: 'time-digital' };
  }
  if (pick === 'clock_analog') {
    const h = randInt(1, 12), m = randInt(0, 11) * 5;
    const shown = `${h}:${String(m).padStart(2, '0')}`;
    return { type: pick, question: 'Read the clock:', shown, answer: shown, mode: 'time-analog' };
  }

  // ── Elapsed Time ──────────────────────────────────────────
  if (pick === 'time_diff') {
    const startH   = randInt(1, 11);
    const startM   = randInt(0, 11) * 5;
    const addMins  = [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90][randInt(0, 12)];
    const endTotal = startH * 60 + startM + addMins;
    const endH     = Math.floor(endTotal / 60); // FIXED: was //60
    const endM     = endTotal % 60;
    const start    = `${startH}:${String(startM).padStart(2, '0')}`;
    const end      = `${endH}:${String(endM).padStart(2, '0')}`;
    return { type: pick, question: `From ${start} to ${end}, how many minutes passed?`, answer: addMins, mode: 'numeric',
             hint: `Count the minutes from ${start} forward` };
  }

  // ── Word Problems ─────────────────────────────────────────
  if (pick === 'word') {
    const gradeTemplates = {
      low: [ // Grades 1–3
        (x, y) => ({ q: `A fox finds ${x} berries and eats ${y}. How many are left?`, a: x - y }),
        (x, y) => ({ q: `There are ${x} students. ${y} more join. How many now?`, a: x + y }),
        (x, y) => ({ q: `A book has ${x} pages. You read ${y}. How many left?`, a: x - y }),
        (x, y) => ({ q: `${y} boxes each hold ${x} crayons. Total crayons?`, a: x * y }),
      ],
      mid: [ // Grades 4–5
        (x, y) => ({ q: `A store sells ${x} items per day. How many in ${y} days?`, a: x * y }),
        (x, y) => ({ q: `${x} students split into ${y} equal groups. Size of each group?`, a: Math.floor(x / y) }),
        (x, y) => ({ q: `A recipe needs ${x} cups of flour. You have ${y} cups. How many batches?`, a: Math.floor(y / x) }),
      ],
      high: [ // Grades 6–8
        (x, y) => ({ q: `A car travels ${x} miles in ${y} hours. What is the speed in mph?`, a: Math.round(x / y) }),
        (x, y) => ({ q: `You save $${x} per week. How much in ${y} weeks?`, a: x * y }),
        (x, y) => ({ q: `A shirt costs $${x}. It is ${y}% off. What is the sale price?`, a: Math.round(x * (1 - y / 100)) }),
      ]
    };
    const pool = grade <= 3 ? gradeTemplates.low : grade <= 5 ? gradeTemplates.mid : gradeTemplates.high;
    const tmpl = pool[randInt(0, pool.length - 1)];
    const x    = randInt(grade * 2, b.max);
    const y    = grade >= 6
      ? randInt(2, Math.min(x - 1, grade <= 6 ? 10 : 25))
      : randInt(1, Math.min(12, x - 1));
    const { q, a } = tmpl(x, y);
    return { type: pick, question: q, answer: a, mode: 'numeric' };
  }


  // ── Place Value (Grades 2+) ───────────────────────────────
  if (pick === 'place_value') {
    const nums = [
      randInt(100, 999), randInt(1000, 9999),
      randInt(10000, 99999), randInt(100000, 999999)
    ];
    const n = grade <= 3 ? nums[randInt(0,1)] : grade <= 5 ? nums[randInt(1,2)] : nums[randInt(2,3)];
    const digits = String(n).split('').reverse(); // ones, tens, hundreds...
    const placeNames = ['ones','tens','hundreds','thousands','ten thousands','hundred thousands'];
    const placeIdx = randInt(0, digits.length - 1);
    const digit = parseInt(digits[placeIdx]);
    const placeValue = digit * Math.pow(10, placeIdx);
    const type = randInt(0, 2);
    if (type === 0) {
      return {
        type: pick,
        question: `What is the value of the digit ${digit} in the number ${n.toLocaleString()}?`,
        answer: placeValue,
        mode: 'numeric'
      };
    } else if (type === 1) {
      return {
        type: pick,
        question: `In the number ${n.toLocaleString()}, what place is the digit ${digit} in?`,
        answer: placeNames[placeIdx],
        mode: 'text'
      };
    } else {
      const choices = [
        placeValue,
        placeValue * 10,
        Math.floor(placeValue / 10) || digit,
        placeValue * 100
      ].filter((v,i,a) => a.indexOf(v) === i).slice(0,4);
      shuffle(choices);
      return {
        type: pick,
        question: `In the number ${n.toLocaleString()}, what is the value of the digit ${digit} in the ${placeNames[placeIdx]} place?`,
        answer: String(placeValue),
        choices,
        mode: 'choice'
      };
    }
  }

  // ── Expanded Form (Grades 2+) ─────────────────────────────
  if (pick === 'expanded_form') {
    const n = grade <= 3 ? randInt(100, 9999) : grade <= 5 ? randInt(1000, 99999) : randInt(10000, 999999);
    const str = String(n);
    const parts = [];
    for (let i = 0; i < str.length; i++) {
      const d = parseInt(str[i]);
      if (d > 0) parts.push(d * Math.pow(10, str.length - 1 - i));
    }
    const expanded = parts.join(' + ');
    const type = randInt(0, 1);
    if (type === 0) {
      return {
        type: pick,
        question: `Write ${n.toLocaleString()} in expanded form.`,
        answer: expanded,
        mode: 'text',
        hint: `Break each digit into its place value. Example: 342 = 300 + 40 + 2`
      };
    } else {
      return {
        type: pick,
        question: `What is the standard form of: ${expanded}?`,
        answer: String(n),
        mode: 'numeric'
      };
    }
  }

  // ── Word Form (Grades 2+) ─────────────────────────────────
  if (pick === 'word_form') {
    const ones = ['','one','two','three','four','five','six','seven','eight','nine',
                  'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen',
                  'seventeen','eighteen','nineteen'];
    const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
    function toWords(n) {
      if (n === 0) return 'zero';
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? '-' + ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' hundred' + (n%100 ? ' ' + toWords(n%100) : '');
      if (n < 10000) return ones[Math.floor(n/1000)] + ' thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
      if (n < 100000) return toWords(Math.floor(n/1000)) + ' thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
      return toWords(Math.floor(n/1000)) + ' thousand' + (n%1000 ? ' ' + toWords(n%1000) : '');
    }
    const n = grade <= 3 ? randInt(100, 999) : grade <= 5 ? randInt(1000, 9999) : randInt(10000, 99999);
    const words = toWords(n);
    const type = randInt(0, 1);
    if (type === 0) {
      return {
        type: pick,
        question: `Write ${n.toLocaleString()} in word form.`,
        answer: words,
        mode: 'text',
        hint: 'Write the number using words, like "three hundred forty-two"'
      };
    } else {
      return {
        type: pick,
        question: `What number is: "${words}"?`,
        answer: String(n),
        mode: 'numeric'
      };
    }
  }

  // ── Rounding (Grades 2+) ──────────────────────────────────
  if (pick === 'rounding') {
    const places = grade <= 3
      ? [10, 100]
      : grade <= 5 ? [10, 100, 1000]
      : [100, 1000, 10000];
    const place = places[randInt(0, places.length - 1)];
    const n = randInt(place * 2, place * 20);
    const rounded = Math.round(n / place) * place;
    const placeLabel = place === 10 ? 'ten' : place === 100 ? 'hundred' : place === 1000 ? 'thousand' : 'ten thousand';
    return {
      type: pick,
      question: `Round ${n.toLocaleString()} to the nearest ${placeLabel}.`,
      answer: rounded,
      mode: 'numeric',
      hint: `Look at the digit to the right of the ${placeLabel}s place`
    };
  }

  // ── Number Line (Grades 2+) ───────────────────────────────
  if (pick === 'number_line') {
    const scaleOpts = grade <= 3
      ? [{min:0, max:100, step:10}, {min:0, max:50, step:5}, {min:100, max:200, step:10}]
      : grade <= 5
      ? [{min:0, max:1000, step:100}, {min:500, max:1500, step:100}, {min:5000, max:6000, step:100}]
      : [{min:0, max:10000, step:1000}, {min:10000, max:20000, step:1000}];
    const scale = scaleOpts[randInt(0, scaleOpts.length-1)];
    const steps = (scale.max - scale.min) / scale.step;
    const pointStep = randInt(1, steps - 1);
    const point = scale.min + pointStep * scale.step;
    const offset = randInt(1, scale.step - 1) * (Math.random() < 0.5 ? 1 : -1);
    const actualPoint = Math.max(scale.min + 1, Math.min(scale.max - 1, point + offset));
    const roundTo = scale.step;
    const rounded = Math.round(actualPoint / roundTo) * roundTo;
    return {
      type: pick,
      question: `A point is plotted at ${actualPoint.toLocaleString()} on a number line from ${scale.min.toLocaleString()} to ${scale.max.toLocaleString()}. What is ${actualPoint.toLocaleString()} rounded to the nearest ${roundTo.toLocaleString()}?`,
      answer: rounded,
      mode: 'numeric',
      hint: `Is ${actualPoint} closer to ${point} or ${point + scale.step}?`
    };
  }

  // ── Compare Numbers (Grades 2+) ───────────────────────────
  if (pick === 'compare') {
    const n = grade <= 3 ? randInt(100, 9999) : grade <= 5 ? randInt(1000, 99999) : randInt(10000, 999999);
    const diff = randInt(1, Math.floor(n * 0.1));
    const m = Math.random() < 0.5 ? n + diff : n - diff;
    const type = randInt(0, 2);
    if (type === 0) {
      const bigger = Math.max(n, m);
      return {
        type: pick,
        question: `Which number is greater: ${n.toLocaleString()} or ${m.toLocaleString()}?`,
        answer: String(bigger),
        mode: 'numeric'
      };
    } else if (type === 1) {
      const smaller = Math.min(n, m);
      return {
        type: pick,
        question: `Which number is less: ${n.toLocaleString()} or ${m.toLocaleString()}?`,
        answer: String(smaller),
        mode: 'numeric'
      };
    } else {
      const symbol = n > m ? '>' : n < m ? '<' : '=';
      const choices = ['>', '<', '='];
      return {
        type: pick,
        question: `Compare: ${n.toLocaleString()} ___ ${m.toLocaleString()}. Which symbol goes in the blank?`,
        answer: symbol,
        choices,
        mode: 'choice'
      };
    }
  }

  // ── Place Value Relationships (Grades 3+) ─────────────────
  if (pick === 'place_relationship') {
    const pairs = [
      { places: ['ones', 'tens'], factor: 10 },
      { places: ['tens', 'hundreds'], factor: 10 },
      { places: ['hundreds', 'thousands'], factor: 10 },
      { places: ['thousands', 'ten thousands'], factor: 10 },
      { places: ['ones', 'hundreds'], factor: 100 },
      { places: ['tens', 'thousands'], factor: 100 },
    ];
    const pair = pairs[randInt(0, pairs.length - 1)];
    const type = randInt(0, 1);
    if (type === 0) {
      return {
        type: pick,
        question: `The ${pair.places[1]} place is how many times greater than the ${pair.places[0]} place?`,
        answer: String(pair.factor),
        mode: 'numeric'
      };
    } else {
      const n = randInt(10000, 99999);
      const str = String(n);
      const placeNames = ['ones','tens','hundreds','thousands','ten thousands'];
      const i1 = randInt(0, 2);
      const i2 = i1 + randInt(1, 2);
      const d1 = parseInt(str[str.length - 1 - i1]);
      const d2 = parseInt(str[str.length - 1 - i2]);
      if (d1 > 0 && d2 > 0) {
        const factor = Math.pow(10, i2 - i1);
        return {
          type: pick,
          question: `In ${n.toLocaleString()}, how many times greater is the value of the digit in the ${placeNames[i2]} place than the digit in the ${placeNames[i1]} place?`,
          answer: String(factor),
          mode: 'numeric',
          hint: `The ${placeNames[i2]} place is ${factor}x the ${placeNames[i1]} place`
        };
      }
      // Fallback
      return {
        type: pick,
        question: `The thousands place is how many times greater than the tens place?`,
        answer: '100',
        mode: 'numeric'
      };
    }
  }

  // Fallback
  const a = randInt(b.min, b.max), c = randInt(b.min, b.max);
  return { type: 'add', question: `${a} + ${c}`, answer: a + c, mode: 'numeric' };
}

// Problem types available per grade
export function typesForGrade(grade) {
  const always = ['add', 'sub', 'clock_analog', 'clock_digital', 'time_diff', 'word'];
  // New problem types
  always.push('rounding', 'compare');
  if (grade >= 2) always.push('mul', 'place_value', 'expanded_form', 'number_line');
  if (grade >= 3) always.push('div', 'word_form', 'place_relationship');
  if (grade >= 4) always.push('fraction', 'decimal');
  if (grade >= 5) always.push('percent');
  if (grade >= 6) always.push('geometry');
  if (grade >= 7) always.push('algebra');
  return always;
}
