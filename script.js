// ===== CONFIGURATION =====

// Vibrant color palette for halos
const COLORS = {
    cyan: { r: 0, g: 255, b: 255 },
    aqua: { r: 64, g: 224, b: 208 },
    magenta: { r: 255, g: 0, b: 255 },
    violet: { r: 148, g: 0, b: 211 },
    deepBlue: { r: 0, g: 100, b: 255 },
    skyBlue: { r: 100, g: 180, b: 255 },
    gold: { r: 255, g: 215, b: 0 },
    orange: { r: 255, g: 140, b: 0 },
    rose: { r: 255, g: 105, b: 180 },
    green: { r: 50, g: 255, b: 150 },
    lime: { r: 150, g: 255, b: 50 },
    pink: { r: 255, g: 150, b: 200 },
    purple: { r: 200, g: 100, b: 255 },
    yellow: { r: 255, g: 255, b: 100 },
    coral: { r: 255, g: 127, b: 80 }
};

// Keyboard mapping: key → { frequency, color }
const KEY_MAP = {
    // Row 4 (Numbers) - Bass
    '1': { freq: 65.41, color: 'deepBlue' },
    '2': { freq: 73.42, color: 'violet' },
    '3': { freq: 82.41, color: 'magenta' },
    '4': { freq: 87.31, color: 'rose' },
    '5': { freq: 98.00, color: 'coral' },
    '6': { freq: 110.00, color: 'orange' },
    '7': { freq: 123.47, color: 'gold' },
    '8': { freq: 130.81, color: 'yellow' },

    // Row 1 (ZXCV) - Low
    'Z': { freq: 130.81, color: 'cyan' },
    'X': { freq: 146.83, color: 'aqua' },
    'C': { freq: 164.81, color: 'lime' },
    'V': { freq: 174.61, color: 'green' },
    'B': { freq: 196.00, color: 'skyBlue' },
    'N': { freq: 220.00, color: 'cyan' },
    'M': { freq: 246.94, color: 'aqua' },

    // Row 2 (ASDF) - Mid
    'A': { freq: 261.63, color: 'violet' },
    'S': { freq: 293.66, color: 'purple' },
    'D': { freq: 329.63, color: 'pink' },
    'F': { freq: 349.23, color: 'rose' },
    'G': { freq: 392.00, color: 'coral' },
    'H': { freq: 440.00, color: 'orange' },
    'J': { freq: 493.88, color: 'gold' },
    'K': { freq: 523.25, color: 'yellow' },
    'L': { freq: 587.33, color: 'lime' },
    ';': { freq: 659.25, color: 'green' },

    // Row 3 (QWER) - High
    'Q': { freq: 698.46, color: 'skyBlue' },
    'W': { freq: 783.99, color: 'cyan' },
    'E': { freq: 880.00, color: 'aqua' },
    'R': { freq: 987.77, color: 'deepBlue' },
    'T': { freq: 1046.50, color: 'violet' },
    'Y': { freq: 1174.66, color: 'purple' },
    'U': { freq: 1318.51, color: 'magenta' },
    'I': { freq: 1396.91, color: 'pink' },
    'O': { freq: 1567.98, color: 'rose' },
    'P': { freq: 1760.00, color: 'coral' }
};

// ===== CANVAS SETUP =====

const canvas = document.getElementById('light-canvas');
const ctx = canvas.getContext('2d');

let width, height, centerX, centerY;

function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    centerX = width / 2;
    centerY = height / 2;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ===== WEB AUDIO API =====

let audioContext;
let masterGain;
const activeOscillators = {};

function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.2;
        masterGain.connect(audioContext.destination);
    }
}

function playNote(key) {
    if (!KEY_MAP[key] || activeOscillators[key]) return;
    initAudio();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(KEY_MAP[key].freq, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.5, audioContext.currentTime + 0.02);

    oscillator.connect(gainNode);
    gainNode.connect(masterGain);
    oscillator.start(audioContext.currentTime);

    activeOscillators[key] = { oscillator, gainNode };
}

function stopNote(key) {
    if (!activeOscillators[key]) return;

    const { oscillator, gainNode } = activeOscillators[key];
    const currentTime = audioContext.currentTime;

    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.3);
    oscillator.stop(currentTime + 0.3);

    delete activeOscillators[key];
}

