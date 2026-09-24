const dropzone = document.getElementById('dropzone'),
  chooseBtn = document.getElementById('chooseBtn'),
  fileInput = document.getElementById('fileInput'),
  previewArea = document.getElementById('previewArea'),
  fileName = document.getElementById('fileName'),
  fileSize = document.getElementById('fileSize'),
  changeBtn = document.getElementById('changeBtn'),
  removeBtn = document.getElementById('removeBtn'),
  canvas = document.getElementById('canvas'),
  ctx = canvas.getContext('2d'),
  resetBtn = document.getElementById('resetBtn'),
  downloadBtn = document.getElementById('downloadBtn'),
  wmText = document.getElementById('wmText'),
  fontSize = document.getElementById('fontSize'),
  rotation = document.getElementById('rotation'),
  opacity = document.getElementById('opacity'),
  wmColor = document.getElementById('wmColor'),
  pattern = document.getElementById('pattern'),
  posField = document.getElementById('posField'),
  posGrid = document.getElementById('posGrid'),
  sizeVal = document.getElementById('sizeVal'),
  rotVal = document.getElementById('rotVal'),
  opVal = document.getElementById('opVal'),
  toastHost = document.getElementById('toastHost'),
  themeToggle = document.getElementById('themeToggle');

let img = null,
  posKey = 'cc';

/* ---------- Theme (dark default, saved in localStorage) ---------- */
const THEME_KEY = 'watermark-ktp-theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
  themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Ganti ke Light Mode' : 'Ganti ke Dark Mode');
}

function initTheme() {
  let saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (e) {}
  applyTheme(saved === 'dark' ? 'dark' : 'light');
}
initTheme();

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (e) {}
});

/* ---------- Auto date for default watermark text ---------- */
function formatDate(d) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sept', 'Okt', 'Nov', 'Des'];
  const day = String(d.getDate()).padStart(2, '0');
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

if (!wmText.value.trim()) {
  wmText.value = `${formatDate(new Date())} - Untuk kebutuhan: \n`;
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  toastHost.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    fileInput.click();
  }
});
chooseBtn.addEventListener('click', e => {
  e.stopPropagation();
  fileInput.click();
});
changeBtn.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropzone.classList.add('drag');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
});

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function loadFile(file) {
  if (!file.type.startsWith('image/')) {
    toast('File harus berupa gambar JPG atau PNG.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    const image = new Image();
    image.onload = () => {
      img = image;
      const maxW = 1400;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      fileName.textContent = file.name;
      fileSize.textContent = formatBytes(file.size);
      dropzone.style.display = 'none';
      previewArea.classList.add('active');
      resetBtn.disabled = false;
      downloadBtn.disabled = false;
      render();
      toast('Foto berhasil dimuat.');
    };
    image.onerror = () => toast('Gagal memuat gambar. Coba file lain.', 'error');
    image.src = ev.target.result;
  };
  reader.onerror = () => toast('Gagal membaca file.', 'error');
  reader.readAsDataURL(file);
}

function render() {
  if (!img) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const raw = wmText.value || '';
  if (!raw.trim()) return;
  const lines = raw.split(/\r?\n/);
  const size = parseInt(fontSize.value);
  const rot = parseInt(rotation.value) * Math.PI / 180;
  const op = parseInt(opacity.value) / 100;
  const lineHeight = size * 1.3;

  ctx.save();
  ctx.globalAlpha = op;
  ctx.fillStyle = wmColor.value;
  ctx.font = `bold ${size}px -apple-system, Arial, sans-serif`;
  ctx.textBaseline = 'middle';

  const maxLineWidth = Math.max(1, ...lines.map(l => ctx.measureText(l).width));

  if (pattern.value === 'tile') {
    drawWatermarkTile(lines, lineHeight, maxLineWidth, size, rot);
  } else {
    ctx.translate(posX(), posY());
    ctx.rotate(rot);
    const align = posKey[1] === 'l' ? 'left' : posKey[1] === 'r' ? 'right' : 'center';
    drawMultilineText(lines, 0, 0, lineHeight, align);
  }
  ctx.restore();
}

// Draws each line of `lines` centered vertically around (cx, cy), one fillText call per line.
function drawMultilineText(lines, cx, cy, lineHeight, align) {
  ctx.textAlign = align;
  const totalHeight = lines.length * lineHeight;
  const startY = cy - totalHeight / 2 + lineHeight / 2;
  lines.forEach((line, i) => {
    if (line.length) ctx.fillText(line, cx, startY + i * lineHeight);
  });
}

// Repeats the multiline block across the canvas, keeping each tile's line structure intact.
function drawWatermarkTile(lines, lineHeight, maxLineWidth, size, rot) {
  const tw = maxLineWidth + size * 3;
  const th = (lines.length * lineHeight) + size * 1.6;
  const diag = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rot);
  for (let y = -diag; y < diag; y += th) {
    for (let x = -diag; x < diag; x += tw) {
      drawMultilineText(lines, x, y, lineHeight, 'center');
    }
  }
}

function posX() {
  const m = canvas.width * 0.06;
  if (posKey[1] === 'l') return m;
  if (posKey[1] === 'r') return canvas.width - m;
  return canvas.width / 2;
}

function posY() {
  const m = canvas.height * 0.08;
  if (posKey[0] === 't') return m;
  if (posKey[0] === 'b') return canvas.height - m;
  return canvas.height / 2;
}

function togglePosField() {
  posField.style.display = pattern.value === 'tile' ? 'none' : 'block';
}
togglePosField();

[wmText, fontSize, rotation, opacity, wmColor].forEach(el => el.addEventListener('input', () => {
  sizeVal.textContent = fontSize.value + 'px';
  rotVal.textContent = rotation.value + '°';
  opVal.textContent = opacity.value + '%';
  render();
}));
pattern.addEventListener('change', () => {
  togglePosField();
  render();
});

posGrid.addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  posKey = btn.dataset.p;
  [...posGrid.children].forEach(b => b.setAttribute('aria-pressed', 'false'));
  btn.setAttribute('aria-pressed', 'true');
  render();
});

function resetAll() {
  img = null;
  previewArea.classList.remove('active');
  dropzone.style.display = 'flex';
  resetBtn.disabled = true;
  downloadBtn.disabled = true;
  fileInput.value = '';
}
resetBtn.addEventListener('click', resetAll);
removeBtn.addEventListener('click', resetAll);

downloadBtn.addEventListener('click', () => {
  try {
    const link = document.createElement('a');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const ts = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}` + `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    link.download = `watermarked-image-${ts}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    toast('Gambar berhasil diunduh.');
  } catch (err) {
    toast('Gagal mengunduh gambar. Coba lagi.', 'error');
  }
});