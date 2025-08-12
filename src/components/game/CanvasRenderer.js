import { GAME_CONFIG } from './gameConfig';

export class CanvasRenderer {
  constructor(ctx, canvasSize) {
    this.ctx = ctx;
    this.canvasSize = canvasSize;
  }

  // Clear canvas and draw background
  clearAndDrawBackground() {
    this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    
    // Draw background
    this.ctx.fillStyle = GAME_CONFIG.colors.background;
    this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
  }

  // Draw bars for reaching phase
  drawBars(leftBar, rightBar, lastClicked) {
    try {
      // Draw left bar
      this.ctx.beginPath();
      this.ctx.rect(leftBar.x, leftBar.y, leftBar.width, leftBar.height);
      this.ctx.fillStyle = lastClicked === 'left' ? GAME_CONFIG.bar.colors.active : GAME_CONFIG.bar.colors.inactive;
      this.ctx.fill();
      this.ctx.strokeStyle = GAME_CONFIG.bar.colors.stroke;
      this.ctx.lineWidth = GAME_CONFIG.bar.strokeWidth;
      this.ctx.stroke();

      // Draw right bar
      this.ctx.beginPath();
      this.ctx.rect(rightBar.x, rightBar.y, rightBar.width, rightBar.height);
      this.ctx.fillStyle = lastClicked === 'right' ? GAME_CONFIG.bar.colors.active : GAME_CONFIG.bar.colors.inactive;
      this.ctx.fill();
      this.ctx.strokeStyle = GAME_CONFIG.bar.colors.stroke;
      this.ctx.lineWidth = GAME_CONFIG.bar.strokeWidth;
      this.ctx.stroke();
    } catch (error) {
      console.error('Error drawing bars:', error);
    }
  }

  // Draw score display
  drawScore(score, barWidth) {
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = GAME_CONFIG.fonts.score;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Score: ${score}`, this.canvasSize.width - barWidth - 20, 50);
  }

  // Draw instructions
  drawInstructions() {
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = GAME_CONFIG.fonts.instructions;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Move your cursor back and forth between the bars!', this.canvasSize.width / 2, this.canvasSize.height - 50);
  }

  // Draw speed warning
  drawSpeedWarning() {
    this.ctx.fillStyle = GAME_CONFIG.colors.warning;
    this.ctx.font = GAME_CONFIG.fonts.warning;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Move Faster!', this.canvasSize.width / 2, this.canvasSize.height - 100);
  }

  // Draw reward animation
  drawRewardAnimation(rewardText) {
    this.ctx.fillStyle = GAME_CONFIG.colors.reward;
    this.ctx.font = GAME_CONFIG.fonts.reward;
    this.ctx.textAlign = 'center';
    this.ctx.fillText(rewardText, this.canvasSize.width / 2, this.canvasSize.height / 2 - 100);
  }

  // Draw break screen
  drawBreakScreen(score) {
    this.ctx.fillStyle = GAME_CONFIG.colors.background;
    this.ctx.fillRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    
    // Block completed message
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = GAME_CONFIG.fonts.break;
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Block 1 Complete!', this.canvasSize.width / 2, this.canvasSize.height / 2 - 100);
    
    this.ctx.font = '20px "Orbitron", "Courier New", monospace';
    this.ctx.fillText('Take a short break.', this.canvasSize.width / 2, this.canvasSize.height / 2 - 40);
    this.ctx.fillText('Press SPACE to continue to Block 2', this.canvasSize.width / 2, this.canvasSize.height / 2 + 40);
    
    // Show current score
    this.ctx.font = GAME_CONFIG.fonts.score;
    this.ctx.fillText(`Current Score: ${score}`, this.canvasSize.width / 2, this.canvasSize.height / 2 + 100);
  }

  // Draw key sequence display
  drawKeySequence(keySequence, keyStates, currentKeyIndex, coinPosition, coinRadius) {
    if (keySequence.length === 0) return;

    const keySpacing = 45;
    const sequenceStartX = coinPosition.x - (keySequence.length * keySpacing) / 2;
    const sequenceY = coinPosition.y + coinRadius + 80;
    
    this.ctx.font = 'bold 36px "Arial", sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    keySequence.forEach((key, index) => {
      const keyX = sequenceStartX + (index * keySpacing);
      
      // Determine color based on key state
      if (keyStates[index] === 'correct') {
        this.ctx.fillStyle = '#27ae60'; // Green
      } else if (keyStates[index] === 'incorrect') {
        this.ctx.fillStyle = '#e74c3c'; // Red
      } else if (index === currentKeyIndex) {
        this.ctx.fillStyle = '#f39c12'; // Orange for current key
      } else {
        this.ctx.fillStyle = '#7f8c8d'; // Grey for pending
      }
      
      this.ctx.fillText(key.toUpperCase(), keyX, sequenceY);
    });
    
    // Show current key instruction
    if (currentKeyIndex < keySequence.length) {
      this.ctx.fillStyle = '#FFD700';
      this.ctx.font = 'bold 24px "Arial", sans-serif';
      this.ctx.fillText(`Press: ${keySequence[currentKeyIndex].toUpperCase()}`, coinPosition.x, sequenceY + 60);
    }
    
    // Progress indicator
    const progressText = `${currentKeyIndex}/${keySequence.length}`;
    this.ctx.fillStyle = '#ecf0f1';
    this.ctx.font = '20px "Arial", sans-serif';
    this.ctx.fillText(progressText, coinPosition.x, sequenceY + 90);
  }

  // Draw score for coin phase
  drawCoinPhaseScore(score) {
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = GAME_CONFIG.fonts.score;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Score: ${score}`, this.canvasSize.width - 20, 50);
  }
}
