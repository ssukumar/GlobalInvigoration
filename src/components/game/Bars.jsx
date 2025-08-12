import { useState } from 'react';

export const useBars = ({ 
  canvasSize, 
  gameActive, 
  lastClicked, 
  setLastClicked, 
  setScore, 
  showSpeedWarning, 
  setShowSpeedWarning 
}) => {
  const [barTimer, setBarTimer] = useState(null);
  const [barTimerActive, setBarTimerActive] = useState(false);

  // Bar dimensions
  const barWidth = canvasSize.width * 0.1;
  const barHeight = canvasSize.height;

  // Bar positions (left and right edges)
  const leftBar = {
    x: 0,
    y: 0,
    width: barWidth,
    height: barHeight
  };
  const rightBar = {
    x: canvasSize.width - barWidth,
    y: 0,
    width: barWidth,
    height: barHeight
  };

  // Handle mouse movement for bar hover detection
  const handleMouseMove = (event) => {
    if (!gameActive) return;

    const canvas = event.target;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Bar hover logic
    if (
      x >= leftBar.x && x <= leftBar.x + leftBar.width &&
      y >= leftBar.y && y <= leftBar.y + leftBar.height
    ) {
      if (lastClicked !== 'left') {
        setScore(prev => prev + 1);
        setLastClicked('left');
        
        // Start 2-second timer for right bar
        if (!barTimerActive) {
          setBarTimerActive(true);
          setShowSpeedWarning(false);
          const timer = setTimeout(() => {
            setShowSpeedWarning(true);
            setBarTimerActive(false);
          }, 2000);
          setBarTimer(timer);
        }
      }
    } else if (
      x >= rightBar.x && x <= rightBar.x + rightBar.width &&
      y >= rightBar.y && y <= rightBar.y + rightBar.height
    ) {
      if (lastClicked !== 'right') {
        setScore(prev => prev + 1);
        setLastClicked('right');
        
        // Clear timer if they made it in time
        if (barTimerActive) {
          clearTimeout(barTimer);
          setBarTimerActive(false);
          setShowSpeedWarning(false);
        }
        
        // Start 2-second timer for left bar
        setBarTimerActive(true);
        setShowSpeedWarning(false);
        const timer = setTimeout(() => {
          setShowSpeedWarning(true);
          setBarTimerActive(false);
        }, 2000);
        setBarTimer(timer);
      }
    } else {
      // Clear timer if they're not on any bar
      if (barTimerActive) {
        clearTimeout(barTimer);
        setBarTimerActive(false);
        setShowSpeedWarning(false);
      }
    }
  };

  // Draw bars
  const drawBars = (ctx) => {
    // Draw left bar
    ctx.beginPath();
    ctx.rect(leftBar.x, leftBar.y, leftBar.width, leftBar.height);
    ctx.fillStyle = lastClicked === 'left' ? '#27ae60' : '#3498db';
    ctx.fill();
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw right bar
    ctx.beginPath();
    ctx.rect(rightBar.x, rightBar.y, rightBar.width, rightBar.height);
    ctx.fillStyle = lastClicked === 'right' ? '#27ae60' : '#3498db';
    ctx.fill();
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  return {
    handleMouseMove,
    drawBars,
    leftBar,
    rightBar
  };
}; 