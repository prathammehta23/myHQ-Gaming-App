const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export function playClickSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioCtx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
}

export function playSuccessSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sine';

    // A major chord arpeggio
    osc1.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
    osc1.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1); // C#5
    osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5

    osc2.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc2.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.1);
    osc2.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.5);
    osc2.stop(audioCtx.currentTime + 0.5);
}

// Add global click listener for all buttons with class 'btn'
document.addEventListener('click', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('btn')) {
        playClickSound();
    }
});
