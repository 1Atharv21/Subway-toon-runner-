/* Web Audio API - Authentic Subway Surfers Music & Sound Synthesizer */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.musicGain = null;
        this.sfxGain = null;
        this.isPlayingMusic = false;
        this.musicInterval = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();

                this.musicGain = this.ctx.createGain();
                this.musicGain.gain.value = 0.32;
                this.musicGain.connect(this.ctx.destination);

                this.sfxGain = this.ctx.createGain();
                this.sfxGain.gain.value = 0.45;
                this.sfxGain.connect(this.ctx.destination);
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleSound() {
        this.enabled = !this.enabled;
        if (!this.enabled && this.ctx) {
            if (this.musicGain) this.musicGain.gain.value = 0;
            if (this.sfxGain) this.sfxGain.gain.value = 0;
        } else if (this.enabled && this.ctx) {
            if (this.musicGain) this.musicGain.gain.value = 0.32;
            if (this.sfxGain) this.sfxGain.gain.value = 0.45;
        }
        return this.enabled;
    }

    // Classic Gold Coin Chime (bright double tone)
    playCoin() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    // Classic Jump Whoosh
    playJump() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.18);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    // Classic Slide Swoosh
    playSlide() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(480, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.2);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.22);
    }

    // Lane Switch Dodge Tone
    playLaneSwitch() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(340, now);
        osc.frequency.exponentialRampToValueAtTime(460, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    // Hit Impact Sound
    playHit() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);

        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    // Inspector Police Whistle
    playWhistle() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200, now);
        for (let i = 0; i < 6; i++) {
            osc.frequency.setValueAtTime(2400, now + i * 0.04);
            osc.frequency.setValueAtTime(2000, now + i * 0.04 + 0.02);
        }

        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.28);
    }

    // Powerup Fanfare
    playPowerup() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.06);

            gain.gain.setValueAtTime(0.3, now + idx * 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);

            osc.start(now + idx * 0.06);
            osc.stop(now + idx * 0.06 + 0.15);
        });
    }

    // Hoverboard Deployment sound
    playHoverboard() {
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now);
        osc.stop(now + 0.35);
    }

    // Authentic Upbeat Subway Surfers Trumpet & Brass Beat
    startMusic() {
        if (this.isPlayingMusic || !this.enabled) return;
        this.init();
        this.isPlayingMusic = true;

        // Upbeat Subway Surfers C-major Brass Melody & Funk Bass Line
        const brassMelody = [
            523.25, 659.25, 783.99, 1046.50, // C5, E5, G5, C6
            880.00, 783.99, 659.25, 523.25,  // A5, G5, E5, C5
            659.25, 783.99, 880.00, 1046.50,
            1174.66, 1046.50, 880.00, 783.99
        ];

        const bassNotes = [130.81, 130.81, 164.81, 130.81, 174.61, 130.81, 196.00, 130.81];

        let step = 0;

        this.musicInterval = setInterval(() => {
            if (!this.enabled || !this.ctx || !this.isPlayingMusic) return;

            const now = this.ctx.currentTime;

            // 1. Upbeat Slap Bass
            const bassFreq = bassNotes[step % bassNotes.length];
            const oscBass = this.ctx.createOscillator();
            const gainBass = this.ctx.createGain();

            oscBass.type = 'triangle';
            oscBass.frequency.setValueAtTime(bassFreq, now);

            gainBass.gain.setValueAtTime(0.18, now);
            gainBass.gain.exponentialRampToValueAtTime(0.005, now + 0.16);

            oscBass.connect(gainBass);
            gainBass.connect(this.musicGain);

            oscBass.start(now);
            oscBass.stop(now + 0.16);

            // 2. Brass Horn Melody Lead
            if (step % 2 === 0) {
                const note = brassMelody[(step / 2) % brassMelody.length];
                const oscBrass = this.ctx.createOscillator();
                const gainBrass = this.ctx.createGain();

                oscBrass.type = 'sawtooth';
                oscBrass.frequency.setValueAtTime(note, now);

                gainBrass.gain.setValueAtTime(0.12, now);
                gainBrass.gain.exponentialRampToValueAtTime(0.002, now + 0.18);

                oscBrass.connect(gainBrass);
                gainBrass.connect(this.musicGain);

                oscBrass.start(now);
                oscBrass.stop(now + 0.18);
            }

            // 3. Upbeat Snare & Hi-Hat Drum Loop
            if (step % 4 === 2) {
                const snare = this.ctx.createOscillator();
                const sGain = this.ctx.createGain();
                snare.type = 'square';
                snare.frequency.setValueAtTime(200, now);
                sGain.gain.setValueAtTime(0.08, now);
                sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
                snare.connect(sGain);
                sGain.connect(this.musicGain);
                snare.start(now);
                snare.stop(now + 0.08);
            }

            step++;
        }, 190); // ~158 BPM Upbeat Runner Pace
    }

    stopMusic() {
        this.isPlayingMusic = false;
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }
}

const sounds = new SoundEngine();
