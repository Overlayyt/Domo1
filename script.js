const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');

let currentMode = 'earring';
let earringSrc = 'earrings/earring1.png';
let necklaceSrc = 'necklaces/necklace1.png';

let earringImg = null;
let necklaceImg = null;

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // Fallback if image fails to load
  });
}

async function initializeImages() {
  earringImg = await loadImage(earringSrc);
  necklaceImg = await loadImage(necklaceSrc);
}
initializeImages();

function changeEarring(filename) {
  earringSrc = `earrings/${filename}`;
  loadImage(earringSrc).then((img) => {
    if (img) earringImg = img;
  });
}

function changeNecklace(filename) {
  necklaceSrc = `necklaces/${filename}`;
  loadImage(necklaceSrc).then((img) => {
    if (img) necklaceImg = img;
  });
}

function selectMode(mode) {
  currentMode = mode;
  document.getElementById('earring-options').style.display = mode === 'earring' ? 'flex' : 'none';
  document.getElementById('necklace-options').style.display = mode === 'necklace' ? 'flex' : 'none';
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

// Smoothing logic
let leftEarPositions = [];
let rightEarPositions = [];
let chinPositions = [];

function smooth(positions) {
  if (positions.length === 0) return null;
  const sum = positions.reduce((acc, pos) => ({ x: acc.x + pos.x, y: acc.y + pos.y }), { x: 0, y: 0 });
  return { x: sum.x / positions.length, y: sum.y / positions.length };
}

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

    leftEarPositions.push(left);
    rightEarPositions.push(right);
    chinPositions.push(chin);
    if (leftEarPositions.length > 5) leftEarPositions.shift();
    if (rightEarPositions.length > 5) rightEarPositions.shift();
    if (chinPositions.length > 5) chinPositions.shift();

    const leftSmooth = smooth(leftEarPositions);
    const rightSmooth = smooth(rightEarPositions);
    const chinSmooth = smooth(chinPositions);

    if (currentMode === 'earring' && earringImg) {
      if (leftSmooth) canvasCtx.drawImage(earringImg, leftSmooth.x - 60, leftSmooth.y, 100, 100);
      if (rightSmooth) canvasCtx.drawImage(earringImg, rightSmooth.x - 20, rightSmooth.y, 100, 100);
    }

    if (currentMode === 'necklace' && necklaceImg && chinSmooth) {
      canvasCtx.drawImage(necklaceImg, chinSmooth.x - 100, chinSmooth.y, 200, 100);
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