/**
 * WarungKu Premium Audio Utility
 * High-quality programmatic sound generation using Web Audio API.
 * designed for a minimalist, professional POS experience.
 */

class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
    }

    async resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    play(type) {
        if (!this.enabled) return;
        this.init();
        this.resume();

        if (!this.ctx) return;

        switch (type) {
            case 'item_added':
                this.softBeep(); // Beep halus
                break;
            case 'success':
                this.successTone(); // Nada sukses halus
                break;
            case 'checkout':
                this.harmonicChord(); // Chord harmonis
                break;
            case 'warning':
            case 'error':
                this.warningTone(); // Nada peringatan
                break;
            case 'click':
                this.lightClick(); // Klik ringan
                break;
            default:
                this.beep(440, 0.1, 'sine', 0.05);
        }
    }

    // UTILITY: Basic Beep with Envelope
    beep(freq, duration, type = 'sine', volume = 0.1, attack = 0.01) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        // Envelope: Sharper Attack and cleaner Decay for "Punchy" sound
        gain.gain.setValueAtTime(0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(volume * 1.5, this.ctx.currentTime + attack); // 1.5x Boost
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // 1. RETAIL SCAN BEEP (Indomaret/Alfamart Style)
    // A clean, high-pitched "BIP" characteristic of commercial scanners
    softBeep() {
        // Frequency: 1800Hz is typical for retail scanners
        // Waveform: Sine for clarity, very short duration
        this.beep(1800, 0.08, 'sine', 0.12, 0.002); 
    }
    
    // 2. WELCOME CHIME / SUCCESS (Ding-Dong Style)
    // The iconic dual-tone welcoming chime used in retail stores
    harmonicChord() {
        // Tone 1: High (E5/659.25Hz)
        this.beep(659.25, 0.4, 'sine', 0.06, 0.05);
        
        // Tone 2: Low (C5/523.25Hz) delayed slightly for the "dong"
        setTimeout(() => {
            this.beep(523.25, 0.6, 'sine', 0.05, 0.05);
        }, 250);
    }

    // 3. SUCCESS / NOTIFICATION
    successTone() {
        this.beep(1318.51, 0.1, 'sine', 0.08, 0.01); // E6
        setTimeout(() => {
            this.beep(1567.98, 0.15, 'sine', 0.08, 0.01); // G6
        }, 80);
    }

    // 4. NADA PERINGATAN (For Errors/Warnings)
    // Two quick, low-pitched descending tones
    warningTone() {
        this.beep(220, 0.2, 'sine', 0.08, 0.05); // A3
        setTimeout(() => {
            this.beep(185, 0.25, 'sine', 0.06, 0.05); // Gb3
        }, 120);
    }

    // 4. KLIK RINGAN (For UI adjustments)
    // A very short, high-frequency "tink"
    lightClick() {
        this.beep(1760, 0.04, 'sine', 0.03, 0.005); // A6, ultra short
    }

    // Success notification beep
    successTone() {
        this.beep(1318.51, 0.15, 'sine', 0.06, 0.02); // E6
    }
}

const audioManager = new AudioManager();

export const playAudio = (type) => {
    try {
        audioManager.play(type);
    } catch (e) {
        console.warn('Audio playback failed', e);
    }
};

export default audioManager;
