// ===== CONFIGURATION =====

// Keyboard mapping to frequencies (in Hz)
// Using a chromatic scale starting from C4 (middle C = 261.63 Hz)
const KEY_MAP = {
    // Top row - higher octave
    'Q': { freq: 523.25, color: 0 },   // C5
    'W': { freq: 587.33, color: 1 },   // D5
    'E': { freq: 659.25, color: 2 },   // E5
    'R': { freq: 698.46, color: 3 },   // F5
    'T': { freq: 783.99, color: 4 },   // G5
    'Y': { freq: 880.00, color: 5 },   // A5
    'U': { freq: 987.77, color: 6 },   // B5
    'I': { freq: 1046.50, color: 7 },  // C6
    'O': { freq: 1174.66, color: 8 },  // D6
    'P': { freq: 1318.51, color: 9 },  // E6

    // Home row - lower octave
    'A': { freq: 261.63, color: 10 },  // C4
    'S': { freq: 293.66, color: 11 },  // D4
    'D': { freq: 329.63, color: 12 },  // E4
    'F': { freq: 349.23, color: 13 },  // F4
    'G': { freq: 392.00, color: 14 },  // G4
    'H': { freq: 440.00, color: 15 },  // A4
    'J': { freq: 493.88, color: 16 },  // B4
    'K': { freq: 523.25, color: 17 },  // C5
    'L': { freq: 587.33, color: 18 }   // D5
};

// ===== WEB AUDIO API SETUP =====

let audioContext;
let masterGain;
const activeOscillators = {}; // Store active oscillators by key

// Initialize audio context (needs user interaction first)
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create master gain node for volume control
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.3; // Overall volume (0.0 to 1.0)
        masterGain.connect(audioContext.destination);

        console.log('Audio initialized');
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

    // Quick fade in (attack)
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);

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

    // Fade out (release)
    const currentTime = audioContext.currentTime;
    gainNode.gain.cancelScheduledValues(currentTime);
    gainNode.gain.setValueAtTime(gainNode.gain.value, currentTime);
    gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.2);

    // Stop oscillator after fade out
    oscillator.stop(currentTime + 0.2);

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
    container.style.gap = '60px';

    // Create top row
    const topRow = document.createElement('div');
    topRow.style.display = 'flex';
    topRow.style.gap = '60px';
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
    bottomRow.style.gap = '60px';
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

    // Optional: Add key label for reference
    // dot.textContent = key;
    // dot.style.display = 'flex';
    // dot.style.alignItems = 'center';
    // dot.style.justifyContent = 'center';
    // dot.style.color = '#666';
    // dot.style.fontSize = '12px';

    return dot;
}

/**
 * Activate (glow) the dot for the given key
 * @param {string} key - The keyboard key
 */
function activateDot(key) {
    if (dotElements[key]) {
        dotElements[key].classList.add('active');
    }
}

/**
 * Deactivate (dim) the dot for the given key
 * @param {string} key - The keyboard key
 */
function deactivateDot(key) {
    if (dotElements[key]) {
        dotElements[key].classList.remove('active');
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
    console.log('Light Piano initializing...');

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
        }
    });

    console.log('Light Piano ready! Press keys to play.');
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
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('note-dot')) {
        const key = e.target.dataset.key;
        if (key) {
            playNote(key);
            activateDot(key);

            // Auto-release after a short time
            setTimeout(() => {
                stopNote(key);
                deactivateDot(key);
            }, 300);
        }
    }
});
*/
