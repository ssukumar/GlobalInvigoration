import { GAME_CONFIG } from './gameConfig';

export class CoinRenderer {
  constructor(ctx) {
    this.ctx = ctx;
  }

  // Draw a coin based on reward value
  drawCoin(position, radius, rewardValue) {
    if (rewardValue === 0) {
      this.drawZeroCoin(position, radius);
    } else {
      this.drawRewardCoin(position, radius, rewardValue);
    }
  }

  // Draw zero reward coin (gray)
  drawZeroCoin(position, radius) {
    const { colors } = GAME_CONFIG.coin;
    
    // Draw coin body
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = colors.gray.fill;
    this.ctx.fill();
    this.ctx.strokeStyle = colors.gray.stroke;
    this.ctx.lineWidth = GAME_CONFIG.coin.strokeWidth;
    this.ctx.stroke();
    
    // Draw "0" text
    const text = '0';
    const fontSize = radius * 0.4;
    this.ctx.font = `bold ${fontSize}px "Arial", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    const charX = position.x;
    const charY = position.y - radius * 0.7;
    
    // Draw shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    this.ctx.fillText(text, charX + 1, charY + 1);
    
    // Draw main text
    this.ctx.fillStyle = colors.gray.text;
    this.ctx.fillText(text, charX, charY);
  }

  // Draw reward coin with gradient
  drawRewardCoin(position, radius, rewardValue) {
    const colors = this.getCoinColors(rewardValue);
    
    // Create gradient
    const gradient = this.ctx.createRadialGradient(
      position.x - radius * 0.3,
      position.y - radius * 0.3,
      0,
      position.x,
      position.y,
      radius
    );
    gradient.addColorStop(0, colors.center);
    gradient.addColorStop(0.7, colors.mid);
    gradient.addColorStop(1, colors.edge);
    
    // Draw coin body
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = gradient;
    this.ctx.fill();
    
    // Draw border
    this.ctx.strokeStyle = colors.border;
    this.ctx.lineWidth = GAME_CONFIG.coin.strokeWidth;
    this.ctx.stroke();
    
    // Draw center bar
    this.ctx.fillStyle = colors.bar;
    this.ctx.fillRect(
      position.x - radius * 0.1,
      position.y - radius * 0.4,
      radius * 0.2,
      radius * 0.8
    );
    
    // Draw bar border
    this.ctx.strokeStyle = colors.border;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(
      position.x - radius * 0.1,
      position.y - radius * 0.4,
      radius * 0.2,
      radius * 0.8
    );
    
    // Draw reward value text
    this.drawRewardText(position, radius, rewardValue, colors.bar);
  }

  // Draw reward value text on coin
  drawRewardText(position, radius, rewardValue, textColor) {
    const text = rewardValue.toString();
    const fontSize = radius * 0.4;
    this.ctx.font = `bold ${fontSize}px "Arial", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    if (text.length === 1) {
      // Single digit - place at top center
      const charX = position.x;
      const charY = position.y - radius * 0.7;
      
      // Draw shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillText(text, charX + 1, charY + 1);
      
      // Draw main text
      this.ctx.fillStyle = textColor;
      this.ctx.fillText(text, charX, charY);
    } else {
      // Multi-digit - curve around top
      this.drawCurvedText(position, radius, text, textColor);
    }
  }

  // Draw curved text around coin
  drawCurvedText(position, radius, text, textColor) {
    const textRadius = radius * 0.7;
    const baseSpread = 0.055;
    const charSpread = 0.025;
    const totalSpread = baseSpread + (charSpread * (text.length - 1));
    const startAngle = -Math.PI * (0.5 + totalSpread);
    const endAngle = -Math.PI * (0.5 - totalSpread);
    const angleStep = (endAngle - startAngle) / (text.length - 1);
    
    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + (angleStep * i);
      const charX = position.x + Math.cos(angle) * textRadius;
      const charY = position.y + Math.sin(angle) * textRadius;
      
      this.ctx.save();
      this.ctx.translate(charX, charY);
      this.ctx.rotate(angle + Math.PI / 2);
      
      // Draw shadow
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillText(text[i], 1, 1);
      
      // Draw main text
      this.ctx.fillStyle = textColor;
      this.ctx.fillText(text[i], 0, 0);
      
      this.ctx.restore();
    }
  }

  // Get coin colors based on reward value
  getCoinColors(rewardValue) {
    const { colors } = GAME_CONFIG.coin;
    
    if (rewardValue === 10) {
      return colors.bronze;
    } else if (rewardValue === 50) {
      return colors.silver;
    } else {
      return colors.gold; // Default for 100 or other values
    }
  }

  // Draw question mark circle (for countdown)
  drawQuestionMark(position, radius) {
    // Draw gray circle
    this.ctx.beginPath();
    this.ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
    this.ctx.fillStyle = GAME_CONFIG.colors.questionMark;
    this.ctx.fill();
    this.ctx.strokeStyle = '#606060';
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    
    // Draw question mark
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = `bold ${radius * 0.8}px "Arial", sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('?', position.x, position.y);
  }
}
