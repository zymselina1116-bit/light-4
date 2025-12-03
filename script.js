// ===== CONFIGURATION =====

// Keyboard mapping to frequencies (in Hz)
// Using a chromatic scale starting from C4 (middle C = 261.63 Hz)
const KEY_MAP = {
    // Home row - lower octave (WARM colors)
    'A': { freq: 261.63, colorClass: 'warm' },      // C4
    'S': { freq: 293.66, colorClass: 'warm' },      // D4
    'D': { freq: 329.63, colorClass: 'mid-warm' },  // E4
    'F': { freq: 349.23, colorClass: 'mid-warm' },  // F4
    'G': { freq: 392.00, colorClass: 'mid' },       // G4
    'H': { freq: 440.00, colorClass: 'mid' },       // A4
    'J': { freq: 493.88, colorClass: 'mid-cool' },  // B4
    'K': { freq: 523.25, colorClass: 'mid-cool' },  // C5
    'L': { freq: 587.33, colorClass: 'cool' },      // D5

    // Top row - higher octave (COOL colors)
    'Q': { freq: 523.25, colorClass: 'mid-cool' },  // C5
    'W': { freq: 587.33, colorClass: 'cool' },      // D5
    'E': { freq: 659.25, colorClass: 'cool' },      // E5
    'R': { freq: 698.46, colorClass: 'cool' },      // F5
    'T': { freq: 783.99, colorClass: 'cool' },      // G5
    'Y': { freq: 880.00, colorClass: 'cool' },      // A5
    'U': { freq: 987.77, colorClass: 'ice' },       // B5
    'I': { freq: 1046.50, colorClass: 'ice' },      // C6
    'O': { freq: 1174.66, colorClass: 'ice' },      // D6
    'P': { freq: 1318.51, colorClass: 'ice' }       // E6
};

// ===== WEB AUDIO API SETUP =====

let audioContext;
let masterGain;
const activeOscillators = {}; // Store active oscillators by key
const heldTimers = {}; // Timers for "held" state

// Initialize audio context (needs user interaction first)
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create master gain node for volume control
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.25; // Overall volume (0.0 to 1.0)
        masterGain.connect(audioContext.destination);

        console.log('🎹 Audio initialized');
    }
}

// ===== SOUND GENERATION =====

/**
 * Play a note for the given key
 * @param {string} key - The keyboard key pressed
 */
function playNote(key) {
    if (!KEY_MAP[key] || activeOscillators[key]) return;

    initAudio(); // Ensure audio is initialized

    const { freq } = KEY_MAP[key];

    // Create oscillator (sound generator)
    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine'; // Smooth sine wave (change to 'triangle', 'square', 'sawtooth' for different sounds)
    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);

    // Create gain node for this note (for fade in/out)
    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);

    // Quick fade in (attack) - like a flash
    gainNode.gain.exponentialRampToValueAtTime(0.6, audioContext.currentTime + 0.03);

    // Connect: oscillator -> gain -> master -> destination
    oscillator.connect(gainNode);
    gainNode.connect(masterGain);

    // Start the oscillator
    oscillator.start(audioContext.currentTime);

    // Store for later stopping
    activeOscillators[key] = { oscillator, gainNode };
}

/**
 * Stop the note for the given key
 * @param {string} key - The keyboard key released
 */
function stopNote(key) {
    if (!activeOscillators[key]) return;

    const { oscillator, gainNode } = activeOscillators[key];

    // Slow fade out (release) - like light decay
    const currentTime = audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.8);

    // Stop oscillator after fade out
    oscillator.stop(currentTime + 0.8);

    // Clean up
    delete activeOscillators[key];
}

// ===== VISUAL ELEMENTS =====

const dotElements = {}; // Store dot elements by key

/**
 * Create all note dots and add them to the grid
 */
function createDots() {
    const grid = document.getElementById('note-grid');

    // Create dots in two rows (top row Q-P, bottom row A-L)
    const topRowKeys = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
    const bottomRowKeys = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'];

    // Create a container for better layout control
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '80px';

    // Create top row
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.gap = '80px';
    topRow.style.justifyContent = 'center';

    topRowKeys.forEach(key => {
        if (KEY_MAP[key]) {
            const dot = createDot(key);
            topRow.appendChild(dot);
            dotElements[key] = dot;
        }
    });

    // Create bottom row
    const bottomRow = document.createElement('div');
    bottomRow.style.display = 'flex';
    bottomRow.style.gap = '80px';
    bottomRow.style.justifyContent = 'center';

    bottomRowKeys.forEach(key => {
        if (KEY_MAP[key]) {
            const dot = createDot(key);
            bottomRow.appendChild(dot);
            dotElements[key] = dot;
        }
    });

    container.appendChild(topRow);
    container.appendChild(bottomRow);
    grid.appendChild(container);

    console.log('✨ Light dots created');
}

