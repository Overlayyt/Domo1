const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');

let currentMode = 'earring';
let earringSrc = 'earrings/earring1.png';
let necklaceSrc = 'necklaces/necklace1.png';
let ringSrc = 'rings/ring1.png';
let braceletSrc = 'bracelets/bracelet1.png';

let earringImg = null;
let necklaceImg = null;
let ringImg = null;
let braceletImg = null;

// Load image dynamically
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // Fallback if image fails
  });
}

// Initialize images
async function initializeImages() {
  earringImg = await loadImage(earringSrc);
  necklaceImg = await loadImage(necklaceSrc);
  ringImg = await loadImage(ringSrc);
  braceletImg = await loadImage(braceletSrc);
}
initializeImages();

// Change functions
function changeEarring(filename) {
  earringSrc = `earrings/${filename}`;
  loadImage(earringSrc).then((img) => { if (img) earringImg = img; });
}
function changeNecklace(filename) {
  necklaceSrc = `necklaces/${filename}`;
  loadImage(necklaceSrc).then((img) => { if (img) necklaceImg = img; });
}
function changeRing(filename) {
  ringSrc = `rings/${filename}`;
  loadImage(ringSrc).then((img) => { if (img) ringImg = img; });
}
function changeBracelet(filename) {
  braceletSrc = `bracelets/${filename}`;
  loadImage(braceletSrc).then((img) => { if (img) braceletImg = img; });
}

// Select mode
function selectMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.options-group').forEach(group => group.style.display = 'none');
  document.getElementById(`${mode}-options`).style.display = 'flex';
}

// Dynamically insert jewelry buttons
function insertJewelryOptions(jewelryType, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const filename = `${jewelryType}${i}.png`;
    const button = document.createElement('button');
    const img = document.createElement('img');
    img.src = `${jewelryType}s/${filename}`;
    img.alt = `${jewelryType.charAt(0).toUpperCase()}${jewelryType.slice(1)} ${i}`;
    img.style.width = '60px';
    img.style.height = '60px';
    img.style.borderRadius = '12px';
    img.style.transition = 'border 0.2s ease, transform 0.2s ease';

    button.appendChild(img);
    button.onclick = () => {
      if (jewelryType === 'earring') changeEarring(filename);
      else if (jewelryType === 'necklace') changeNecklace(filename);
      else if (jewelryType === 'ring') changeRing(filename);
      else if (jewelryType === 'bracelet') changeBracelet(filename);
    };

    container.appendChild(button);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  insertJewelryOptions('earring', 'earring-options');
  insertJewelryOptions('necklace', 'necklace-options');
  insertJewelryOptions('ring', 'ring-options');
  insertJewelryOptions('bracelet', 'bracelet-options');
});

// Smoothing logic
let leftEarPositions = [];
let rightEarPositions = [];
let chinPositions = [];
let noseTipPositions = [];

function smooth(positions) {
  if (positions.length === 0) return null;
  const sum = positions.reduce((acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y }), { x: 0, y: 0 });
  return { x: sum.x / positions.length, y: sum.y / positions.length };
}

// Initialize face mesh
const faceMesh = new FaceMesh({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` 
});

faceMesh.setOptions({
  maxNumFaces: 1,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

faceMesh.onResults((results) => {
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  if (results.multiFaceLandmarks.length > 0) {
    const landmarks = results.multiFaceLandmarks[0];

    const left = {
      x: landmarks[132].x * canvasElement.width,
      y: landmarks[132].y * canvasElement.height - 20,
    };
    const right = {
      x: landmarks[361].x * canvasElement.width,
      y: landmarks[361].y * canvasElement.height - 20,
    };
    const chin = {
      x: landmarks[152].x * canvasElement.width,
      y: landmarks[152].y * canvasElement.height + 10,
    };
    const noseTip = {
      x: landmarks[1].x * canvasElement.width,
      y: landmarks[1].y * canvasElement.height + 10,
    };

    leftEarPositions.push(left); if (leftEarPositions.length > 5) leftEarPositions.shift();
    rightEarPositions.push(right); if (rightEarPositions.length > 5) rightEarPositions.shift();
    chinPositions.push(chin); if (chinPositions.length > 5) chinPositions.shift();
    noseTipPositions.push(noseTip); if (noseTipPositions.length > 5) noseTipPositions.shift();

    const leftSmooth = smooth(leftEarPositions);
    const rightSmooth = smooth(rightEarPositions);
    const chinSmooth = smooth(chinPositions);
    const noseSmooth = smooth(noseTipPositions);

    // Draw based on selected mode
    if (currentMode === 'earring' && earringImg) {
      if (leftSmooth) canvasCtx.drawImage(earringImg, leftSmooth.x - 60, leftSmooth.y, 100, 100);
      if (rightSmooth) canvasCtx.drawImage(earringImg, rightSmooth.x - 20, rightSmooth.y, 100, 100);
    }

    if (currentMode === 'necklace' && necklaceImg && chinSmooth) {
      canvasCtx.drawImage(necklaceImg, chinSmooth.x - 100, chinSmooth.y, 200, 100);
    }

    if (currentMode === 'ring' && ringImg && noseSmooth) {
      canvasCtx.drawImage(ringImg, noseSmooth.x - 40, noseSmooth.y - 20, 80, 80);
    }

    if (currentMode === 'bracelet' && braceletImg) {
      // Placeholder: simulate wrist position
      canvasCtx.drawImage(braceletImg, 50, canvasElement.height - 150, 120, 120); // Left wrist
      canvasCtx.drawImage(braceletImg, canvasElement.width - 170, canvasElement.height - 150, 120, 120); // Right wrist
    }
  }
});

// Start camera
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await faceMesh.send({ image: videoElement });
  },
  width: 1280,
  height: 720,
});
camera.start();

// Set canvas size after video loads metadata
videoElement.addEventListener('loadedmetadata', () => {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
});