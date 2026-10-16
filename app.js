const imageInput = document.getElementById('imageInput');
const uploadBox = document.getElementById('uploadBox');
const editorWorkspace = document.getElementById('editorWorkspace');
const previewSection = document.getElementById('previewSection');
const changeImageBtn = document.getElementById('changeImageBtn');

const editorCanvas = document.getElementById('editorCanvas');
const ctx = editorCanvas.getContext('2d');
const zoomRange = document.getElementById('zoomRange');

const widthMmInput = document.getElementById('widthMm');
const heightMmInput = document.getElementById('heightMm');
const dpiInput = document.getElementById('dpiInput');

const singleCanvas = document.getElementById('singleCanvas');
const sheetCanvas = document.getElementById('sheetCanvas');
const singleMetaText = document.getElementById('singleMetaText');

let img = new Image();
let scale = 1;
let minScale = 0.1;
let posX = 0;
let posY = 0;
let isDragging = false;
let startX, startY;

editorCanvas.width = 315;
editorCanvas.height = 405;

changeImageBtn.addEventListener('click', () => {
  location.reload();
});

// Drag and drop
['dragenter', 'dragover'].forEach(eventName => {
  uploadBox.addEventListener(eventName, (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = '#f59e0b';
    uploadBox.style.background = '#fef3c7';
  }, false);
});

['dragleave', 'drop'].forEach(eventName => {
  uploadBox.addEventListener(eventName, (e) => {
    e.preventDefault();
    uploadBox.style.borderColor = '#fcd34d';
    uploadBox.style.background = '#fffbf0';
  }, false);
});

uploadBox.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const files = dt.files;
  if (files.length > 0) handleFile(files[0]);
});

imageInput.addEventListener('change', (e) => {
  if (e.target.files.length > 0) handleFile(e.target.files[0]);
});

function handleFile(file) {
  if (!file.type.startsWith('image/')) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    img.onload = () => {
      const scaleW = editorCanvas.width / img.width;
      const scaleH = editorCanvas.height / img.height;
      minScale = Math.min(scaleW, scaleH);
      
      zoomRange.min = minScale;
      zoomRange.max = Math.max(5.0, minScale * 4);
      zoomRange.step = 0.01;

      scale = minScale;
      zoomRange.value = scale;

      posX = (editorCanvas.width - img.width * scale) / 2;
      posY = (editorCanvas.height - img.height * scale) / 2;

      uploadBox.style.display = 'none';
      editorWorkspace.style.display = 'flex';
      previewSection.style.display = 'block';

      draw();
      updateOutputs();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function draw() {
  ctx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
  ctx.drawImage(img, posX, posY, img.width * scale, img.height * scale);
}

// Drag & Drop / Touch handlers
function startDrag(clientX, clientY) {
  isDragging = true;
  startX = clientX - posX;
  startY = clientY - posY;
}

function moveDrag(clientX, clientY) {
  if (!isDragging) return;
  posX = clientX - startX;
  posY = clientY - startY;
  draw();
}

function stopDrag() {
  if (isDragging) {
    isDragging = false;
    updateOutputs();
  }
}

editorCanvas.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
window.addEventListener('mouseup', stopDrag);

editorCanvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 1) startDrag(e.touches.length === 1 ? e.touches[0].clientX : 0, e.touches[0].clientY);
});
window.addEventListener('touchmove', (e) => {
  if (e.touches.length === 1) moveDrag(e.touches[0].clientX, e.touches[0].clientY);
});
window.addEventListener('touchend', stopDrag);

zoomRange.addEventListener('input', (e) => {
  const newScale = parseFloat(e.target.value);
  posX -= (img.width * newScale - img.width * scale) / 2;
  posY -= (img.height * newScale - img.height * scale) / 2;
  scale = newScale;
  draw();
  updateOutputs();
});

// Listener per aggiornamento in tempo reale se cambiano dimensioni o DPI
[widthMmInput, heightMmInput, dpiInput].forEach(input => {
  input.addEventListener('input', () => {
    if (img.src) updateOutputs();
  });
});

function getTargetDimensions() {
  const wMm = parseFloat(widthMmInput.value) || 35;
  const hMm = parseFloat(heightMmInput.value) || 45;
  const dpi = parseFloat(dpiInput.value) || 500;

  // Conversione da mm a pixel in base ai DPI (1 pollice = 25.4 mm)
  const targetW = Math.round((wMm / 25.4) * dpi);
  const targetH = Math.round((hMm / 25.4) * dpi);

  return { targetW, targetH, wMm, hMm, dpi };
}

