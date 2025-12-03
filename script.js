// ===== CONFIGURATION =====

// Keyboard mapping to frequencies
const KEY_MAP = {
    '1': 65.41,   '2': 73.42,   '3': 82.41,   '4': 87.31,
    '5': 98.00,   '6': 110.00,  '7': 123.47,  '8': 130.81,
    'Z': 130.81,  'X': 146.83,  'C': 164.81,  'V': 174.61,
    'B': 196.00,  'N': 220.00,  'M': 246.94,
    'A': 261.63,  'S': 293.66,  'D': 329.63,  'F': 349.23,
    'G': 392.00,  'H': 440.00,  'J': 493.88,  'K': 523.25,
    'L': 587.33,  ';': 659.25,
    'Q': 698.46,  'W': 783.99,  'E': 880.00,  'R': 987.77,
    'T': 1046.50, 'Y': 1174.66, 'U': 1318.51, 'I': 1396.91,
    'O': 1567.98, 'P': 1760.00
};

// ===== CANVAS SETUP =====

const canvas = document.getElementById('reality-canvas');
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
    oscillator.frequency.setValueAtTime(KEY_MAP[key], audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.5, audioContext.currentTime + 0.03);

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
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.5);
    oscillator.stop(currentTime + 0.5);

    delete activeOscillators[key];
}

// ===== CRACK SYSTEM =====

class CrackBranch {
    constructor(startX, startY, angle, length, width, generation = 0) {
        this.startX = startX;
        this.startY = startY;
        this.angle = angle;
        this.length = length;
        this.width = width;
        this.generation = generation;
        this.growth = 0; // 0 to 1
        this.targetGrowth = 0;
        this.points = [];
        this.glowIntensity = 0;
        this.generateJaggedPath();
    }

    generateJaggedPath() {
        // Create jagged, lightning-like path
        const segments = Math.floor(this.length / 8) + 3;
        this.points = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const baseX = this.startX + Math.cos(this.angle) * this.length * t;
            const baseY = this.startY + Math.sin(this.angle) * this.length * t;

            // Add jagged offsets perpendicular to direction
            const perpAngle = this.angle + Math.PI / 2;
            const maxOffset = this.width * 0.5;
            const offset = (Math.random() - 0.5) * maxOffset * (1 - Math.abs(t - 0.5) * 0.5);

            this.points.push({
                x: baseX + Math.cos(perpAngle) * offset,
                y: baseY + Math.sin(perpAngle) * offset
            });
        }
    }

    update(deltaTime) {
        // Smooth growth animation
        this.growth += (this.targetGrowth - this.growth) * deltaTime * 3;
        this.glowIntensity *= 0.95; // Decay glow
    }

    pulse() {
        this.glowIntensity = Math.min(this.glowIntensity + 0.3, 1);
    }

    draw(ctx, baseGlow = 1) {
        if (this.growth < 0.01) return;

        const currentLength = Math.floor(this.points.length * this.growth);
        if (currentLength < 2) return;

        const glowAmount = baseGlow * (0.5 + this.glowIntensity * 0.5);

        // Draw multiple glow layers for depth
        for (let layer = 0; layer < 3; layer++) {
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);

            for (let i = 1; i < currentLength; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }

            const layerWidth = this.width * (3 - layer) * 0.5;
            const layerAlpha = glowAmount * (layer === 0 ? 0.9 : layer === 1 ? 0.5 : 0.2);

            // Inner light colors
            const colors = [
                `rgba(255, 255, 255, ${layerAlpha})`,
                `rgba(0, 255, 255, ${layerAlpha * 0.6})`,
                `rgba(255, 100, 255, ${layerAlpha * 0.4})`
            ];

            ctx.strokeStyle = colors[layer % 3];
            ctx.lineWidth = layerWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.shadowBlur = layerWidth * 4 * glowAmount;
            ctx.shadowColor = colors[layer % 3];
            ctx.stroke();
        }

        ctx.shadowBlur = 0;
    }
}

class CrackSystem {
    constructor() {
        this.branches = [];
        this.energy = 0; // Total accumulated stress
        this.stage = 0; // 0: dormant, 1: initial, 2: expansion, 3: breaking, 4: explosion
        this.pulseIntensity = 0;
        this.explosionProgress = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        this.brightWorld = false;
        this.particles = [];
    }

    addEnergy(amount) {
        this.energy += amount;
        this.pulseIntensity = Math.min(this.pulseIntensity + 0.5, 1);

        // Pulse all existing branches
        this.branches.forEach(branch => branch.pulse());

        // Stage progression
        if (this.energy > 200 && this.stage < 4) {
            this.explode();
        } else if (this.energy > 100 && this.stage < 3) {
            this.stage = 3;
            this.addBranches(5);
        } else if (this.energy > 40 && this.stage < 2) {
            this.stage = 2;
            this.addBranches(3);
        } else if (this.energy > 5 && this.stage < 1) {
            this.stage = 1;
            this.createInitialCrack();
        }

        // Random new branches as energy builds
        if (this.stage >= 2 && Math.random() < 0.1) {
            this.addRandomBranch();
        }
    }

