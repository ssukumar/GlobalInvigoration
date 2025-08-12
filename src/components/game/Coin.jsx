import { useEffect } from 'react';

export const useCoin = ({ 
  canvasSize, 
  gameActive, 
  gamePhase, 
  coinVisible, 
  coinClicks, 
  setCoinClicks, 
  setScore, 
  currentRound, 
  totalRounds, 
  setGameActive, 
  setGamePhase, 
  setTimeLeft, 
  setCoinVisible, 
  setLastClicked, 
  setCurrentRound, 
  setTotalCoinsCollected, 
  score, 
  totalCoinsCollected, 
  onGameComplete, 
  gameCompletedRef 
}) => {
  // Coin position (center of screen)
  const coinPosition = {
    x: canvasSize.width / 2,
    y: canvasSize.height / 2
  };

  const coinRadius = Math.min(canvasSize.width, canvasSize.height) * 0.0375;

  // Handle keyboard input for coin interaction
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (!gameActive || gamePhase !== 'coin' || !coinVisible) return;
      
      if (event.key.toLowerCase() === 'a') {
        setScore(prev => prev + 2);
        setCoinClicks(prev => {
          const newClicks = prev + 1;
          if (newClicks >= 10) {
            // Coin collected, move to next round or end game
            setTotalCoinsCollected(prev => prev + 1);
            if (currentRound >= totalRounds) {
              // Game complete
              setGameActive(false);
              if (!gameCompletedRef.current) {
                gameCompletedRef.current = true;
                onGameComplete({ 
                  score: score + 20, 
                  totalCoinsCollected: totalCoinsCollected + 1,
                  totalRounds: totalRounds
                });
              }
            } else {
              // Start next round
              setCurrentRound(prev => prev + 1);
              setGamePhase('circles');
              setTimeLeft(10);
              setCoinVisible(false);
              setCoinClicks(0);
              setLastClicked(null);
            }
          }
          return newClicks;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameActive, gamePhase, coinVisible, currentRound, totalRounds, score, totalCoinsCollected, onGameComplete, setScore, setCoinClicks, setTotalCoinsCollected, setGameActive, setGamePhase, setTimeLeft, setCoinVisible, setCurrentRound, setLastClicked, gameCompletedRef]);

  // Draw coin
  const drawCoin = (ctx) => {
    if (coinVisible) {
      ctx.beginPath();
      ctx.arc(coinPosition.x, coinPosition.y, coinRadius, 0, 2 * Math.PI);
      ctx.fillStyle = '#f1c40f';
      ctx.fill();
      ctx.strokeStyle = '#f39c12';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  return {
    drawCoin,
    coinPosition,
    coinRadius
  };
};

export default Coin; 