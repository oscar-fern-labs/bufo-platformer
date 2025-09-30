// Game state and configuration
const GAME_CONFIG = {
    width: 800,
    height: 600,
    gravity: 0.5,
    jumpPower: -12,
    playerSpeed: 4,
    platformSpeed: 1,
    backgroundLayers: ['swamp', 'tree', 'mountain', 'stratosphere'],
    maxHeight: 10000,
    platformDisintegrationHeight: 200
};

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.socket = io();
        
        this.gameState = 'menu'; // menu, playing, paused, gameOver
        this.gameLoop = null;
        
        this.players = {
            player1: null,
            player2: null
        };
        
        this.platforms = [];
        this.obstacles = [];
        this.effects = [];
        this.camera = { x: 0, y: 0 };
        this.backgroundOffset = 0;
        this.currentBackground = 0;
        
        this.sprites = {};
        this.sounds = {};
        
        this.keys = {};
        this.lastTime = 0;
        
        this.init();
    }
    
    async init() {
        await this.loadAssets();
        this.setupEventListeners();
        this.setupSocketEvents();
        this.initializePlayers();
        this.generateInitialPlatforms();
        this.showMenu();
    }
    
    async loadAssets() {
        // Load Bufo sprites
        const spriteNames = [
            'bigbufo_0_0.png', 'bigbufo_0_1.png', 'bigbufo_0_2.png', 'bigbufo_0_3.png',
            'bigbufo_1_0.png', 'bigbufo_1_1.png', 'bigbufo_1_2.png', 'bigbufo_1_3.png',
            'bigbufo_2_0.png', 'bigbufo_2_1.png', 'bigbufo_2_2.png', 'bigbufo_2_3.png',
            'bigbufo_3_0.png', 'bigbufo_3_1.png', 'bigbufo_3_2.png', 'bigbufo_3_3.png'
        ];
        
        for (const spriteName of spriteNames) {
            const img = new Image();
            img.src = `/assets/sprites/${spriteName}`;
            this.sprites[spriteName] = img;
        }
        
        // Load background music
        this.sounds.background = document.getElementById('backgroundMusic');
        this.sounds.jump = document.getElementById('jumpSound');
        this.sounds.attack = document.getElementById('attackSound');
        
        // Set volume levels
        if (this.sounds.background) this.sounds.background.volume = 0.3;
        if (this.sounds.jump) this.sounds.jump.volume = 0.5;
        if (this.sounds.attack) this.sounds.attack.volume = 0.4;
    }
    
    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.handleKeyPress(e);
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        // Prevent default behavior for game keys
        window.addEventListener('keydown', (e) => {
            const gameKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 
                            'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Enter'];
            if (gameKeys.includes(e.code)) {
                e.preventDefault();
            }
        });
    }
    
    handleKeyPress(e) {
        if (this.gameState !== 'playing') return;
        
        // Player 1 controls (WASD)
        if (e.code === 'Space') {
            this.players.player1.attack();
        }
        
        // Player 2 controls (Arrows)
        if (e.code === 'Enter') {
            this.players.player2.attack();
        }
    }
    
    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });
        
        this.socket.on('gameState', (state) => {
            // Handle multiplayer state updates
            this.handleMultiplayerUpdate(state);
        });
        
        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
        });
        
        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data);
        });
    }
    
    initializePlayers() {
        this.players.player1 = new Player({
            x: 200,
            y: 400,
            color: '#ff6b6b',
            controls: {
                left: 'KeyA',
                right: 'KeyD', 
                jump: 'KeyW',
                attack: 'Space'
            },
            sprites: this.getPlayerSprites(0) // Row 0 of sprite sheet
        });
        
        this.players.player2 = new Player({
            x: 500,
            y: 400,
            color: '#4ecdc4',
            controls: {
                left: 'ArrowLeft',
                right: 'ArrowRight',
                jump: 'ArrowUp', 
                attack: 'Enter'
            },
            sprites: this.getPlayerSprites(1) // Row 1 of sprite sheet
        });
    }
    
    getPlayerSprites(row) {
        return {
            idle: this.sprites[`bigbufo_${row}_0.png`],
            jump: this.sprites[`bigbufo_${row}_1.png`],
            fall: this.sprites[`bigbufo_${row}_2.png`],
            attack: this.sprites[`bigbufo_${row}_3.png`]
        };
    }
    
    generateInitialPlatforms() {
        this.platforms = [];
        
        // Ground platform
        this.platforms.push(new Platform({
            x: 0,
            y: 550,
            width: this.canvas.width,
            height: 50,
            type: 'ground'
        }));
        
        // Generate platforms going upward
        for (let i = 0; i < 100; i++) {
            const y = 500 - (i * 80) - Math.random() * 40;
            const width = 120 + Math.random() * 80;
            const x = Math.random() * (this.canvas.width - width);
            
            this.platforms.push(new Platform({
                x: x,
                y: y,
                width: width,
                height: 20,
                type: this.getPlatformType(i)
            }));
        }
        
        // Add some moving platforms
        for (let i = 10; i < 90; i += 15) {
            const y = 500 - (i * 80);
            this.platforms.push(new Platform({
                x: 100,
                y: y,
                width: 100,
                height: 20,
                type: 'moving',
                moveSpeed: 2,
                moveRange: 300
            }));
        }
    }
    
    getPlatformType(index) {
        if (index < 20) return 'normal';
        if (index < 40) return 'fragile';
        if (index < 60) return 'bouncy';
        return 'cloud';
    }
    
    generateObstacles() {
        // Add moving obstacles
        if (Math.random() < 0.02) {
            const highestPlatform = Math.min(...this.platforms.map(p => p.y));
            this.obstacles.push(new Obstacle({
                x: Math.random() * this.canvas.width,
                y: highestPlatform - 100,
                type: 'bird'
            }));
        }
        
        // Remove old obstacles
        this.obstacles = this.obstacles.filter(obstacle => 
            obstacle.y < this.camera.y + this.canvas.height + 100
        );
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        // Update players
        Object.values(this.players).forEach(player => {
            if (player) {
                player.update(deltaTime, this.keys, this.platforms, this.obstacles);
            }
        });
        
        // Update platforms
        this.platforms.forEach(platform => platform.update(deltaTime));
        
        // Update obstacles
        this.obstacles.forEach(obstacle => obstacle.update(deltaTime));
        this.generateObstacles();
        
        // Update camera to follow highest player
        this.updateCamera();
        
        // Update background based on height
        this.updateBackground();
        
        // Remove platforms that have disintegrated
        this.platforms = this.platforms.filter(platform => 
            !platform.shouldDisintegrate || platform.y > this.camera.y - GAME_CONFIG.platformDisintegrationHeight
        );
        
        // Generate new platforms as players go higher
        this.generateNewPlatforms();
        
        // Update effects
        this.effects.forEach(effect => effect.update(deltaTime));
        this.effects = this.effects.filter(effect => !effect.finished);
        
        // Check for game over conditions
        this.checkGameOver();
        
        // Send multiplayer updates
        this.sendMultiplayerUpdate();
    }
    
    updateCamera() {
        const highestPlayer = Math.min(
            this.players.player1.y,
            this.players.player2.y
        );
        
        this.camera.y = highestPlayer - this.canvas.height * 0.7;
        this.backgroundOffset += (highestPlayer - 400) * 0.001;
    }
    
    updateBackground() {
        const height = Math.abs(this.camera.y);
        
        if (height > 8000) {
            this.currentBackground = 3; // stratosphere
        } else if (height > 5000) {
            this.currentBackground = 2; // mountain
        } else if (height > 2000) {
            this.currentBackground = 1; // tree
        } else {
            this.currentBackground = 0; // swamp
        }
    }
    
    generateNewPlatforms() {
        const highestPlatform = Math.min(...this.platforms.map(p => p.y));
        const cameraTop = this.camera.y;
        
        if (highestPlatform > cameraTop - 1000) {
            const numNewPlatforms = 20;
            for (let i = 0; i < numNewPlatforms; i++) {
                const y = highestPlatform - 80 - (i * 80) - Math.random() * 40;
                const width = 120 + Math.random() * 80;
                const x = Math.random() * (this.canvas.width - width);
                
                this.platforms.push(new Platform({
                    x: x,
                    y: y,
                    width: width,
                    height: 20,
                    type: this.getPlatformType(Math.floor(-y / 80))
                }));
            }
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Save context for camera transform
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        // Draw background
        this.drawBackground();
        
        // Draw platforms
        this.platforms.forEach(platform => {
            if (this.isVisible(platform)) {
                platform.draw(this.ctx);
            }
        });
        
        // Draw obstacles  
        this.obstacles.forEach(obstacle => {
            if (this.isVisible(obstacle)) {
                obstacle.draw(this.ctx);
            }
        });
        
        // Draw players
        Object.values(this.players).forEach(player => {
            if (player) player.draw(this.ctx);
        });
        
        // Draw effects
        this.effects.forEach(effect => effect.draw(this.ctx));
        
        // Restore context
        this.ctx.restore();
        
        // Draw UI elements (not affected by camera)
        this.drawUI();
    }
    
    drawBackground() {
        const backgrounds = [
            '#4a5d23', // swamp green
            '#8B4513', // tree brown  
            '#696969', // mountain gray
            '#191970'  // stratosphere dark blue
        ];
        
        const gradient = this.ctx.createLinearGradient(0, this.camera.y, 0, this.camera.y + this.canvas.height);
        gradient.addColorStop(0, backgrounds[this.currentBackground]);
        gradient.addColorStop(1, '#87CEEB'); // sky blue
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(this.camera.x, this.camera.y, this.canvas.width, this.canvas.height);
        
        // Add parallax layers based on background type
        this.drawParallaxLayers();
    }
    
    drawParallaxLayers() {
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        
        // Draw clouds or background elements
        for (let i = 0; i < 20; i++) {
            const x = (i * 150 + this.backgroundOffset * 50) % (this.canvas.width + 100);
            const y = this.camera.y + (i * 30) % this.canvas.height;
            
            if (this.currentBackground >= 2) { // Mountains and above
                this.ctx.beginPath();
                this.ctx.arc(x, y, 15 + Math.sin(i) * 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }
    
    drawUI() {
        // Update player info
        const player1Height = Math.max(0, Math.floor((400 - this.players.player1.y) / 10));
        const player2Height = Math.max(0, Math.floor((400 - this.players.player2.y) / 10));
        
        document.getElementById('player1Height').textContent = `${player1Height}m`;
        document.getElementById('player2Height').textContent = `${player2Height}m`;
        document.getElementById('player1Score').textContent = this.players.player1.score;
        document.getElementById('player2Score').textContent = this.players.player2.score;
        
        // Update game status
        const status = this.getGameStatus();
        document.getElementById('gameStatus').textContent = status;
    }
    
    getGameStatus() {
        const height1 = Math.floor((400 - this.players.player1.y) / 10);
        const height2 = Math.floor((400 - this.players.player2.y) / 10);
        
        if (height1 > height2 + 5) return "Red Frog Leading!";
        if (height2 > height1 + 5) return "Blue Frog Leading!";
        if (Math.abs(this.camera.y) > 8000) return "Welcome to the Stratosphere!";
        if (Math.abs(this.camera.y) > 5000) return "Mountain High!";
        if (Math.abs(this.camera.y) > 2000) return "Tree Top Level!";
        return "Hopping through the Swamp!";
    }
    
    isVisible(object) {
        return object.y > this.camera.y - 100 && 
               object.y < this.camera.y + this.canvas.height + 100;
    }
    
    checkGameOver() {
        // Check if both players have fallen too far
        const fallLimit = this.camera.y + this.canvas.height + 200;
        
        if (this.players.player1.y > fallLimit && this.players.player2.y > fallLimit) {
            this.endGame();
        }
    }
    
    sendMultiplayerUpdate() {
        if (this.socket && this.gameState === 'playing') {
            const gameState = {
                players: {
                    player1: {
                        x: this.players.player1.x,
                        y: this.players.player1.y,
                        score: this.players.player1.score
                    },
                    player2: {
                        x: this.players.player2.x, 
                        y: this.players.player2.y,
                        score: this.players.player2.score
                    }
                },
                camera: this.camera
            };
            
            this.socket.emit('gameState', gameState);
        }
    }
    
    handleMultiplayerUpdate(state) {
        // Handle incoming multiplayer updates
        // This would be used for spectators or multiple game instances
    }
    
    start() {
        if (this.gameLoop) return;
        
        this.gameState = 'playing';
        
        // Start background music
        if (this.sounds.background) {
            this.sounds.background.play().catch(e => console.log('Audio autoplay prevented'));
        }
        
        // Reset game state
        this.initializePlayers();
        this.generateInitialPlatforms();
        this.obstacles = [];
        this.effects = [];
        this.camera = { x: 0, y: 0 };
        
        // Start game loop
        this.lastTime = performance.now();
        this.gameLoop = requestAnimationFrame((time) => this.loop(time));
        
        // Join multiplayer room
        this.socket.emit('joinGame', { gameType: 'platformer' });
    }
    
    loop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        if (this.gameState === 'playing') {
            this.gameLoop = requestAnimationFrame((time) => this.loop(time));
        }
    }
    
    pause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            if (this.sounds.background) this.sounds.background.pause();
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            if (this.sounds.background) this.sounds.background.play();
            this.lastTime = performance.now();
            this.gameLoop = requestAnimationFrame((time) => this.loop(time));
        }
    }
    
    endGame() {
        this.gameState = 'gameOver';
        
        if (this.sounds.background) {
            this.sounds.background.pause();
        }
        
        // Submit scores to leaderboard
        this.submitScores();
        
        // Show game over screen after delay
        setTimeout(() => {
            this.showGameOverScreen();
        }, 2000);
    }
    
    async submitScores() {
        const player1Height = Math.max(0, Math.floor((400 - this.players.player1.y) / 10));
        const player2Height = Math.max(0, Math.floor((400 - this.players.player2.y) / 10));
        
        try {
            await fetch('/api/game-complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    player1Score: this.players.player1.score,
                    player1Height: player1Height,
                    player2Score: this.players.player2.score,  
                    player2Height: player2Height,
                    gameType: 'platformer'
                })
            });
        } catch (error) {
            console.error('Failed to submit scores:', error);
        }
    }
    
    showGameOverScreen() {
        const player1Height = Math.floor((400 - this.players.player1.y) / 10);
        const player2Height = Math.floor((400 - this.players.player2.y) / 10);
        
        let winner = '';
        if (player1Height > player2Height) {
            winner = 'Player 1 (Red) Wins!';
        } else if (player2Height > player1Height) {
            winner = 'Player 2 (Blue) Wins!';
        } else {
            winner = "It's a Tie!";
        }
        
        document.getElementById('gameStatus').innerHTML = `
            <div style="color: #ff6b6b; font-size: 24px; margin: 10px 0;">
                Game Over! ${winner}
            </div>
            <div>Final Heights: Red ${player1Height}m | Blue ${player2Height}m</div>
            <button onclick="game.showMenu()" style="margin-top: 15px;">Play Again</button>
        `;
    }
    
    showMenu() {
        this.gameState = 'menu';
        
        if (this.sounds.background) {
            this.sounds.background.pause();
        }
        
        if (this.gameLoop) {
            cancelAnimationFrame(this.gameLoop);
            this.gameLoop = null;
        }
        
        document.getElementById('menuScreen').style.display = 'block';
        document.getElementById('gameScreen').style.display = 'none';
        
        // Load leaderboard
        this.loadLeaderboard();
    }
    
    showGame() {
        document.getElementById('menuScreen').style.display = 'none';
        document.getElementById('gameScreen').style.display = 'block';
    }
    
    async loadLeaderboard() {
        try {
            const response = await fetch('/api/leaderboard');
            const leaderboard = await response.json();
            
            const leaderboardHtml = leaderboard.length > 0 
                ? leaderboard.map((entry, index) => 
                    `<div>${index + 1}. Player - Height: ${entry.max_height}m, Score: ${entry.total_score}</div>`
                  ).join('')
                : '<div>No scores yet! Be the first to play!</div>';
            
            document.getElementById('menuLeaderboardList').innerHTML = leaderboardHtml;
            
            // Also update the game screen leaderboard
            if (document.getElementById('leaderboardList')) {
                document.getElementById('leaderboardList').innerHTML = leaderboardHtml;
            }
        } catch (error) {
            console.error('Failed to load leaderboard:', error);
            document.getElementById('menuLeaderboardList').innerHTML = 'Failed to load leaderboard';
        }
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new Game();
});

// Global functions for buttons
function startGame() {
    game.showGame();
    game.start();
}

function pauseGame() {
    game.pause();
    const btn = document.getElementById('pauseBtn');
    btn.textContent = game.gameState === 'paused' ? 'Resume' : 'Pause';
}

function showMenu() {
    game.showMenu();
}