// ===== HALO SYSTEM =====

class LightHalo {
    constructor(key, colorName) {
        // Position near center with slight randomization
        const spread = Math.min(width, height) * 0.15;
        this.x = centerX + (Math.random() - 0.5) * spread;
        this.y = centerY + (Math.random() - 0.5) * spread;

        this.key = key;
        this.color = COLORS[colorName];
        this.baseRadius = 250 + Math.random() * 150; // 250-400px
        this.radius = this.baseRadius;
        this.targetScale = 1;
        this.scale = 0.8;
        this.intensity = 0;
        this.targetIntensity = 1;
        this.life = 1; // 0 to 1
        this.active = true;
    }

    update(deltaTime) {
        // Smooth scale animation
        this.scale += (this.targetScale - this.scale) * deltaTime * 8;

        // Smooth intensity animation
        this.intensity += (this.targetIntensity - this.intensity) * deltaTime * 6;

        // Fade out when not active
        if (!this.active) {
            this.life = Math.max(0, this.life - deltaTime * 1.5);
            this.targetIntensity = 0;
        }

        // Update radius
        this.radius = this.baseRadius * this.scale;
    }

    activate() {
        this.active = true;
        this.life = 1;
        this.targetScale = 1.2;
        this.targetIntensity = 1;
    }

    deactivate() {
        this.active = false;
        this.targetScale = 0.9;
    }

    draw(ctx) {
        if (this.life <= 0) return;

        const alpha = this.intensity * this.life;
        const r = this.radius;

        // Create radial gradient for halo
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);

        // Bright white core
        gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
        gradient.addColorStop(0.02, `rgba(255, 255, 255, ${alpha * 0.9})`);

        // Transition to color
        gradient.addColorStop(0.08, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.8})`);
        gradient.addColorStop(0.15, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.6})`);

        // Soft color falloff
        gradient.addColorStop(0.35, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.4})`);
        gradient.addColorStop(0.60, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.2})`);
        gradient.addColorStop(0.85, `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${alpha * 0.05})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
    }

    isDead() {
        return this.life <= 0 && !this.active;
    }
}

const halos = new Map(); // key → LightHalo

function getOrCreateHalo(key) {
    if (halos.has(key)) {
        return halos.get(key);
    }

    const halo = new LightHalo(key, KEY_MAP[key].color);
    halos.set(key, halo);
    return halo;
}

// ===== ANIMATION LOOP =====

let lastTime = performance.now();

function animate(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    // Clear canvas with pure black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Enable additive blending
    ctx.globalCompositeOperation = 'lighter';

    // Update and draw all halos
    halos.forEach((halo, key) => {
        halo.update(deltaTime);
        halo.draw(ctx);

        // Remove dead halos
        if (halo.isDead()) {
            halos.delete(key);
        }
    });

    // Reset to normal blending
    ctx.globalCompositeOperation = 'source-over';

    requestAnimationFrame(animate);
}

// ===== KEYBOARD HANDLERS =====

const pressedKeys = new Set();

function handleKeyDown(e) {
    const key = e.key.toUpperCase();
    if (!KEY_MAP[key] || pressedKeys.has(key)) return;

    e.preventDefault();
    pressedKeys.add(key);

    // Hide instructions
    const instructions = document.getElementById('instructions');
    if (instructions && !instructions.classList.contains('hidden')) {
        instructions.classList.add('hidden');
    }

    // Play sound
    playNote(key);

    // Create/activate halo
    const halo = getOrCreateHalo(key);
    halo.activate();
}

function handleKeyUp(e) {
    const key = e.key.toUpperCase();
    if (!KEY_MAP[key]) return;

    e.preventDefault();
    pressedKeys.delete(key);

    // Stop sound
    stopNote(key);

    // Deactivate halo
    if (halos.has(key)) {
        halos.get(key).deactivate();
    }
}

// ===== INITIALIZATION =====

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        Object.keys(activeOscillators).forEach(key => stopNote(key));
        pressedKeys.clear();
        halos.forEach(halo => halo.deactivate());
    }
});

// Start animation
animate(performance.now());

console.log('💡 Light Halo Piano initialized');
console.log('🌈 35 keys • Each creates a huge glowing halo');
console.log('🎨 Additive blending • Overlapping halos merge beautifully');