function updateOutputs() {
  const { targetW, targetH, wMm, hMm, dpi } = getTargetDimensions();

  singleCanvas.width = targetW;
  singleCanvas.height = targetH;
  const sCtx = singleCanvas.getContext('2d');
  const ratio = targetW / editorCanvas.width;

  sCtx.drawImage(
    img, 
    posX * ratio, 
    posY * ratio, 
    (img.width * scale) * ratio, 
    (img.height * scale) * ratio
  );

  document.getElementById('singlePreview').src = singleCanvas.toDataURL('image/jpeg', 0.88);
  singleMetaText.textContent = `Formato ${wMm}x{hMm}mm (${targetW}×{targetH} px) @ ${dpi} DPI`;
  singleMetaText.textContent = `Formato ${wMm}x${hMm}mm (${targetW}×${targetH} px) @ ${dpi} DPI`;

  generateSheetPhoto(targetW, targetH, dpi);
}

function generateSheetPhoto(targetW, targetH, dpi) {
  // Foglio 10x15 cm calcolato in base ai DPI scelti
  const SHEET_W = Math.round((100 / 25.4) * dpi); // 10 cm
  const SHEET_H = Math.round((150 / 25.4) * dpi); // 15 cm

  sheetCanvas.width = SHEET_W;
  sheetCanvas.height = SHEET_H;
  const sheetCtx = sheetCanvas.getContext('2d');

  sheetCtx.fillStyle = '#FFFFFF';
  sheetCtx.fillRect(0, 0, SHEET_W, SHEET_H);

  const gapX = (SHEET_W - (targetW * 2)) / 3;
  const gapY = (SHEET_H - (targetH * 2)) / 3;

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const x = gapX + col * (targetW + gapX);
      const y = gapY + row * (targetH + gapY);

      sheetCtx.drawImage(singleCanvas, x, y);
      sheetCtx.strokeStyle = '#cbd5e1';
      sheetCtx.lineWidth = Math.max(2, Math.round(dpi / 200));
      sheetCtx.strokeRect(x, y, targetW, targetH);
    }
  }

  document.getElementById('sheetPreview').src = sheetCanvas.toDataURL('image/jpeg', 0.9);
}

// Iniezione dinamica dei DPI nel binario JPEG
function setCustomDPI(dataUrl, dpiVal) {
  const byteString = atob(dataUrl.split(',')[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  const dpiHigh = (dpiVal >> 8) & 0xFF;
  const dpiLow = dpiVal & 0xFF;

  const jfifHeader = new Uint8Array([
    0xFF, 0xE0, 0x00, 0x10, 
    0x4A, 0x46, 0x49, 0x46, 0x00,
    0x01, 0x01,                   
    0x01,                         
    dpiHigh, dpiLow,              // Xdensity
    dpiHigh, dpiLow,              // Ydensity
    0x00, 0x00                    
  ]);

  if (ia[0] === 0xFF && ia[1] === 0xD8) {
    let offset = 2;
    if (ia[2] === 0xFF && ia[3] === 0xE0) {
      const length = (ia[4] << 8) + ia[5];
      offset = 2 + 2 + length;
    }
    
    const restOfFile = ia.slice(offset);
    const newFile = new Uint8Array(2 + jfifHeader.length + restOfFile.length);
    newFile[0] = 0xFF;
    newFile[1] = 0xD8;
    newFile.set(jfifHeader, 2);
    newFile.set(restOfFile, 2 + jfifHeader.length);
    
    const blob = new Blob([newFile], { type: 'image/jpeg' });
    return URL.createObjectURL(blob);
  }

  return dataUrl;
}

// Download Handlers
document.getElementById('downloadSingleBtn').addEventListener('click', () => {
  const { dpi, wMm, hMm } = getTargetDimensions();
  const rawDataUrl = singleCanvas.toDataURL('image/jpeg', 0.88);
  const blobUrl = setCustomDPI(rawDataUrl, dpi);

  const link = document.createElement('a');
  link.download = `fototessera-${wMm}x${hMm}mm-${dpi}dpi.jpg`;
  link.href = blobUrl;
  link.click();
});

document.getElementById('downloadSheetBtn').addEventListener('click', () => {
  const { dpi } = getTargetDimensions();
  const rawDataUrl = sheetCanvas.toDataURL('image/jpeg', 0.9);
  const blobUrl = setCustomDPI(rawDataUrl, dpi);

  const link = document.createElement('a');
  link.download = `foglio-fototessere-10x15-${dpi}dpi.jpg`;
  link.href = blobUrl;
  link.click();
});