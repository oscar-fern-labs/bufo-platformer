class Player {
    constructor(config) {
        this.x = config.x;
        this.y = config.y;
        this.width = 32;
        this.height = 32;
        
        this.vx = 0;
        this.vy = 0;
        
        this.color = config.color;
        this.controls = config.controls;
        this.sprites = config.sprites;
        
        this.onGround = false;
        this.canJump = true;
        this.jumpCooldown = 0;
        
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.attackDuration = 300; // milliseconds
        
        this.health = 100;
        this.score = 0;
        this.maxHeight = 400; // Starting height
        
        this.animation = {
            current: 'idle',
            frame: 0,
            timer: 0,
            frameRate: 200 // milliseconds per frame
        };
        
        this.stunned = false;
        this.stunnedTimer = 0;
        
        // Trail effect
        this.trail = [];
        this.maxTrailLength = 10;
    }
    
    update(deltaTime, keys, platforms, obstacles) {
        // Handle input if not stunned
        if (!this.stunned) {
            this.handleInput(keys);
        } else {
            this.stunnedTimer -= deltaTime;
            if (this.stunnedTimer <= 0) {
                this.stunned = false;
            }
        }
        
        // Apply physics
        this.applyPhysics(deltaTime);
        
        // Check collisions
        this.checkPlatformCollisions(platforms);
        this.checkObstacleCollisions(obstacles);
        
        // Update cooldowns
        this.updateCooldowns(deltaTime);
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update score based on height
        this.updateScore();
        
        // Update trail
        this.updateTrail();
    }
    
    handleInput(keys) {
        const speed = GAME_CONFIG.playerSpeed;
        
        // Horizontal movement
        if (keys[this.controls.left]) {
            this.vx = Math.max(this.vx - 0.5, -speed);
        } else if (keys[this.controls.right]) {
            this.vx = Math.min(this.vx + 0.5, speed);
        } else {
            this.vx *= 0.8; // Friction
        }
        
        // Jumping
        if (keys[this.controls.jump] && this.canJump && this.onGround && this.jumpCooldown <= 0) {
            this.jump();
        }
        
        // Attacking
        if (keys[this.controls.attack] && !this.isAttacking && this.attackCooldown <= 0) {
            this.attack();
        }
    }
    
    applyPhysics(deltaTime) {
        const dt = deltaTime / 16.67; // Normalize to 60fps
        
        // Apply gravity
        if (!this.onGround) {
            this.vy += GAME_CONFIG.gravity * dt;
        }
        
        // Apply velocity
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        
        // Keep player within horizontal bounds
        if (this.x < 0) {
            this.x = 0;
            this.vx = 0;
        } else if (this.x + this.width > GAME_CONFIG.width) {
            this.x = GAME_CONFIG.width - this.width;
            this.vx = 0;
        }
        
        // Reset ground flag
        this.onGround = false;
    }
    
    checkPlatformCollisions(platforms) {
        for (const platform of platforms) {
            if (this.collidesWith(platform)) {
                this.handlePlatformCollision(platform);
            }
        }
    }
    
    collidesWith(object) {
        return this.x < object.x + object.width &&
               this.x + this.width > object.x &&
               this.y < object.y + object.height &&
               this.y + this.height > object.y;
    }
    
    handlePlatformCollision(platform) {
        // Landing on top of platform
        if (this.vy > 0 && this.y < platform.y) {
            this.y = platform.y - this.height;
            this.vy = 0;
            this.onGround = true;
            this.canJump = true;
            
            // Platform specific effects
            if (platform.type === 'bouncy') {
                this.vy = GAME_CONFIG.jumpPower * 1.5;
                this.onGround = false;
                this.playSound('jump');
            } else if (platform.type === 'fragile') {
                platform.startCrumbling();
            } else if (platform.type === 'moving') {
                this.x += platform.vx || 0;
            }
        }
        // Side collisions
        else if (Math.abs(this.vy) < 2) {
            if (this.x < platform.x) {
                this.x = platform.x - this.width;
            } else {
                this.x = platform.x + platform.width;
            }
            this.vx = 0;
        }
    }
    
    checkObstacleCollisions(obstacles) {
        for (const obstacle of obstacles) {
            if (this.collidesWith(obstacle)) {
                this.handleObstacleCollision(obstacle);
            }
        }
    }
    
    handleObstacleCollision(obstacle) {
        if (obstacle.type === 'bird') {
            // Get knocked back
            this.vx = obstacle.x < this.x ? 5 : -5;
            this.vy = -3;
            this.stunned = true;
            this.stunnedTimer = 1000; // 1 second stun
            
            // Take damage
            this.health = Math.max(0, this.health - 10);
            
            obstacle.hit = true; // Mark obstacle as hit
        }
    }
    
    jump() {
        this.vy = GAME_CONFIG.jumpPower;
        this.onGround = false;
        this.canJump = false;
        this.jumpCooldown = 100; // Prevent double jumping
        
        this.animation.current = 'jump';
        this.playSound('jump');
        
        // Add jump effect
        this.addJumpEffect();
    }
    
    attack() {
        this.isAttacking = true;
        this.attackCooldown = 800; // Attack cooldown in ms
        
        this.animation.current = 'attack';
        this.playSound('attack');
        
        // Create attack hitbox
        this.createAttackHitbox();
    }
    
    createAttackHitbox() {
        const attackRange = 60;
        const attackBox = {
            x: this.x - attackRange/2,
            y: this.y - attackRange/2,
            width: this.width + attackRange,
            height: this.height + attackRange
        };
        
        // Check for other players in attack range
        // This would be handled by the game class
        return attackBox;
    }
    
    takeDamage(damage, knockbackX = 0, knockbackY = 0) {
        this.health = Math.max(0, this.health - damage);
        
        // Apply knockback
        this.vx += knockbackX;
        this.vy += knockbackY;
        
        this.stunned = true;
        this.stunnedTimer = 500; // 0.5 second stun
        
        // Visual effect
        this.addHitEffect();
    }
    
    updateCooldowns(deltaTime) {
        if (this.jumpCooldown > 0) {
            this.jumpCooldown -= deltaTime;
        }
        
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime;
            if (this.attackCooldown <= 0) {
                this.isAttacking = false;
            }
        }
    }
    
    updateAnimation(deltaTime) {
        this.animation.timer += deltaTime;
        
        // Determine current animation state
        if (this.isAttacking) {
            this.animation.current = 'attack';
        } else if (!this.onGround) {
            this.animation.current = this.vy < 0 ? 'jump' : 'fall';
        } else if (Math.abs(this.vx) > 0.5) {
            this.animation.current = 'run';
        } else {
            this.animation.current = 'idle';
        }
        
        // Update animation frame
        if (this.animation.timer >= this.animation.frameRate) {
            this.animation.frame = (this.animation.frame + 1) % 4;
            this.animation.timer = 0;
        }
    }
    
    updateScore() {
        const currentHeight = Math.max(0, 400 - this.y);
        if (currentHeight > this.maxHeight - 400) {
            const heightGain = Math.floor(currentHeight - (this.maxHeight - 400));
            this.score += heightGain;
            this.maxHeight = Math.max(this.maxHeight, this.y);
        }
    }
    
    updateTrail() {
        // Add current position to trail
        this.trail.unshift({ x: this.x + this.width/2, y: this.y + this.height/2 });
        
        // Limit trail length
        if (this.trail.length > this.maxTrailLength) {
            this.trail.pop();
        }
    }
    
    getCurrentSprite() {
        const spriteMap = {
            'idle': this.sprites.idle,
            'jump': this.sprites.jump,
            'fall': this.sprites.fall,
            'attack': this.sprites.attack,
            'run': this.sprites.idle // Use idle for running for now
        };
        
        return spriteMap[this.animation.current] || this.sprites.idle;
    }
    
    draw(ctx) {
        // Draw trail
        this.drawTrail(ctx);
        
        // Draw player shadow
        this.drawShadow(ctx);
        
        // Main sprite
        const sprite = this.getCurrentSprite();
        
        ctx.save();
        
        // Apply stun effect (flash)
        if (this.stunned && Math.floor(Date.now() / 100) % 2) {
            ctx.globalAlpha = 0.5;
        }
        
        // Flip sprite if moving left
        if (this.vx < -0.5) {
            ctx.scale(-1, 1);
            ctx.translate(-this.x - this.width, 0);
        }
        
        if (sprite && sprite.complete) {
            ctx.drawImage(sprite, this.x, this.y, this.width, this.height);
        } else {
            // Fallback colored rectangle
            ctx.fillStyle = this.color;
            ctx.fillRect(this.x, this.y, this.width, this.height);
            
            // Add simple face
            ctx.fillStyle = 'white';
            ctx.fillRect(this.x + 8, this.y + 8, 4, 4);
            ctx.fillRect(this.x + 20, this.y + 8, 4, 4);
            ctx.fillRect(this.x + 12, this.y + 20, 8, 2);
        }
        
        ctx.restore();
        
        // Draw attack indicator
        if (this.isAttacking) {
            this.drawAttackEffect(ctx);
        }
        
        // Draw health bar
        this.drawHealthBar(ctx);
    }
    
    drawTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.3;
        
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = (this.trail.length - i) / this.trail.length;
            ctx.globalAlpha = alpha * 0.3;
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        
        ctx.stroke();
        ctx.restore();
    }
    
    drawShadow(ctx) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(
            this.x + this.width/2, 
            this.y + this.height + 2,
            this.width/2, 
            4, 
            0, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
    }
    
    drawAttackEffect(ctx) {
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.7;
        
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;
        const radius = 40;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add sparkle effects
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + Date.now() * 0.01;
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    drawHealthBar(ctx) {
        if (this.health >= 100) return; // Only show if damaged
        
        const barWidth = this.width;
        const barHeight = 4;
        const barX = this.x;
        const barY = this.y - 8;
        
        ctx.save();
        
        // Background
        ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        
        // Health
        ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.fillRect(barX, barY, (barWidth * this.health) / 100, barHeight);
        
        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        ctx.restore();
    }
    
    addJumpEffect() {
        // This would add a particle effect at the jump position
        // Implementation would be in the game effects system
    }
    
    addHitEffect() {
        // This would add a hit effect
        // Implementation would be in the game effects system
    }
    
    playSound(soundName) {
        // Play sound through the game's sound system
        if (game && game.sounds && game.sounds[soundName]) {
            const sound = game.sounds[soundName].cloneNode();
            sound.play().catch(e => console.log('Sound play failed:', e));
        }
    }
    
    reset() {
        this.x = Math.random() * (GAME_CONFIG.width - this.width);
        this.y = 400;
        this.vx = 0;
        this.vy = 0;
        this.health = 100;
        this.score = 0;
        this.maxHeight = 400;
        this.stunned = false;
        this.isAttacking = false;
        this.attackCooldown = 0;
        this.jumpCooldown = 0;
        this.trail = [];
    }
}
