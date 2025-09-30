class Obstacle {
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.type = config.type || 'bird';
        this.width = 24;
        this.height = 24;
        
        this.vx = 0;
        this.vy = 0;
        
        this.health = 1;
        this.hit = false;
        this.finished = false;
        
        // Animation
        this.animation = {
            frame: 0,
            timer: 0,
            frameRate: 200
        };
        
        // Movement patterns
        this.movementTimer = 0;
        this.originalX = this.x;
        this.originalY = this.y;
        
        this.setupMovementPattern();
        this.setupVisuals();
    }
    
    setupMovementPattern() {
        switch (this.type) {
            case 'bird':
                this.vx = (Math.random() - 0.5) * 4;
                this.vy = Math.sin(Math.random() * Math.PI) * 2;
                this.moveSpeed = 2;
                this.movePattern = 'sine';
                break;
                
            case 'bee':
                this.vx = (Math.random() - 0.5) * 3;
                this.moveSpeed = 1.5;
                this.movePattern = 'zigzag';
                break;
                
            case 'spider':
                this.vy = 1;
                this.moveSpeed = 1;
                this.movePattern = 'drop';
                this.maxDropDistance = 300;
                break;
                
            case 'bat':
                this.vx = (Math.random() - 0.5) * 5;
                this.vy = -1;
                this.moveSpeed = 3;
                this.movePattern = 'swoop';
                break;
                
            case 'wind':
                this.vx = Math.random() > 0.5 ? 6 : -6;
                this.width = 60;
                this.height = 30;
                this.movePattern = 'straight';
                break;
        }
    }
    
    setupVisuals() {
        const colors = {
            'bird': '#8B4513',     // Brown
            'bee': '#FFD700',      // Gold
            'spider': '#800080',   // Purple
            'bat': '#2F4F4F',      // Dark slate gray
            'wind': '#87CEEB'      // Sky blue
        };
        
        this.color = colors[this.type] || '#666666';
        this.secondaryColor = this.getSecondaryColor();
    }
    
    getSecondaryColor() {
        const secondaryColors = {
            'bird': '#654321',
            'bee': '#FFB347',
            'spider': '#4B0082',
            'bat': '#1C1C1C',
            'wind': '#B0E0E6'
        };
        
        return secondaryColors[this.type] || '#444444';
    }
    
    update(deltaTime) {
        if (this.hit || this.finished) {
            this.handleDestruction(deltaTime);
            return;
        }
        
        const dt = deltaTime / 16.67;
        this.movementTimer += deltaTime;
        
        // Update movement based on pattern
        this.updateMovement(dt);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Check boundaries
        this.checkBoundaries();
        
        // Apply movement
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
    
    updateMovement(dt) {
        switch (this.movePattern) {
            case 'sine':
                this.vy = Math.sin(this.movementTimer * 0.005) * this.moveSpeed;
                break;
                
            case 'zigzag':
                if (Math.floor(this.movementTimer / 1000) % 2 === 0) {
                    this.vy = -this.moveSpeed;
                } else {
                    this.vy = this.moveSpeed;
                }
                break;
                
            case 'drop':
                this.vy = this.moveSpeed;
                // Stop after max drop distance
                if (this.y - this.originalY > this.maxDropDistance) {
                    this.finished = true;
                }
                break;
                
            case 'swoop':
                // Swooping pattern - curve down then up
                const swoopPhase = (this.movementTimer / 2000) % 1;
                this.vy = Math.sin(swoopPhase * Math.PI) * this.moveSpeed - 0.5;
                break;
                
            case 'straight':
                // No additional movement changes
                break;
        }
    }
    
    updateAnimation(deltaTime) {
        this.animation.timer += deltaTime;
        
        if (this.animation.timer >= this.animation.frameRate) {
            this.animation.frame = (this.animation.frame + 1) % 4;
            this.animation.timer = 0;
        }
    }
    
    checkBoundaries() {
        // Remove obstacle if it goes too far off screen
        const margin = 100;
        
        if (this.x < -margin || 
            this.x > GAME_CONFIG.width + margin ||
            this.y > GAME_CONFIG.height + margin) {
            this.finished = true;
        }
        
        // For some obstacles, wrap around horizontally
        if (this.type === 'wind') {
            if (this.x < -this.width && this.vx < 0) {
                this.x = GAME_CONFIG.width;
            } else if (this.x > GAME_CONFIG.width && this.vx > 0) {
                this.x = -this.width;
            }
        }
    }
    
    handleDestruction(deltaTime) {
        // Add destruction animation/effects
        if (this.hit && !this.finished) {
            // Spin and fade out
            this.vx *= 0.95;
            this.vy += 0.2; // Fall down
            
            // Mark as finished after a delay
            setTimeout(() => {
                this.finished = true;
            }, 500);
        }
    }
    
    draw(ctx) {
        if (this.finished) return;
        
        ctx.save();
        
        // Apply hit effect
        if (this.hit) {
            ctx.globalAlpha = 0.5;
            ctx.translate(this.x + this.width/2, this.y + this.height/2);
            ctx.rotate(this.movementTimer * 0.1);
            ctx.translate(-this.width/2, -this.height/2);
        }
        
        // Draw obstacle based on type
        switch (this.type) {
            case 'bird':
                this.drawBird(ctx);
                break;
            case 'bee':
                this.drawBee(ctx);
                break;
            case 'spider':
                this.drawSpider(ctx);
                break;
            case 'bat':
                this.drawBat(ctx);
                break;
            case 'wind':
                this.drawWind(ctx);
                break;
            default:
                this.drawGeneric(ctx);
        }
        
        ctx.restore();
    }
    
    drawBird(ctx) {
        const x = this.hit ? 0 : this.x;
        const y = this.hit ? 0 : this.y;
        
        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 8, y + 8, 12, 8);
        
        // Head
        ctx.beginPath();
        ctx.arc(x + 6, y + 10, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Wings (animated)
        ctx.fillStyle = this.secondaryColor;
        const wingFlap = Math.sin(this.movementTimer * 0.02) * 3;
        
        // Left wing
        ctx.beginPath();
        ctx.ellipse(x + 8, y + 12, 6, 3 + wingFlap, Math.PI * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Right wing
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 12, 6, 3 + wingFlap, -Math.PI * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // Eye
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x + 4, y + 8, 1, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawBee(ctx) {
        const x = this.hit ? 0 : this.x;
        const y = this.hit ? 0 : this.y;
        
        // Body with stripes
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 6, y + 8, 12, 8);
        
        // Black stripes
        ctx.fillStyle = 'black';
        ctx.fillRect(x + 8, y + 8, 2, 8);
        ctx.fillRect(x + 12, y + 8, 2, 8);
        ctx.fillRect(x + 16, y + 8, 2, 8);
        
        // Wings (fast flapping)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const wingFlap = Math.sin(this.movementTimer * 0.05) * 2;
        
        ctx.beginPath();
        ctx.ellipse(x + 8, y + 6, 4, 2 + wingFlap, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.beginPath();
        ctx.ellipse(x + 16, y + 6, 4, 2 + wingFlap, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Stinger
        ctx.fillStyle = 'gray';
        ctx.fillRect(x + 18, y + 11, 3, 2);
    }
    
    drawSpider(ctx) {
        const x = this.hit ? 0 : this.x;
        const y = this.hit ? 0 : this.y;
        
        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + 12, y + 12, 6, 0, Math.PI * 2);
        ctx.fill();
        
        // Smaller abdomen
        ctx.beginPath();
        ctx.arc(x + 12, y + 8, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Legs
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 4) * Math.PI - Math.PI / 2;
            const legLength = 8;
            const legBend = Math.sin(this.movementTimer * 0.01 + i) * 2;
            
            ctx.beginPath();
            ctx.moveTo(x + 12, y + 12);
            ctx.lineTo(
                x + 12 + Math.cos(angle) * (legLength + legBend),
                y + 12 + Math.sin(angle) * (legLength + legBend)
            );
            ctx.stroke();
        }
        
        // Web string (if dropping)
        if (this.movePattern === 'drop') {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 12, y);
            ctx.lineTo(x + 12, this.originalY);
            ctx.stroke();
        }
    }
    
    drawBat(ctx) {
        const x = this.hit ? 0 : this.x;
        const y = this.hit ? 0 : this.y;
        
        // Body
        ctx.fillStyle = this.color;
        ctx.fillRect(x + 10, y + 10, 8, 6);
        
        // Head
        ctx.beginPath();
        ctx.arc(x + 14, y + 8, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Ears
        ctx.beginPath();
        ctx.moveTo(x + 11, y + 6);
        ctx.lineTo(x + 12, y + 3);
        ctx.lineTo(x + 13, y + 6);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 6);
        ctx.lineTo(x + 16, y + 3);
        ctx.lineTo(x + 17, y + 6);
        ctx.fill();
        
        // Wings (large, animated)
        const wingSpread = Math.sin(this.movementTimer * 0.03) * 5 + 10;
        
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 12);
        ctx.lineTo(x + 10 - wingSpread, y + 8);
        ctx.lineTo(x + 10 - wingSpread/2, y + 16);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(x + 18, y + 12);
        ctx.lineTo(x + 18 + wingSpread, y + 8);
        ctx.lineTo(x + 18 + wingSpread/2, y + 16);
        ctx.closePath();
        ctx.fill();
    }
    
    drawWind(ctx) {
        const x = this.hit ? 0 : this.x;
        const y = this.hit ? 0 : this.y;
        
        // Wind lines with motion
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.6;
        
        const offset = (this.movementTimer * 0.1) % 20;
        
        for (let i = 0; i < 3; i++) {
            const lineY = y + i * 10 + 5;
            const waveOffset = Math.sin(this.movementTimer * 0.005 + i) * 3;
            
            ctx.beginPath();
            ctx.moveTo(x - offset, lineY + waveOffset);
            ctx.lineTo(x + this.width - offset, lineY + waveOffset);
            ctx.stroke();
        }
        
        // Wind particles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (let i = 0; i < 5; i++) {
            const particleX = x + (i * 12) + offset;
            const particleY = y + 15 + Math.sin(this.movementTimer * 0.008 + i) * 5;
            
            ctx.beginPath();
            ctx.arc(particleX % (this.width + 20), particleY, 1, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    drawGeneric(ctx) {
        const x = this.hit ? 0 : this.x;
        const y = this.hit ? 0 : this.y;
        
        // Simple enemy - spiky ball
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(x + this.width/2, y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Spikes
        ctx.strokeStyle = this.secondaryColor;
        ctx.lineWidth = 2;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const centerX = x + this.width/2;
            const centerY = y + this.height/2;
            const radius = this.width/2;
            
            ctx.beginPath();
            ctx.moveTo(
                centerX + Math.cos(angle) * radius,
                centerY + Math.sin(angle) * radius
            );
            ctx.lineTo(
                centerX + Math.cos(angle) * (radius + 4),
                centerY + Math.sin(angle) * (radius + 4)
            );
            ctx.stroke();
        }
    }
    
    // Collision detection
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
    
    collidesWith(other) {
        const bounds1 = this.getBounds();
        const bounds2 = other.getBounds ? other.getBounds() : other;
        
        return bounds1.x < bounds2.right &&
               bounds1.right > bounds2.x &&
               bounds1.y < bounds2.bottom &&
               bounds1.bottom > bounds2.y;
    }
    
    takeDamage() {
        this.health--;
        if (this.health <= 0) {
            this.hit = true;
        }
    }
    
    // Factory method for creating different obstacle types
    static createRandom(x, y) {
        const types = ['bird', 'bee', 'spider', 'bat'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        return new Obstacle({
            x: x,
            y: y,
            type: randomType
        });
    }
    
    static createWind(x, y) {
        return new Obstacle({
            x: x,
            y: y,
            type: 'wind'
        });
    }
}