/**
 * Create a single dot element
 * @param {string} key - The keyboard key this dot represents
 * @returns {HTMLElement} - The dot element
 */
function createDot(key) {
    const dot = document.createElement('div');
    dot.className = 'note-dot';
    dot.dataset.key = key;

    // Assign color theme based on frequency
    const { colorClass } = KEY_MAP[key];
    dot.classList.add(colorClass);

    return dot;
}

/**
 * Activate (glow) the dot for the given key
 * @param {string} key - The keyboard key
 */
function activateDot(key) {
    if (!dotElements[key]) return;

    const dot = dotElements[key];

    // Remove any previous release state
    dot.classList.remove('releasing');

    // Add active class for immediate flash
    dot.classList.add('active');

    // After a short moment, add "held" class for breathing animation
    heldTimers[key] = setTimeout(() => {
        if (dot.classList.contains('active')) {
            dot.classList.add('held');
        }
    }, 300); // 300ms delay before breathing starts

    // Update scene brightness
    updateSceneBrightness();
}

/**
 * Deactivate (dim) the dot for the given key
 * @param {string} key - The keyboard key
 */
function deactivateDot(key) {
    if (!dotElements[key]) return;

    const dot = dotElements[key];

    // Clear held timer if it exists
    if (heldTimers[key]) {
        clearTimeout(heldTimers[key]);
        delete heldTimers[key];
    }

    // Add releasing class for slow decay
    dot.classList.add('releasing');

    // Remove active and held classes
    dot.classList.remove('active', 'held');

    // Remove releasing class after animation completes
    setTimeout(() => {
        dot.classList.remove('releasing');
    }, 1500); // Match the longest transition time in CSS

    // Update scene brightness
    updateSceneBrightness();
}

/**
 * Update scene brightness based on number of active notes
 */
function updateSceneBrightness() {
    const activeCount = Object.keys(activeOscillators).length;

    // Remove all brightness classes
    document.body.classList.remove('many-active', 'very-active');

    // Add appropriate class based on active count
    if (activeCount >= 7) {
        document.body.classList.add('very-active');
    } else if (activeCount >= 4) {
        document.body.classList.add('many-active');
    }
}

// ===== KEYBOARD EVENT HANDLERS =====

const pressedKeys = new Set(); // Track currently pressed keys

/**
 * Handle keydown event
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleKeyDown(e) {
    // Hide instructions on first keypress
    const instructions = document.getElementById('instructions');
    if (instructions && !instructions.classList.contains('hidden')) {
        instructions.classList.add('hidden');
    }

    const key = e.key.toUpperCase();

    // Ignore if key is not mapped or already pressed (for key repeat)
    if (!KEY_MAP[key] || pressedKeys.has(key)) return;

    // Prevent default behavior
    e.preventDefault();

    // Mark key as pressed
    pressedKeys.add(key);

    // Trigger sound and visual
    playNote(key);
    activateDot(key);
}

/**
 * Handle keyup event
 * @param {KeyboardEvent} e - The keyboard event
 */
function handleKeyUp(e) {
    const key = e.key.toUpperCase();

    // Ignore if key is not mapped
    if (!KEY_MAP[key]) return;

    // Prevent default behavior
    e.preventDefault();

    // Mark key as released
    pressedKeys.delete(key);

    // Stop sound and visual
    stopNote(key);
    deactivateDot(key);
}

// ===== INITIALIZATION =====

/**
 * Initialize the light piano
 */
function init() {
    console.log('🎹 Light Piano initializing...');

    // Create visual dots
    createDots();

    // Add keyboard event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Handle page visibility (stop all sounds when tab is hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Stop all active notes
            Object.keys(activeOscillators).forEach(key => {
                stopNote(key);
                deactivateDot(key);
            });
            pressedKeys.clear();

            // Clear all held timers
            Object.keys(heldTimers).forEach(key => {
                clearTimeout(heldTimers[key]);
            });
            heldTimers.length = 0;
        }
    });

    console.log('✨ Light Piano ready! Press keys to play.');
    console.log('🎵 Lower keys (A-L) = warm colors | Higher keys (Q-P) = cool colors');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ===== OPTIONAL: Mouse/Touch Support =====
// Uncomment to enable clicking on dots to play notes

/*
document.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('note-dot')) {
        const key = e.target.dataset.key;
        if (key && !pressedKeys.has(key)) {
            pressedKeys.add(key);
            playNote(key);
            activateDot(key);
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (e.target.classList.contains('note-dot')) {
        const key = e.target.dataset.key;
        if (key && pressedKeys.has(key)) {
            pressedKeys.delete(key);
            stopNote(key);
            deactivateDot(key);
        }
    }
});
*/
