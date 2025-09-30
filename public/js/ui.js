// UI management functions
class UI {
    constructor() {
        this.leaderboardUpdateInterval = 30000; // Update every 30 seconds
        this.lastLeaderboardUpdate = 0;
    }
    
    static formatTime(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    static formatHeight(height) {
        if (height >= 1000) {
            return `${(height / 1000).toFixed(1)}km`;
        }
        return `${height}m`;
    }
    
    static formatScore(score) {
        if (score >= 1000000) {
            return `${(score / 1000000).toFixed(1)}M`;
        } else if (score >= 1000) {
            return `${(score / 1000).toFixed(1)}k`;
        }
        return score.toString();
    }
    
    static updatePlayerStats(playerId, stats) {
        const elements = {
            height: document.getElementById(`${playerId}Height`),
            score: document.getElementById(`${playerId}Score`)
        };
        
        if (elements.height) {
            elements.height.textContent = UI.formatHeight(stats.height);
        }
        
        if (elements.score) {
            elements.score.textContent = UI.formatScore(stats.score);
        }
    }
    
    static showNotification(message, type = 'info', duration = 3000) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: '10000',
            transition: 'all 0.3s ease',
            transform: 'translateX(100%)'
        });
        
        // Type-specific styling
        const typeStyles = {
            info: { backgroundColor: '#3498db' },
            success: { backgroundColor: '#2ecc71' },
            warning: { backgroundColor: '#f39c12' },
            error: { backgroundColor: '#e74c3c' }
        };
        
        Object.assign(notification.style, typeStyles[type] || typeStyles.info);
        
        // Add to DOM
        document.body.appendChild(notification);
        
        // Animate in
        requestAnimationFrame(() => {
            notification.style.transform = 'translateX(0)';
        });
        
        // Remove after duration
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, duration);
    }
    
    static showGameOverModal(winner, stats) {
        // Remove existing modal if present
        const existingModal = document.getElementById('gameOverModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Create modal
        const modal = document.createElement('div');
        modal.id = 'gameOverModal';
        modal.innerHTML = `
            <div class="modal-backdrop">
                <div class="modal-content">
                    <h2>🏆 Game Over! 🏆</h2>
                    <div class="winner-announcement">${winner}</div>
                    
                    <div class="final-stats">
                        <div class="player-final-stats">
                            <h3>🔴 Player 1 (Red)</h3>
                            <div>Height: ${UI.formatHeight(stats.player1.height)}</div>
                            <div>Score: ${UI.formatScore(stats.player1.score)}</div>
                        </div>
                        
                        <div class="player-final-stats">
                            <h3>🔵 Player 2 (Blue)</h3>
                            <div>Height: ${UI.formatHeight(stats.player2.height)}</div>
                            <div>Score: ${UI.formatScore(stats.player2.score)}</div>
                        </div>
                    </div>
                    
                    <div class="modal-buttons">
                        <button onclick="game.start(); UI.closeModal()">Play Again</button>
                        <button onclick="game.showMenu(); UI.closeModal()">Main Menu</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal styles
        const style = document.createElement('style');
        style.textContent = `
            .modal-backdrop {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 10000;
                animation: fadeIn 0.3s ease;
            }
            
            .modal-content {
                background: #16213e;
                padding: 30px;
                border-radius: 15px;
                text-align: center;
                max-width: 500px;
                width: 90%;
                border: 3px solid #0f3460;
                box-shadow: 0 0 30px rgba(0, 255, 0, 0.3);
                animation: slideIn 0.3s ease;
            }
            
            .winner-announcement {
                font-size: 24px;
                color: #4ecdc4;
                font-weight: bold;
                margin: 20px 0;
                text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
            }
            
            .final-stats {
                display: flex;
                justify-content: space-around;
                margin: 20px 0;
                gap: 20px;
            }
            
            .player-final-stats {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 10px;
                flex: 1;
            }
            
            .player-final-stats h3 {
                margin: 0 0 10px 0;
                color: #ffffff;
            }
            
            .player-final-stats div {
                margin: 5px 0;
                color: #cccccc;
            }
            
            .modal-buttons {
                margin-top: 20px;
            }
            
            .modal-buttons button {
                margin: 0 10px;
                padding: 12px 24px;
                font-size: 16px;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { 
                    opacity: 0; 
                    transform: translateY(-50px) scale(0.9); 
                }
                to { 
                    opacity: 1; 
                    transform: translateY(0) scale(1); 
                }
            }
        `;
        
        document.head.appendChild(style);
        document.body.appendChild(modal);
    }
    
    static closeModal() {
        const modal = document.getElementById('gameOverModal');
        if (modal) {
            modal.remove();
        }
    }
    
    static updateLeaderboard(leaderboardData) {
        const menuList = document.getElementById('menuLeaderboardList');
        const gameList = document.getElementById('leaderboardList');
        
        let html;
        if (leaderboardData && leaderboardData.length > 0) {
            html = leaderboardData.map((entry, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                return `
                    <div class="leaderboard-entry">
                        ${medal} ${index + 1}. 
                        Height: ${UI.formatHeight(entry.max_height)} | 
                        Score: ${UI.formatScore(entry.total_score)}
                    </div>
                `;
            }).join('');
        } else {
            html = '<div class="leaderboard-empty">🎯 Be the first to reach the stratosphere!</div>';
        }
        
        if (menuList) menuList.innerHTML = html;
        if (gameList) gameList.innerHTML = html;
    }
    
    static showConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus') || 
                            UI.createConnectionStatus();
        
        statusElement.textContent = connected ? '🟢 Connected' : '🔴 Disconnected';
        statusElement.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
    }
    
    static createConnectionStatus() {
        const status = document.createElement('div');
        status.id = 'connectionStatus';
        status.className = 'connection-status';
        
        Object.assign(status.style, {
            position: 'fixed',
            top: '10px',
            left: '10px',
            padding: '5px 10px',
            borderRadius: '15px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: '1000',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white'
        });
        
        document.body.appendChild(status);
        return status;
    }
    
    static showControls() {
        const controlsHtml = `
            <div class="controls-help">
                <h3>🎮 Game Controls</h3>
                <div class="control-row">
                    <div class="player-controls">
                        <h4>🔴 Player 1</h4>
                        <div>W - Jump</div>
                        <div>A - Move Left</div>
                        <div>D - Move Right</div>
                        <div>Space - Attack</div>
                    </div>
                    <div class="player-controls">
                        <h4>🔵 Player 2</h4>
                        <div>↑ - Jump</div>
                        <div>← - Move Left</div>
                        <div>→ - Move Right</div>
                        <div>Enter - Attack</div>
                    </div>
                </div>
                <div class="game-tips">
                    <h4>🌟 Game Tips</h4>
                    <div>• Keep jumping higher to avoid disintegrating platforms</div>
                    <div>• Use attacks to knock opponents off platforms</div>
                    <div>• Watch out for flying obstacles!</div>
                    <div>• Gold platforms make you bounce higher</div>
                    <div>• Red platforms will crumble when stepped on</div>
                </div>
            </div>
        `;
        
        return controlsHtml;
    }
    
    static addProgressBar(container, progress, label) {
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar-container';
        progressBar.innerHTML = `
            <div class="progress-label">${label}</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
            <div class="progress-percent">${Math.round(progress)}%</div>
        `;
        
        const style = document.createElement('style');
        style.textContent = `
            .progress-bar-container {
                margin: 10px 0;
                font-size: 14px;
            }
            
            .progress-bar {
                width: 100%;
                height: 20px;
                background: rgba(255, 255, 255, 0.1);
                border-radius: 10px;
                overflow: hidden;
                margin: 5px 0;
            }
            
            .progress-fill {
                height: 100%;
                background: linear-gradient(90deg, #4ecdc4, #44a08d);
                transition: width 0.3s ease;
                border-radius: 10px;
            }
            
            .progress-percent {
                text-align: right;
                font-weight: bold;
                color: #4ecdc4;
            }
        `;
        
        if (!document.getElementById('progressBarStyles')) {
            style.id = 'progressBarStyles';
            document.head.appendChild(style);
        }
        
        container.appendChild(progressBar);
        return progressBar;
    }
    
    // Keyboard shortcuts
    static setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in game
            if (game && game.gameState === 'playing') return;
            
            switch(e.code) {
                case 'Space':
                case 'Enter':
                    if (game && game.gameState === 'menu') {
                        e.preventDefault();
                        startGame();
                    }
                    break;
                    
                case 'Escape':
                    if (game) {
                        if (game.gameState === 'playing') {
                            pauseGame();
                        } else if (game.gameState === 'paused') {
                            pauseGame();
                        }
                    }
                    break;
                    
                case 'KeyM':
                    if (game && game.gameState !== 'menu') {
                        showMenu();
                    }
                    break;
            }
        });
    }
    
    // Initialize UI
    static init() {
        UI.setupKeyboardShortcuts();
        UI.showConnectionStatus(false);
        
        // Add some custom styles
        const style = document.createElement('style');
        style.textContent = `
            .leaderboard-entry {
                padding: 5px;
                margin: 2px 0;
                background: rgba(255, 255, 255, 0.05);
                border-radius: 4px;
                font-size: 14px;
            }
            
            .leaderboard-empty {
                font-style: italic;
                color: #888;
                padding: 20px;
            }
            
            .connection-status.connected {
                color: #2ecc71;
            }
            
            .connection-status.disconnected {
                color: #e74c3c;
            }
            
            .notification {
                max-width: 300px;
                word-wrap: break-word;
            }
            
            .controls-help {
                text-align: left;
                margin: 20px 0;
            }
            
            .control-row {
                display: flex;
                gap: 30px;
                margin: 15px 0;
            }
            
            .player-controls {
                flex: 1;
                background: rgba(255, 255, 255, 0.05);
                padding: 15px;
                border-radius: 8px;
            }
            
            .player-controls h4 {
                margin-top: 0;
                color: #4ecdc4;
            }
            
            .player-controls div {
                margin: 5px 0;
                font-size: 13px;
            }
            
            .game-tips {
                margin-top: 20px;
                background: rgba(255, 255, 0, 0.1);
                padding: 15px;
                border-radius: 8px;
                border-left: 4px solid #FFD700;
            }
            
            .game-tips h4 {
                margin-top: 0;
                color: #FFD700;
            }
            
            .game-tips div {
                margin: 5px 0;
                font-size: 13px;
            }
        `;
        
        document.head.appendChild(style);
    }
}

// Initialize UI when page loads
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});

// Export for global use
window.UI = UI;