    createInitialCrack() {
        // First tiny crack in the center
        const angle = Math.random() * Math.PI * 2;
        const branch = new CrackBranch(centerX, centerY, angle, 60, 2, 0);
        branch.targetGrowth = 1;
        this.branches.push(branch);
    }

    addBranches(count) {
        for (let i = 0; i < count; i++) {
            this.addRandomBranch();
        }
    }

    addRandomBranch() {
        if (this.branches.length === 0) return;

        // Branch off from existing cracks
        const parent = this.branches[Math.floor(Math.random() * this.branches.length)];
        const t = 0.3 + Math.random() * 0.5;
        const pointIndex = Math.floor(parent.points.length * t * parent.growth);

        if (pointIndex >= parent.points.length) return;

        const point = parent.points[pointIndex];
        const angleOffset = (Math.random() - 0.5) * Math.PI * 0.8;
        const newAngle = parent.angle + angleOffset;
        const length = 40 + Math.random() * 80 * (1 + this.energy / 100);
        const width = 1.5 + Math.random() * 2;

        const branch = new CrackBranch(point.x, point.y, newAngle, length, width, parent.generation + 1);
        branch.targetGrowth = 1;
        this.branches.push(branch);
    }

    explode() {
        this.stage = 4;
        this.explosionProgress = 0;

        // Create explosion particles
        for (let i = 0; i < 100; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 8;
            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                size: 2 + Math.random() * 4,
                color: ['#ffffff', '#00ffff', '#ff00ff', '#ffff00'][Math.floor(Math.random() * 4)]
            });
        }

        // Make all branches fully visible
        this.branches.forEach(branch => {
            branch.targetGrowth = 1;
            branch.glowIntensity = 1;
        });
    }

    update(deltaTime) {
        // Update all branches
        this.branches.forEach(branch => branch.update(deltaTime));

        // Pulse decay
        this.pulseIntensity *= 0.9;

        // Screen shake in stage 3+
        if (this.stage >= 3) {
            const shakeAmount = (this.stage === 3 ? 2 : 5) * this.pulseIntensity;
            this.shakeX = (Math.random() - 0.5) * shakeAmount;
            this.shakeY = (Math.random() - 0.5) * shakeAmount;
        } else {
            this.shakeX *= 0.8;
            this.shakeY *= 0.8;
        }

        // Explosion progression
        if (this.stage === 4) {
            this.explosionProgress = Math.min(this.explosionProgress + deltaTime * 0.5, 1);

            // Update particles
            this.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.1; // Gravity
                p.life *= 0.98;
            });

            // Transition to bright world
            if (this.explosionProgress > 0.7) {
                this.brightWorld = true;
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // Apply screen shake
        ctx.translate(this.shakeX, this.shakeY);

        // Background flash during explosion
        if (this.stage === 4) {
            const flashIntensity = Math.sin(this.explosionProgress * Math.PI) * 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity})`;
            ctx.fillRect(-this.shakeX, -this.shakeY, width, height);
        }

        // Draw all crack branches
        const baseGlow = 0.5 + this.pulseIntensity * 0.5 + (this.stage / 4) * 0.5;
        this.branches.forEach(branch => branch.draw(ctx, baseGlow));

        // Draw explosion particles
        if (this.stage === 4) {
            this.particles.forEach(p => {
                if (p.life < 0.01) return;
                ctx.fillStyle = p.color.replace(')', `, ${p.life})`).replace('rgb', 'rgba');
                ctx.shadowBlur = 20 * p.life;
                ctx.shadowColor = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });
            ctx.shadowBlur = 0;
        }

        // Bright world transition
        if (this.brightWorld) {
            const brightness = (this.explosionProgress - 0.7) / 0.3;
            const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(width, height));
            gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
            gradient.addColorStop(0.5, `rgba(200, 255, 255, ${brightness * 0.8})`);
            gradient.addColorStop(1, `rgba(255, 200, 255, ${brightness * 0.6})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(-this.shakeX, -this.shakeY, width, height);
        }

        ctx.restore();
    }
}

// ===== MAIN SYSTEM =====

const crackSystem = new CrackSystem();
let lastTime = performance.now();
const pressedKeys = new Set();

function animate(currentTime) {
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Update and draw crack system
    crackSystem.update(deltaTime);
    crackSystem.draw(ctx);

    requestAnimationFrame(animate);
}

// ===== KEYBOARD HANDLERS =====

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

    // Add energy to crack system
    crackSystem.addEnergy(1);
}

function handleKeyUp(e) {
    const key = e.key.toUpperCase();
    if (!KEY_MAP[key]) return;

    e.preventDefault();
    pressedKeys.delete(key);
    stopNote(key);
}

// ===== INITIALIZATION =====

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        Object.keys(activeOscillators).forEach(key => stopNote(key));
        pressedKeys.clear();
    }
});

// Start animation
animate(performance.now());

console.log('🎹 Reality Tear Piano initialized');
console.log('💥 Play to crack open the darkness!');
console.log('   Stage 1: First fracture (5+ keys)');
console.log('   Stage 2: Expansion (40+ keys)');
console.log('   Stage 3: Breaking point (100+ keys)');
console.log('   Stage 4: EXPLOSION (200+ keys)');
