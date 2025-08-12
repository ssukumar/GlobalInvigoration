// Game configuration constants
export const GAME_CONFIG = {
  // Bar configuration
  bar: {
    minWidth: 100,
    minHeight: 600,
    widthRatio: 0.1, // 10% of screen width
    strokeWidth: 3,
    colors: {
      active: '#27ae60',
      inactive: '#3498db',
      stroke: '#2980b9'
    }
  },
  
  // Coin configuration
  coin: {
    minRadius: 30,
    radiusRatio: 0.12, // 12% of screen size
    strokeWidth: 4,
    colors: {
      bronze: {
        center: '#CD7F32',
        mid: '#B8722C',
        edge: '#A0621E',
        border: '#8B5A1F',
        bar: '#654321'
      },
      silver: {
        center: '#C0C0C0',
        mid: '#A8A8A8',
        edge: '#909090',
        border: '#777777',
        bar: '#555555'
      },
      gold: {
        center: '#FFD700',
        mid: '#FFA500',
        edge: '#FF8C00',
        border: '#B8860B',
        bar: '#8B4513'
      },
      gray: {
        fill: '#f0f0f0',
        stroke: '#c0c0c0',
        text: '#888888'
      }
    }
  },
  
  // Font configuration
  fonts: {
    score: 'bold 24px "Orbitron", "Courier New", monospace',
    instructions: '16px "Press Start 2P", "Courier New", monospace',
    warning: 'bold 20px "Orbitron", "Courier New", monospace',
    reward: 'bold 36px "Orbitron", "Courier New", monospace',
    coin: 'bold 24px "Arial", sans-serif',
    break: 'bold 32px "Orbitron", "Courier New", monospace'
  },
  
  // Colors
  colors: {
    background: '#000000',
    text: '#ffffff',
    warning: '#FF6B6B',
    reward: '#00FF00',
    questionMark: '#808080'
  }
};

// Calculate bar dimensions based on canvas size
export const calculateBarDimensions = (canvasSize) => ({
  width: Math.max(canvasSize.width * GAME_CONFIG.bar.widthRatio, GAME_CONFIG.bar.minWidth),
  height: Math.max(canvasSize.height, GAME_CONFIG.bar.minHeight)
});

// Calculate bar positions
export const calculateBarPositions = (canvasSize, barWidth) => ({
  left: {
    x: 0,
    y: 0,
    width: barWidth,
    height: Math.max(canvasSize.height, GAME_CONFIG.bar.minHeight)
  },
  right: {
    x: Math.max(canvasSize.width - barWidth, barWidth),
    y: 0,
    width: barWidth,
    height: Math.max(canvasSize.height, GAME_CONFIG.bar.minHeight)
  }
});

// Calculate coin position and size
export const calculateCoinProperties = (canvasSize) => {
  const radius = Math.max(
    Math.min(canvasSize.width, canvasSize.height) * GAME_CONFIG.coin.radiusRatio,
    GAME_CONFIG.coin.minRadius
  );
  
  return {
    position: {
      x: Math.max(canvasSize.width / 2, 400),
      y: Math.max(canvasSize.height / 2 - 60, 200)
    },
    radius
  };
};
