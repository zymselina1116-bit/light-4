// ===== CONFIGURATION =====

// Keyboard mapping to frequencies (in Hz)
// Full chromatic scale covering ~3.5 octaves (C2 to A6)
// 35 keys total across 4 rows
const KEY_MAP = {
    // ===== ROW 4 (Numbers) - VERY LOW BASS NOTES (C2-C3) =====
    '1': { freq: 65.41,  colorClass: 'very-warm' },  // C2
    '2': { freq: 73.42,  colorClass: 'very-warm' },  // D2
    '3': { freq: 82.41,  colorClass: 'very-warm' },  // E2
    '4': { freq: 87.31,  colorClass: 'very-warm' },  // F2
    '5': { freq: 98.00,  colorClass: 'very-warm' },  // G2
    '6': { freq: 110.00, colorClass: 'very-warm' },  // A2
    '7': { freq: 123.47, colorClass: 'very-warm' },  // B2
    '8': { freq: 130.81, colorClass: 'warm' },       // C3

    // ===== ROW 1 (Z-M) - LOW NOTES (C3-B3) =====
    'Z': { freq: 130.81, colorClass: 'warm' },       // C3
    'X': { freq: 146.83, colorClass: 'warm' },       // D3
    'C': { freq: 164.81, colorClass: 'warm' },       // E3
    'V': { freq: 174.61, colorClass: 'warm' },       // F3
    'B': { freq: 196.00, colorClass: 'warm' },       // G3
    'N': { freq: 220.00, colorClass: 'mid-warm' },   // A3
    'M': { freq: 246.94, colorClass: 'mid-warm' },   // B3

    // ===== ROW 2 (A-;) - MIDDLE NOTES (C4-E5) =====
    'A': { freq: 261.63, colorClass: 'mid-warm' },   // C4 (Middle C)
    'S': { freq: 293.66, colorClass: 'mid-warm' },   // D4
    'D': { freq: 329.63, colorClass: 'mid' },        // E4
    'F': { freq: 349.23, colorClass: 'mid' },        // F4
    'G': { freq: 392.00, colorClass: 'mid' },        // G4
    'H': { freq: 440.00, colorClass: 'mid' },        // A4
    'J': { freq: 493.88, colorClass: 'mid-cool' },   // B4
    'K': { freq: 523.25, colorClass: 'mid-cool' },   // C5
    'L': { freq: 587.33, colorClass: 'mid-cool' },   // D5
    ';': { freq: 659.25, colorClass: 'cool' },       // E5

    // ===== ROW 3 (Q-P) - HIGH NOTES (F5-A6) =====
    'Q': { freq: 698.46,  colorClass: 'cool' },      // F5
    'W': { freq: 783.99,  colorClass: 'cool' },      // G5
    'E': { freq: 880.00,  colorClass: 'cool' },      // A5
    'R': { freq: 987.77,  colorClass: 'cool' },      // B5
    'T': { freq: 1046.50, colorClass: 'ice' },       // C6
    'Y': { freq: 1174.66, colorClass: 'ice' },       // D6
    'U': { freq: 1318.51, colorClass: 'ice' },       // E6
    'I': { freq: 1396.91, colorClass: 'ice' },       // F6
    'O': { freq: 1567.98, colorClass: 'ice' },       // G6
    'P': { freq: 1760.00, colorClass: 'ice' }        // A6
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

    // Define all 4 keyboard rows (35 keys total)
    const rows = [
        { keys: ['1', '2', '3', '4', '5', '6', '7', '8'], label: 'Row 4 (Bass)' },
        { keys: ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'], label: 'Row 3 (High)' },
        { keys: ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';'], label: 'Row 2 (Mid)' },
        { keys: ['Z', 'X', 'C', 'V', 'B', 'N', 'M'], label: 'Row 1 (Low)' }
    ];

    // Create a container for better layout control
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '120px'; // Isolated light orbs

    // Create each row
    rows.forEach(({ keys, label }) => {
        const rowDiv = document.createElement('div');
        rowDiv.style.display = 'flex';
        rowDiv.style.gap = '120px'; // Wide spacing for photographic feel
        rowDiv.style.justifyContent = 'center';
        rowDiv.style.alignItems = 'center';
        rowDiv.dataset.rowLabel = label;

        keys.forEach(key => {
            if (KEY_MAP[key]) {
                const dot = createDot(key);
                rowDiv.appendChild(dot);
                dotElements[key] = dot;
            }
        });

        container.appendChild(rowDiv);
    });

    grid.appendChild(container);

    console.log('✨ Light dots created: 35 keys across 4 rows');
    console.log('   Row 4: 1-8 (Bass C2-C3)');
    console.log('   Row 3: Q-P (High F5-A6)');
    console.log('   Row 2: A-; (Mid C4-E5)');
    console.log('   Row 1: Z-M (Low C3-B3)');
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
 * Adjusted thresholds for 35-key keyboard
 */
function updateSceneBrightness() {
    const activeCount = Object.keys(activeOscillators).length;

    // Remove all brightness classes
    document.body.classList.remove('many-active', 'very-active');

    // Add appropriate class based on active count
    // With 35 keys, adjusted thresholds: 6+ for "many", 12+ for "very"
    if (activeCount >= 12) {
        document.body.classList.add('very-active');
    } else if (activeCount >= 6) {
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
    console.log('🎵 35 keys mapped:');
    console.log('   1-8: Deep bass (C2-C3) - Deep red/orange');
    console.log('   Z-M: Low notes (C3-B3) - Warm orange');
    console.log('   A-;: Middle (C4-E5) - Yellow-green-cyan');
    console.log('   Q-P: High notes (F5-A6) - Blue-purple-ice');
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
