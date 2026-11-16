const scene = document.querySelector('[data-section]');
const profile = document.querySelector('[data-profile]');
const slider = document.querySelector('#scan-position');
const output = document.querySelector('[data-position]');
const width = scene.width;
const height = scene.height;
const sectionContext = scene.getContext('2d');
const profileContext = profile.getContext('2d');
const image = sectionContext.createImageData(width, height);
const intensity = new Float32Array(width * height);

function layer(value, center, spread) {
  return Math.exp(-0.5 * ((value - center) / spread) ** 2);
}

let random = 31;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const position = x / (width - 1);
    const surface = 32 + 10 * Math.sin(position * 5.5) + position * 13;
    const boundary = surface + 39 + 8 * Math.cos(position * 7);
    const lower = boundary + 20 + position * 25;
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const noise = random / 2 ** 32;
    const signal = Math.min(1, 0.02 + (y > surface ? noise * 0.20 : noise * 0.06) +
      0.79 * layer(y, surface, 2.7) + 0.55 * layer(y, boundary, 5.5) +
      0.39 * layer(y, lower, 3.8) + 0.14 * layer(y, lower + 18, 7));
    const pixel = y * width + x;
    intensity[pixel] = signal;
    image.data.set([18 + signal * 173, 21 + signal * 165, 43 + signal * 205, 255], pixel * 4);
  }
}

function render() {
  const column = Number(slider.value);
  slider.setAttribute('aria-valuetext', `第 ${column + 1} 欄，共 ${width} 欄`);
  output.value = `第 ${column + 1} / ${width} 欄`;
  sectionContext.putImageData(image, 0, 0);
  sectionContext.save();
  sectionContext.strokeStyle = '#f9e8a2';
  sectionContext.lineWidth = 2;
  sectionContext.setLineDash([6, 4]);
  sectionContext.beginPath();
  sectionContext.moveTo(column, 0);
  sectionContext.lineTo(column, height);
  sectionContext.stroke();
  sectionContext.restore();

  profileContext.fillStyle = '#15172c';
  profileContext.fillRect(0, 0, profile.width, height);
  profileContext.strokeStyle = '#343954';
  profileContext.lineWidth = 1;
  for (let x = 0; x < profile.width; x += 48) {
    profileContext.beginPath();
    profileContext.moveTo(x + 8, 0);
    profileContext.lineTo(x + 8, height);
    profileContext.stroke();
  }
  profileContext.strokeStyle = '#c4b6ff';
  profileContext.lineWidth = 2;
  profileContext.beginPath();
  for (let y = 0; y < height; y++) {
    const signalX = 8 + intensity[y * width + column] * (profile.width - 16);
    if (y === 0) profileContext.moveTo(signalX, y);
    else profileContext.lineTo(signalX, y);
  }
  profileContext.stroke();
}

slider.addEventListener('input', render);
render();
document.querySelector('.scan-control').hidden = false;
