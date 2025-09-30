class Platform {
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.width = config.width;
        this.height = config.height;
        this.type = config.type || 'normal';
        
        // Movement properties for moving platforms
        this.moveSpeed = config.moveSpeed || 0;
        this.moveRange = config.moveRange || 0;
        this.originalX = this.x;
        this.moveDirection = 1;
        
        // Visual properties
        this.color = this.getPlatformColor();
        this.alpha = 1.0;
        
        // State properties
        this.isCrumbling = false;
        this.crumbleTimer = 0;
        this.crumbleDuration = 2000; // 2 seconds to crumble
        
        this.shouldDisintegrate = this.type !== 'ground';
        this.disintegrationSpeed = 0.001;
        
        // Effects
        this.particles = [];
        this.glowEffect = 0;
    }
    
    getPlatformColor() {
        const colors = {
            'ground': '#8B4513',      // Brown
            'normal': '#32CD32',      // Lime green
            'fragile': '#FF6347',     // Tomato red
            'bouncy': '#FFD700',      // Gold
            'moving': '#9370DB',      // Medium purple
            'cloud': '#F0F8FF',       // Alice blue
            'ice': '#B0E0E6',         // Powder blue
            'lava': '#DC143C'         // Crimson
        };
        return colors[this.type] || colors.normal;
    }
    
    update(deltaTime) {
        // Handle movement for moving platforms
        if (this.type === 'moving' && this.moveSpeed > 0) {
            this.updateMovement(deltaTime);
        }
        
        // Handle crumbling
        if (this.isCrumbling) {
            this.updateCrumbling(deltaTime);
        }
        
        // Handle disintegration for platforms below screen
        if (this.shouldDisintegrate) {
            this.updateDisintegration(deltaTime);
        }
        
        // Update effects
        this.updateEffects(deltaTime);
    }
    
    updateMovement(deltaTime) {
        const dt = deltaTime / 16.67; // Normalize to 60fps
        
        this.x += this.moveSpeed * this.moveDirection * dt;
        
        // Bounce off boundaries
        if (this.x <= this.originalX - this.moveRange/2) {
            this.x = this.originalX - this.moveRange/2;
            this.moveDirection = 1;
        } else if (this.x >= this.originalX + this.moveRange/2) {
            this.x = this.originalX + this.moveRange/2;
            this.moveDirection = -1;
        }
    }
    
    updateCrumbling(deltaTime) {
        this.crumbleTimer += deltaTime;
        
        // Visual feedback - make platform flash/shake
        this.alpha = 0.5 + 0.5 * Math.sin(this.crumbleTimer * 0.01);
        
        // Add crumble particles
        if (Math.random() < 0.1) {
            this.addCrumbleParticle();
        }
        
        // Remove platform when crumble time is up
        if (this.crumbleTimer >= this.crumbleDuration) {
            this.shouldDisintegrate = true;
            this.alpha = 0;
        }
    }
    
    updateDisintegration(deltaTime) {
        // Platforms below a certain point relative to camera slowly fade
        if (game && game.camera) {
            const distanceBelowCamera = this.y - (game.camera.y + GAME_CONFIG.height);
            
            if (distanceBelowCamera > GAME_CONFIG.platformDisintegrationHeight) {
                this.alpha -= this.disintegrationSpeed * deltaTime;
                
                if (this.alpha <= 0) {
                    this.shouldDisintegrate = true;
                }
            }
        }
    }
    
    updateEffects(deltaTime) {
        // Update glow effect for special platforms
        if (this.type === 'bouncy' || this.type === 'moving') {
            this.glowEffect = Math.sin(Date.now() * 0.005) * 0.3 + 0.7;
        }
        
        // Update particles
        this.particles.forEach(particle => particle.update(deltaTime));
        this.particles = this.particles.filter(particle => !particle.finished);
    }
    
    startCrumbling() {
        if (!this.isCrumbling && this.type === 'fragile') {
            this.isCrumbling = true;
            this.crumbleTimer = 0;
            
            // Play crumble sound
            this.playSound('crumble');
            
            // Add initial crumble effect
            for (let i = 0; i < 5; i++) {
                this.addCrumbleParticle();
            }
        }
    }
    
    addCrumbleParticle() {
        const particle = new Particle({
            x: this.x + Math.random() * this.width,
            y: this.y,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * -3,
            color: this.color,
            size: 2 + Math.random() * 3,
            life: 1000 + Math.random() * 1000
        });
        
        this.particles.push(particle);
    }
    
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        // Main platform body
        this.drawPlatformBody(ctx);
        
        // Platform-specific decorations
        this.drawPlatformDecorations(ctx);
        
        // Draw particles
        this.particles.forEach(particle => particle.draw(ctx));
        
        // Special effects
        if (this.glowEffect > 0) {
            this.drawGlowEffect(ctx);
        }
        
        ctx.restore();
    }
    
    drawPlatformBody(ctx) {
        // Base platform
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Add gradient for depth
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
        ctx.fillStyle = gradient;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    
    drawPlatformDecorations(ctx) {
        switch (this.type) {
            case 'bouncy':
                this.drawBouncyDecorations(ctx);
                break;
            case 'fragile':
                this.drawFragileDecorations(ctx);
                break;
            case 'moving':
                this.drawMovingDecorations(ctx);
                break;
            case 'cloud':
                this.drawCloudDecorations(ctx);
                break;
            case 'ice':
                this.drawIceDecorations(ctx);
                break;
        }
    }
    
    drawBouncyDecorations(ctx) {
        // Spring coils
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 2;
        
        const springCount = Math.floor(this.width / 30);
        for (let i = 0; i < springCount; i++) {
            const x = this.x + (i + 0.5) * (this.width / springCount);
            const y = this.y;
            
            ctx.beginPath();
            for (let j = 0; j < 6; j++) {
                const springY = y - j * 2;
                const offset = Math.sin(j + Date.now() * 0.01) * 2;
                ctx.lineTo(x + offset, springY);
            }
            ctx.stroke();
        }
    }
    
    drawFragileDecorations(ctx) {
        if (this.isCrumbling) {
            // Draw cracks
            ctx.strokeStyle = 'rgba(139, 69, 19, 0.8)';
            ctx.lineWidth = 1;
            
            // Random crack lines
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(this.x + Math.random() * this.width, this.y);
                ctx.lineTo(this.x + Math.random() * this.width, this.y + this.height);
                ctx.stroke();
            }
        }
    }
    
    drawMovingDecorations(ctx) {
        // Arrow indicating movement direction
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        const arrowX = this.x + this.width/2;
        const arrowY = this.y + this.height/2;
        const arrowSize = 6;
        
        ctx.beginPath();
        if (this.moveDirection === 1) {
            // Right arrow
            ctx.moveTo(arrowX - arrowSize, arrowY - arrowSize);
            ctx.lineTo(arrowX + arrowSize, arrowY);
            ctx.lineTo(arrowX - arrowSize, arrowY + arrowSize);
        } else {
            // Left arrow
            ctx.moveTo(arrowX + arrowSize, arrowY - arrowSize);
            ctx.lineTo(arrowX - arrowSize, arrowY);
            ctx.lineTo(arrowX + arrowSize, arrowY + arrowSize);
        }
        ctx.fill();
    }
    
    drawCloudDecorations(ctx) {
        // Fluffy cloud texture
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        
        const cloudBumps = Math.floor(this.width / 20);
        for (let i = 0; i < cloudBumps; i++) {
            const x = this.x + i * 20 + 10;
            const y = this.y - 5;
            const radius = 8 + Math.sin(Date.now() * 0.003 + i) * 2;
            
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawIceDecorations(ctx) {
        // Ice crystals
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        
        const crystalCount = Math.floor(this.width / 40);
        for (let i = 0; i < crystalCount; i++) {
            const x = this.x + (i + 0.5) * (this.width / crystalCount);
            const y = this.y + this.height/2;
            
            // Draw snowflake pattern
            for (let j = 0; j < 6; j++) {
                const angle = (j / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(
                    x + Math.cos(angle) * 8,
                    y + Math.sin(angle) * 8
                );
                ctx.stroke();
            }
        }
    }
    
    drawGlowEffect(ctx) {
        // Outer glow
        const gradient = ctx.createRadialGradient(
            this.x + this.width/2, this.y + this.height/2, 0,
            this.x + this.width/2, this.y + this.height/2, Math.max(this.width, this.height)
        );
        
        gradient.addColorStop(0, `rgba(255, 255, 255, ${this.glowEffect * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(
            this.x - 20, 
            this.y - 20, 
            this.width + 40, 
            this.height + 40
        );
    }
    
    playSound(soundName) {
        // Play platform-specific sounds
        if (game && game.sounds && game.sounds[soundName]) {
            const sound = game.sounds[soundName].cloneNode();
            sound.play().catch(e => console.log('Sound play failed:', e));
        }
    }
    
    // Collision detection helper
    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            right: this.x + this.width,
            bottom: this.y + this.height
        };
    }
    
    // Check if platform is visible in camera view
    isVisible(camera, screenWidth, screenHeight) {
        return this.y > camera.y - 100 && 
               this.y < camera.y + screenHeight + 100 &&
               this.x < screenWidth + 100 &&
               this.x + this.width > -100;
    }
}

// Particle class for platform effects
class Particle {
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.color = config.color || '#ffffff';
        this.size = config.size || 2;
        this.life = config.life || 1000;
        this.maxLife = this.life;
        this.finished = false;
        
        this.gravity = config.gravity || 0.1;
        this.friction = config.friction || 0.99;
    }
    
    update(deltaTime) {
        const dt = deltaTime / 16.67;
        
        // Apply physics
        this.vy += this.gravity * dt;
        this.vx *= this.friction;
        this.vy *= this.friction;
        
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Update life
        this.life -= deltaTime;
        if (this.life <= 0) {
            this.finished = true;
        }
    }
    
    draw(ctx) {
        if (this.finished) return;
        
        const alpha = this.life / this.maxLife;
        const currentSize = this.size * alpha;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}
