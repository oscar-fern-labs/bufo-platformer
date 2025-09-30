// Simple Web Audio API sound generation for game sounds
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.backgroundMusic = null;
        this.masterVolume = 0.5;
        
        this.initAudio();
    }
    
    async initAudio() {
        try {
            // Initialize audio context on first user interaction
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create sounds
            this.createJumpSound();
            this.createAttackSound();
            this.createBackgroundMusic();
            
        } catch (error) {
            console.warn('Web Audio API not supported:', error);
        }
    }
    
    async resumeAudioContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }
    }
    
    createJumpSound() {
        this.sounds.jump = () => this.playTone(440, 0.1, 0.3, 'sine');
    }
    
    createAttackSound() {
        this.sounds.attack = () => {
            // Create a more complex attack sound
            this.playTone(220, 0.05, 0.4, 'sawtooth');
            setTimeout(() => this.playTone(330, 0.05, 0.3, 'square'), 50);
        };
    }
    
    createBackgroundMusic() {
        // Create a simple background music loop
        let musicPlaying = false;
        
        this.sounds.backgroundMusic = {
            play: async () => {
                if (!musicPlaying && this.audioContext) {
                    musicPlaying = true;
                    await this.resumeAudioContext();
                    this.playBackgroundLoop();
                }
            },
            pause: () => {
                musicPlaying = false;
            }
        };
        
        this.playBackgroundLoop = () => {
            if (!musicPlaying) return;
            
            // Play a simple melody
            const notes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25]; // C major scale
            const melody = [0, 2, 4, 2, 0, 4, 2, 0]; // Simple pattern
            
            melody.forEach((noteIndex, i) => {
                setTimeout(() => {
                    if (musicPlaying) {
                        this.playTone(notes[noteIndex], 0.3, 0.1, 'sine');
                    }
                }, i * 500);
            });
            
            // Loop the music
            if (musicPlaying) {
                setTimeout(() => this.playBackgroundLoop(), melody.length * 500);
            }
        };
    }
    
    playTone(frequency, duration, volume = 0.3, waveType = 'sine') {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = waveType;
            
            // Create envelope for more natural sound
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume * this.masterVolume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
            
        } catch (error) {
            console.warn('Failed to play tone:', error);
        }
    }
    
    playSound(soundName) {
        if (this.sounds[soundName]) {
            this.resumeAudioContext().then(() => {
                if (typeof this.sounds[soundName] === 'function') {
                    this.sounds[soundName]();
                } else if (this.sounds[soundName].play) {
                    this.sounds[soundName].play();
                }
            });
        }
    }
    
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    // Create more complex sounds
    createCrumbleSound() {
        this.sounds.crumble = () => {
            // White noise for crumbling effect
            if (!this.audioContext) return;
            
            const bufferSize = this.audioContext.sampleRate * 0.3; // 0.3 seconds
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const output = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            const whiteNoise = this.audioContext.createBufferSource();
            whiteNoise.buffer = buffer;
            
            const gainNode = this.audioContext.createGain();
            whiteNoise.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            gainNode.gain.setValueAtTime(0.3 * this.masterVolume, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            whiteNoise.start(this.audioContext.currentTime);
            whiteNoise.stop(this.audioContext.currentTime + 0.3);
        };
    }
    
    createHitSound() {
        this.sounds.hit = () => {
            // Short impact sound
            this.playTone(150, 0.1, 0.5, 'square');
        };
    }
    
    createWinSound() {
        this.sounds.win = () => {
            // Victory fanfare
            const notes = [523.25, 659.25, 783.99]; // C, E, G
            notes.forEach((freq, i) => {
                setTimeout(() => {
                    this.playTone(freq, 0.5, 0.4, 'triangle');
                }, i * 200);
            });
        };
    }
    
    createLoseSound() {
        this.sounds.lose = () => {
            // Sad trombone effect
            const frequencies = [220, 196, 174, 155];
            frequencies.forEach((freq, i) => {
                setTimeout(() => {
                    this.playTone(freq, 0.3, 0.3, 'sawtooth');
                }, i * 200);
            });
        };
    }
}

// Create global audio manager instance
const audioManager = new AudioManager();

// Add sounds to the global game sounds object when it exists
window.addEventListener('load', () => {
    if (window.game && game.sounds) {
        game.sounds.jump = { 
            play: () => audioManager.playSound('jump'),
            cloneNode: () => ({ play: () => audioManager.playSound('jump') })
        };
        
        game.sounds.attack = { 
            play: () => audioManager.playSound('attack'),
            cloneNode: () => ({ play: () => audioManager.playSound('attack') })
        };
        
        game.sounds.background = {
            play: () => audioManager.playSound('backgroundMusic'),
            pause: () => audioManager.sounds.backgroundMusic.pause(),
            volume: 0.3
        };
        
        // Add additional sounds
        audioManager.createCrumbleSound();
        audioManager.createHitSound();
        audioManager.createWinSound();
        audioManager.createLoseSound();
        
        game.sounds.crumble = { 
            play: () => audioManager.playSound('crumble'),
            cloneNode: () => ({ play: () => audioManager.playSound('crumble') })
        };
        
        game.sounds.hit = { 
            play: () => audioManager.playSound('hit'),
            cloneNode: () => ({ play: () => audioManager.playSound('hit') })
        };
        
        game.sounds.win = { 
            play: () => audioManager.playSound('win'),
            cloneNode: () => ({ play: () => audioManager.playSound('win') })
        };
        
        game.sounds.lose = { 
            play: () => audioManager.playSound('lose'),
            cloneNode: () => ({ play: () => audioManager.playSound('lose') })
        };
    }
});

// Enable audio on first user interaction
document.addEventListener('click', () => audioManager.resumeAudioContext(), { once: true });
document.addEventListener('keydown', () => audioManager.resumeAudioContext(), { once: true });
