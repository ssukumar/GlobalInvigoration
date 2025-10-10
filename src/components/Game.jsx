import React, { useState, useEffect, useRef } from 'react';
import { RawMovementTracker, RewardTracker, saveParticipantTrial, saveParticipantSession } from '../firebase/dataCollection';
import { getRandomRoundDuration, getRandomKeySequence, GAME_CONFIG, getRewardSequence } from '../config/gameConfig';
import './game/Game.css';

const Game = ({ participantData, participantId, onGameComplete }) => {
  const [gameActive, setGameActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(8); // Will be set to random duration when game starts
  const [score, setScore] = useState(0);
  const [lastClicked, setLastClicked] = useState(null);
  const [gamePhase, setGamePhase] = useState('reaching'); // 'reaching' or 'coin'
  const [coinVisible, setCoinVisible] = useState(false);
  const [totalCoinsCollected, setTotalCoinsCollected] = useState(0);
  const [canvasSize, setCanvasSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [showSpeedWarning, setShowSpeedWarning] = useState(false);
  const canvasRef = useRef(null);
  const gameCompletedRef = useRef(false);
  const speedWarningTimeout = useRef(null);
  const lastBarSwitchTime = useRef(Date.now());

  // Key sequence state
  const [keySequence, setKeySequence] = useState([]);
  const [currentKeyIndex, setCurrentKeyIndex] = useState(0);
  const [keyStates, setKeyStates] = useState([]); // Track status of each key: 'pending', 'correct', 'incorrect'

  // Reward environment state
  const [currentEnvironment, setCurrentEnvironment] = useState('poor'); // 'poor', 'break', or 'rich'
  const [environmentRound, setEnvironmentRound] = useState(1); // Round within current environment
  const [currentRewardValue, setCurrentRewardValue] = useState(0);
  const [currentRoundRewardValue, setCurrentRoundRewardValue] = useState(0); // Reward value for current round (stable during cue)
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [rewardAnimationText, setRewardAnimationText] = useState('');

  // Input method state
  const [inputMethod] = useState('key'); // Always use keyboard input for reward collection

  // Data collection state
  const [sessionStartTime] = useState(Date.now());
  const rawMovementTracker = useRef(null);
  const rewardTracker = useRef(null);
  const [trialData, setTrialData] = useState([]);
  const [trialSaveInProgress, setTrialSaveInProgress] = useState(false);
  const [currentTrialDuration, setCurrentTrialDuration] = useState(0);
  
  // New synchronized data arrays for each reach
  const [gameStateArray, setGameStateArray] = useState([]);
  const [eventArray, setEventArray] = useState([]);
  const [posXArray, setPosXArray] = useState([]);
  const [posYArray, setPosYArray] = useState([]);
  const [startWall, setStartWall] = useState(null);
  const [endWall, setEndWall] = useState(null);
  const [keytapNumberArray, setKeytapNumberArray] = useState([]);
  const [keytapValueArray, setKeytapValueArray] = useState([]);
  const [timestampArray, setTimestampArray] = useState([]);
  const [keyupTimestampArray, setKeyupTimestampArray] = useState([]);
  const [validityArray, setValidityArray] = useState([]);
  const [currentReachNumber, setCurrentReachNumber] = useState(1);
  const [lastWallPosition, setLastWallPosition] = useState(null);
  const [currentKeytapNumber, setCurrentKeytapNumber] = useState(1);
  
  // Refs for tracking event states
  const rewardCueActiveRef = useRef(false);
  const rewardCollectionActiveRef = useRef(false);

  // Helper function to append reaching data to all arrays simultaneously
  const appendReachingData = (x, y, timestamp) => {
    // Determine game state based on x position relative to bar boundaries
    let gameState;
    let currentWall;
    const { leftBar, rightBar } = getBarPositions();
    const leftBarRightEdge = leftBar.x + leftBar.width;
    const rightBarLeftEdge = rightBar.x;
    
    if (x >= leftBar.x && x <= leftBarRightEdge) {
      gameState = 'ASW'; // At Source Wall (left bar)
      currentWall = 'L';
    } else if (x >= rightBarLeftEdge && x <= rightBar.x + rightBar.width) {
      gameState = 'ATW'; // At Target Wall (right bar)
      currentWall = 'R';
    } else {
      // Check if warning is active - if so, show Warning State instead of Reach Ongoing
      // Note: Warning State (WS) and Reach Ongoing (RO) are mutually exclusive
      if (showSpeedWarning) {
        gameState = 'WS'; // Warning State - "move faster" warning is displayed
      } else {
        gameState = 'RO'; // Reach Ongoing - normal movement between bars
      }
      currentWall = 'N'; // Neither wall
    }
    
    // Wall-to-wall reach counting logic
    if (lastWallPosition && lastWallPosition !== currentWall && currentWall !== 'N') {
      // We've moved from one wall to another wall (not to neutral)
      const newReachNumber = currentReachNumber + 1;
      setCurrentReachNumber(newReachNumber);
      
      // Set the end wall for the completed reach
      setEndWall(currentWall);
      
      // Save the completed reach data
      saveReachData(newReachNumber - 1); // Save the reach that just completed
      
      // Reset arrays for the new reach
      setGameStateArray([]);
      setEventArray([]);
      setPosXArray([]);
      setPosYArray([]);
      setStartWall(currentWall); // New reach starts from this wall
      setEndWall(null);
      setKeytapNumberArray([]);
      setKeytapValueArray([]);
      setTimestampArray([]);
      setKeyupTimestampArray([]);
      setValidityArray([]);
      setCurrentReachNumber(1);
      setCurrentKeytapNumber(1);
    }
    
    // Update last wall position for next comparison
    setLastWallPosition(currentWall);
    
    // Append data to all synchronized arrays
    setGameStateArray(prev => [...prev, gameState]);
    setEventArray(prev => [...prev, 'movement']);
    setPosXArray(prev => [...prev, x]);
    setPosYArray(prev => [...prev, y]);
    setTimestampArray(prev => [...prev, timestamp]);
    
    // Set start wall on first movement if not set
    if (!startWall && currentWall !== 'N') {
      setStartWall(currentWall);
    }
  };

  // Helper function to save reach data
  const saveReachData = async (reachNumber) => {
    if (gameStateArray.length === 0) return;
    
    const reachData = {
      participantId,
      participantData,
      sessionStartTime,
      reachNumber,
      environment: currentEnvironment,
      environmentRound,
      startWall,
      endWall,
      gameStateArray,
      eventArray,
      posXArray,
      posYArray,
      timestampArray,
      completedAt: new Date().toISOString()
    };
    
    try {
      await saveParticipantTrial(participantId, reachData);
      console.log(`Reach ${reachNumber} data saved successfully`);
    } catch (error) {
      console.error(`Failed to save reach ${reachNumber} data:`, error);
    }
  };

  // Helper function to save round data (key presses)
  const saveRoundData = async () => {
    if (keytapNumberArray.length === 0) return;
    
    const roundData = {
      participantId,
      participantData,
      sessionStartTime,
      environment: currentEnvironment,
      environmentRound,
      rewardValue: currentRewardValue,
      keytapNumberArray,
      keytapValueArray,
      timestampArray,
      keyupTimestampArray,
      validityArray,
      totalPresses: keytapNumberArray.length,
      correctPresses: validityArray.filter(v => v === 'correct').length,
      averageInterKeyInterval: (() => {
        if (timestampArray.length < 2) return 0;
        const intervals = [];
        for (let i = 1; i < timestampArray.length; i++) {
          intervals.push(timestampArray[i] - timestampArray[i-1]);
        }
        return intervals.reduce((a, b) => a + b, 0) / intervals.length;
      })(),
      completedAt: new Date().toISOString()
    };
    
    try {
      await saveParticipantTrial(participantId, roundData);
      console.log(`Round ${environmentRound} data saved successfully`);
    } catch (error) {
      console.error(`Failed to save round ${environmentRound} data:`, error);
    }
  };

  // Bar dimensions and positions - copied from working practice mode
  const getBarPositions = () => {
    const barWidth = canvasSize.width * 0.1;
    const barHeight = canvasSize.height;
    
    return {
      leftBar: {
        x: 0,
        y: 0,
        width: barWidth,
        height: barHeight
      },
      rightBar: {
        x: canvasSize.width - barWidth,
        y: 0,
        width: barWidth,
        height: barHeight
      },
      coinPosition: {
        x: canvasSize.width / 2,
        y: canvasSize.height / 2 - 120
      },
      coinRadius: Math.max(Math.min(canvasSize.width, canvasSize.height) * 0.12, 30) // Minimum 30px radius
    };
  };

  // Function to draw coin pile based on reward value
  const drawCoinPile = (ctx, rewardValue, coinPosition) => {
    let numCoins, baseWidth;
    
    if (rewardValue === 10) {
      numCoins = 1;
      baseWidth = 1;
    } else if (rewardValue === 30) {
      numCoins = 3;
      baseWidth = 2;
    } else if (rewardValue === 50) {
      numCoins = 10;
      baseWidth = 4;
    } else {
      return; // No coins for 0 reward
    }
    
    const coinRadius = 20;
    const spacing = coinRadius * 1.8; // Slight overlap
    
    // Create pyramid structure
    const pyramid = [];
    if (rewardValue === 10) {
      pyramid.push(1);
    } else if (rewardValue === 30) {
      pyramid.push(1, 2);
    } else if (rewardValue === 50) {
      pyramid.push(1, 2, 3, 4);
    }
    
    let coinIndex = 0;
    for (let row = 0; row < pyramid.length; row++) {
      const coinsInRow = pyramid[row];
      const rowWidth = coinsInRow * spacing;
      const startX = coinPosition.x - (rowWidth - spacing) / 2;
      
      for (let col = 0; col < coinsInRow; col++) {
        if (coinIndex >= numCoins) break;
        
        const x = startX + col * spacing;
        const y = coinPosition.y + row * spacing * 0.8;
        
        // Draw coin
        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(x, y, coinRadius, 0, 2 * Math.PI);
        ctx.fill();
        
        // Add coin border
        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        coinIndex++;
      }
    }
    
    // Calculate pile height for positioning
    const pileHeight = pyramid.length * spacing * 0.8;
    
    // Draw reward value text below coins
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px "Orbitron", "Courier New", monospace';
    ctx.textAlign = 'center';
    
    let textSpacing;
    if (rewardValue === 10) {
      textSpacing = 10;
    } else if (rewardValue === 30) {
      textSpacing = 15;
    } else {
      textSpacing = 25;
    }
    
    ctx.fillText(`${rewardValue} points`, coinPosition.x, coinPosition.y + pileHeight + textSpacing);
    
    return pileHeight;
  };

  // Initialize game
  useEffect(() => {
    const handleResize = () => {
      setCanvasSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize game when component mounts - copied from working Game2.jsx
  useEffect(() => {
    // Wait a bit for participantId to be available if it's not yet set
    if (!participantId) {
      const timer = setTimeout(() => {
        startGame();
      }, 100);
      return () => clearTimeout(timer);
    } else {
      startGame();
    }
  }, [participantId]);

  // Start game
  const startGame = () => {
    setGameActive(true);
    setScore(0);
    setEnvironmentRound(1);
    setCurrentEnvironment('poor');
    setGamePhase('reaching');
    setCoinVisible(false);
    setLastClicked(null);
    setShowSpeedWarning(false);
    gameCompletedRef.current = false;
    
    // Reset data collection arrays
    setGameStateArray([]);
    setEventArray([]);
    setPosXArray([]);
    setPosYArray([]);
    setStartWall(null);
    setEndWall(null);
    setKeytapNumberArray([]);
    setKeytapValueArray([]);
    setTimestampArray([]);
    setKeyupTimestampArray([]);
    setValidityArray([]);
    setCurrentReachNumber(1);
    setLastWallPosition(null);
    setCurrentKeytapNumber(1);
    
    // Get random round duration and key sequence
    const roundDuration = getRandomRoundDuration('poor');
    const sequence = getRandomKeySequence();
    
    setTimeLeft(roundDuration);
    setKeySequence(sequence);
    setKeyStates(new Array(sequence.length).fill('pending'));
    
    // Set the reward value for the first round
    setRoundRewardValue('poor', 1);
    
    // Initialize trackers with fallback - copied from working Game2.jsx
    if (participantId) {
      rawMovementTracker.current = new RawMovementTracker(participantId);
      rewardTracker.current = new RewardTracker(participantId);
    } else {
      // Create trackers with a temporary ID if none available
      const tempId = 'temp_' + Date.now();
      rawMovementTracker.current = new RawMovementTracker(tempId);
      rewardTracker.current = new RewardTracker(tempId);
    }
    
    console.log('Game started with:', { roundDuration, sequence });
  };

  // Helper function to calculate and set the reward value for current round
  const setRoundRewardValue = (environment, round) => {
    const rewardSequence = getRewardSequence(environment);
    const rewardIndex = (round - 1) % rewardSequence.length;
    const rewardValue = rewardSequence[rewardIndex];
    setCurrentRoundRewardValue(rewardValue);
    console.log(`Round ${round} reward value set to: ${rewardValue}`);
  };

  // Handle environment switch
  const handleContinueToRich = () => {
    setCurrentEnvironment('rich');
    setEnvironmentRound(1);
    setGamePhase('reaching');
    setCoinVisible(false);
    setLastClicked(null);
    setShowSpeedWarning(false);
    
    // Reset data collection arrays for new environment
    setGameStateArray([]);
    setEventArray([]);
    setPosXArray([]);
    setPosYArray([]);
    setStartWall(null);
    setEndWall(null);
    setKeytapNumberArray([]);
    setKeytapValueArray([]);
    setTimestampArray([]);
    setKeyupTimestampArray([]);
    setValidityArray([]);
    setCurrentReachNumber(1);
    setLastWallPosition(null);
    setCurrentKeytapNumber(1);
    
    // Get random round duration and key sequence for rich environment
    const roundDuration = getRandomRoundDuration('rich');
    const sequence = getRandomKeySequence();
    
    setTimeLeft(roundDuration);
    setKeySequence(sequence);
    setKeyStates(new Array(sequence.length).fill('pending'));
    
    // Set the reward value for the first rich environment round
    setRoundRewardValue('rich', 1);
    
    // Initialize trackers for rich environment - copied from working Game2.jsx
    if (participantId) {
      rawMovementTracker.current = new RawMovementTracker(participantId);
      rewardTracker.current = new RewardTracker(participantId);
    } else {
      // Create trackers with a temporary ID if none available
      const tempId = 'temp_' + Date.now();
      rawMovementTracker.current = new RawMovementTracker(tempId);
      rewardTracker.current = new RewardTracker(tempId);
    }
    
    console.log('Switched to rich environment:', { roundDuration, sequence });
  };

  // Handle key press during reward collection
  const handleKeyPress = (event) => {
    if (!gameActive || gamePhase !== 'coin' || !coinVisible) return;
    
    const key = event.key.toLowerCase();
    const validKeys = ['a', 's', 'd', 'f'];
    
    if (!validKeys.includes(key)) return;
    
    // Add safety check for keySequence
    if (keySequence.length === 0 || currentKeyIndex >= keySequence.length) return;
    
    const timestamp = Date.now();
    const expectedKey = keySequence[currentKeyIndex];
    const isValid = key === expectedKey;
    
    // Update key states
    const newKeyStates = [...keyStates];
    newKeyStates[currentKeyIndex] = isValid ? 'correct' : 'incorrect';
    setKeyStates(newKeyStates);
    
    // Record key press data
    setKeytapNumberArray(prev => [...prev, currentKeyIndex + 1]);
    setKeytapValueArray(prev => [...prev, currentRewardValue]);
    setTimestampArray(prev => [...prev, timestamp]);
    setValidityArray(prev => [...prev, isValid ? 'correct' : 'incorrect']);
    
    if (isValid) {
      // Correct key pressed
      setScore(prev => prev + currentRewardValue);
      setTotalCoinsCollected(prev => prev + 1);
      
      // Move to next key
      const nextIndex = currentKeyIndex + 1;
      if (nextIndex < keySequence.length) {
        setCurrentKeyIndex(nextIndex);
        setShowRewardAnimation(true);
        setRewardAnimationText(`+${currentRewardValue}!`);
        
        setTimeout(() => {
          setShowRewardAnimation(false);
        }, 1000);
      } else {
        // Round completed
        setGamePhase('reaching');
        setCoinVisible(false);
        setCurrentKeyIndex(0);
        setKeyStates(new Array(keySequence.length).fill('pending'));
        
        // Save round data
        saveRoundData();
        
        // Move to next round
        const nextRound = environmentRound + 1;
        setEnvironmentRound(nextRound);
        
        if (currentEnvironment === 'poor' && nextRound > GAME_CONFIG.BLOCKS.POOR_ROUNDS) {
          // Switch to break
          setGamePhase('break');
        } else if (currentEnvironment === 'rich' && nextRound > GAME_CONFIG.BLOCKS.RICH_ROUNDS) {
          // Game completed
          setGameActive(false);
          gameCompletedRef.current = true;
        } else {
          // Continue with next round
          const roundDuration = getRandomRoundDuration(currentEnvironment);
          const sequence = getRandomKeySequence();
          
          setTimeLeft(roundDuration);
          setKeySequence(sequence);
          setKeyStates(new Array(sequence.length).fill('pending'));
          
          // Set the reward value for the next round
          setRoundRewardValue(currentEnvironment, nextRound);
        }
      }
    } else {
      // Incorrect key pressed
      setShowRewardAnimation(true);
      setRewardAnimationText('Wrong key!');
      
      setTimeout(() => {
        setShowRewardAnimation(false);
      }, 1000);
    }
  };

  // Handle key up for timing
  const handleKeyUp = (event) => {
    if (!gameActive || gamePhase !== 'coin' || !coinVisible) return;
    
    const key = event.key.toLowerCase();
    const validKeys = ['a', 's', 'd', 'f'];
    
    if (!validKeys.includes(key)) return;
    
    // Add safety check for keySequence
    if (keySequence.length === 0 || currentKeyIndex >= keySequence.length) return;
    
    const timestamp = Date.now();
    setKeyupTimestampArray(prev => [...prev, timestamp]);
  };

  // Timer effect
  useEffect(() => {
    if (!gameActive || gamePhase !== 'reaching') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up, show reward
          setGamePhase('coin');
          setCoinVisible(true);
          
          // Get reward value from sequence
          const rewardSequence = getRewardSequence(currentEnvironment);
          const rewardIndex = (environmentRound - 1) % rewardSequence.length;
          const rewardValue = rewardSequence[rewardIndex];
          
          setCurrentRewardValue(rewardValue);
          
          // Reset key sequence state
          setCurrentKeyIndex(0);
          setKeyStates(new Array(keySequence.length).fill('pending'));
          
          // Reset key press arrays for new round
          setKeytapNumberArray([]);
          setKeytapValueArray([]);
          setTimestampArray([]);
          setKeyupTimestampArray([]);
          setValidityArray([]);
          setCurrentKeytapNumber(1);
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [gameActive, gamePhase, environmentRound, currentEnvironment, keySequence.length]);

  // Start reward tracking when key sequence is generated - copied from working Game2.jsx
  useEffect(() => {
    if (gamePhase === 'coin' && keySequence.length > 0 && rewardTracker.current) {
      console.log('Starting reward tracking for sequence:', keySequence);
      
      const trialInfo = {
        environment: currentEnvironment,
        environmentRound: environmentRound,
        expectedReward: currentRewardValue
      };
      rewardTracker.current.startTracking(trialInfo, keySequence);
      console.log('Reward tracking started successfully');
    }
  }, [keySequence, gamePhase, currentEnvironment, environmentRound, currentRewardValue]);

  // Add event listeners
  useEffect(() => {
    if (gameActive) {
      window.addEventListener('keydown', handleKeyPress);
      window.addEventListener('keyup', handleKeyUp);
    }
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameActive, gamePhase, coinVisible, keySequence, currentKeyIndex, keyStates, currentEnvironment, currentRewardValue, participantId, participantData, sessionStartTime, trialData, onGameComplete]);

  // Reset data collection arrays when starting new trial
  useEffect(() => {
    if (gamePhase === 'reaching') {
      // Reset all synchronized arrays for new round
      setGameStateArray([]);
      setEventArray([]);
      setPosXArray([]);
      setPosYArray([]);
      setStartWall(null);
      setEndWall(null);
      setKeytapNumberArray([]);
      setKeytapValueArray([]);
      setTimestampArray([]);
      setKeyupTimestampArray([]);
      setValidityArray([]);

      setCurrentReachNumber(1);
      setLastWallPosition(null);
      setCurrentKeytapNumber(1);
      
      // Reset event state refs
      rewardCueActiveRef.current = false;
      rewardCollectionActiveRef.current = false;
      
      // Start raw movement tracking when reaching phase begins - copied from working Game2.jsx
      if (rawMovementTracker.current) {
        const { leftBar, rightBar } = getBarPositions();
        const trialInfo = {
          environment: currentEnvironment,
          environmentRound: environmentRound,
          expectedReward: currentRewardValue
        };
        // Start tracking with bar positions for context
        rawMovementTracker.current.startTracking(trialInfo, { 
          left: leftBar, 
          right: rightBar 
        });
        console.log('Raw movement tracking started successfully');
      }
      
      console.log('Data collection arrays reset for new trial');
    }
  }, [gamePhase, currentEnvironment, environmentRound, currentRewardValue]);

  // Handle cursor visibility based on game phase
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Remove existing cursor classes
    canvas.classList.remove('cursor-visible', 'cursor-hidden');

    if (gamePhase === 'coin') {
      // Hide cursor during reward collection
      canvas.classList.add('cursor-hidden');
    } else {
      // Show yellow circle cursor during reaching phase
      canvas.classList.add('cursor-visible');
    }
  }, [gamePhase]);

  // Set initial cursor class when component mounts - copied from working practice mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Start with visible cursor since game starts in 'reaching' phase
      canvas.classList.add('cursor-visible');
    }
  }, []);

  // Handle mouse movement for bar hover detection - copied from working Game2.jsx
  const handleMouseMove = (event) => {
    if (!gameActive || gamePhase !== 'reaching') return; // Only track during reaching phase

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Get current bar positions
    const { leftBar, rightBar } = getBarPositions();

    // Record movement data during reaching phase
    let currentBar = null;
    if (x >= leftBar.x && x <= leftBar.x + leftBar.width &&
        y >= leftBar.y && y <= leftBar.y + leftBar.height) {
      currentBar = 'left';
    } else if (x >= rightBar.x && x <= rightBar.x + rightBar.width &&
               y >= rightBar.y && y <= rightBar.y + rightBar.height) {
      currentBar = 'right';
    }
    
    // Add debugging for movement tracking
    if (rawMovementTracker.current && rawMovementTracker.current.isTracking) {
      rawMovementTracker.current.recordMovement(x, y, currentBar);
    }

    // Bar hover logic (no points, just visual feedback)
    if (
      x >= leftBar.x && x <= leftBar.x + leftBar.width &&
      y >= leftBar.y && y <= leftBar.y + leftBar.height
    ) {
      if (lastClicked !== 'left') {
        setLastClicked('left');
        lastBarSwitchTime.current = Date.now();
        // Clear any existing warning when switching bars
        setShowSpeedWarning(false);
        if (speedWarningTimeout.current) {
          clearTimeout(speedWarningTimeout.current);
        }
        // Set warning to appear after 2 seconds on this bar - copied from working Game2.jsx
        speedWarningTimeout.current = setTimeout(() => {
          setShowSpeedWarning(true);
        }, 2000);
      }
    } else if (
      x >= rightBar.x && x <= rightBar.x + rightBar.width &&
      y >= rightBar.y && y <= rightBar.y + rightBar.height
    ) {
      if (lastClicked !== 'right') {
        setLastClicked('right');
        lastBarSwitchTime.current = Date.now();
        // Clear any existing warning when switching bars
        setShowSpeedWarning(false);
        if (speedWarningTimeout.current) {
          clearTimeout(speedWarningTimeout.current);
        }
        // Set warning to appear after 2 seconds on this bar - copied from working Game2.jsx
        speedWarningTimeout.current = setTimeout(() => {
          setShowSpeedWarning(true);
        }, 2000);
      }
    } else {
      // Not hovering over any bar
      setLastClicked(null);
      setShowSpeedWarning(false);
      if (speedWarningTimeout.current) {
        clearTimeout(speedWarningTimeout.current);
      }
    }
  };

  // Main render effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Draw background - copied from working practice mode
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Get current bar and coin positions
    const { leftBar, rightBar, coinPosition, coinRadius } = getBarPositions();

    if (gamePhase === 'reaching') {
      // Draw bars - copied from working practice mode
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

      // Draw score
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, canvasSize.width / 2, 100);

      // Draw key sequence
      const sequenceY = coinPosition.y + 120 + 80;
      ctx.font = '24px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      
      // Add safety check for keySequence
      if (keySequence.length > 0) {
        keySequence.forEach((key, index) => {
          let color = '#FFFFFF';
          if (index < currentKeyIndex) {
            color = '#00FF00'; // Completed
          } else if (index === currentKeyIndex) {
            color = '#FFFF00'; // Current
          }
          
          ctx.fillStyle = color;
          ctx.fillText(key.toUpperCase(), canvasSize.width / 2 + (index - keySequence.length / 2) * 40, sequenceY);
        });
      }

      // Draw speed warning if active
      if (showSpeedWarning) {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 32px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MOVE FASTER!', canvasSize.width / 2, canvasSize.height / 2 + 200);
      }

      // Draw gray circle with reward value when 3 seconds or less remain
      if (timeLeft <= 3) {
        // Use the stable reward value for this round
        const rewardValue = currentRoundRewardValue;
        
        // Draw gray circle at coin position
        ctx.beginPath();
        ctx.arc(coinPosition.x, coinPosition.y, coinRadius, 0, 2 * Math.PI); // Use dynamic radius
        ctx.fillStyle = '#808080'; // Gray color
        ctx.fill();
        ctx.strokeStyle = '#606060'; // Darker gray border
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Draw reward value in the center of the circle
        ctx.fillStyle = '#ffffff'; // White text
        ctx.font = `bold ${coinRadius * 0.6}px "Arial", sans-serif`; // Slightly smaller font for numbers
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rewardValue.toString(), coinPosition.x, coinPosition.y);
      }

    } else if (gamePhase === 'coin') {
      // Draw background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw score
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 48px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Score: ${score}`, canvasSize.width / 2, 100);

      // Draw coin pile
      const pileHeight = drawCoinPile(ctx, currentRewardValue, coinPosition);

      // Draw key sequence
      const sequenceY = pileHeight + 120;
      ctx.font = '24px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      
      // Add safety check for keySequence
      if (keySequence.length > 0) {
        keySequence.forEach((key, index) => {
          let color = '#FFFFFF';
          if (index < currentKeyIndex) {
            color = '#00FF00'; // Completed
          } else if (index === currentKeyIndex) {
            color = '#FFFF00'; // Current
          }
          
          ctx.fillStyle = color;
          ctx.fillText(key.toUpperCase(), canvasSize.width / 2 + (index - keySequence.length / 2) * 40, sequenceY);
        });
      }

      // Draw "Press:" text
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px "Press Start 2P", "Courier New", monospace';
      ctx.textAlign = 'center';
      // Add safety check for keySequence and currentKeyIndex
      if (keySequence.length > 0 && currentKeyIndex < keySequence.length) {
        ctx.fillText(`Press: ${keySequence[currentKeyIndex].toUpperCase()}`, canvasSize.width / 2, sequenceY + 40);
      }

      // Draw reward animation if active
      if (showRewardAnimation) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 36px "Orbitron", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(rewardAnimationText, canvasSize.width / 2, canvasSize.height / 2 - 100);
      }
    } else if (gamePhase === 'break') {
      // Break screen between environments
      console.log('Rendering break screen');
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);
      
      // Block completed message
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 32px "Orbitron", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Block 1 Complete!', canvasSize.width / 2, canvasSize.height / 2 - 100);
      
      ctx.font = '20px "Orbitron", "Courier New", monospace';
      ctx.fillText('Take a short break.', canvasSize.width / 2, canvasSize.height / 2 - 40);
      ctx.fillText('Press SPACE to continue to Block 2', canvasSize.width / 2, canvasSize.height / 2 + 40);
      
      // Show current score
      ctx.font = 'bold 24px "Orbitron", "Courier New", monospace';
      ctx.fillText(`Current Score: ${score}`, canvasSize.width / 2, canvasSize.height / 2 + 100);
    } else {
      // Debug state
      ctx.fillStyle = '#ff0000';
      ctx.font = 'bold 24px "Arial", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`DEBUG: Invalid game state`, canvasSize.width / 2, canvasSize.height / 2 - 50);
      ctx.fillText(`gamePhase: ${gamePhase}`, canvasSize.width / 2, canvasSize.height / 2);
      ctx.fillText(`gameActive: ${gameActive}`, canvasSize.width / 2, canvasSize.height / 2 + 50);
      ctx.fillText(`environment: ${currentEnvironment}`, canvasSize.width / 2, canvasSize.height / 2 + 100);
    }
  }, [timeLeft, score, lastClicked, gamePhase, coinVisible, canvasSize, 
      showSpeedWarning, showRewardAnimation, keySequence, currentKeyIndex, keyStates, currentEnvironment, 
      currentRewardValue, rewardAnimationText, gameActive, environmentRound]);

  // Handle game completion when rich environment ends
  useEffect(() => {
    // End after rich environment reaches round 21 (21 rounds completed)
    if (currentEnvironment === 'rich' && environmentRound >= 21 && !gameCompletedRef.current) {
      console.log('RICH ENVIRONMENT COMPLETE - ENDING GAME (round 21 reached)');
      console.log('Current trial data:', trialData);
      console.log('Trial data length:', trialData.length);
      
      setGameActive(false);
      setCoinVisible(false);
      setKeySequence([]);
      setKeyStates([]);
      gameCompletedRef.current = true;
      
      // Save final session data
      const comprehensiveSessionData = {
        // Session metadata
        participantId: participantId,
        participantData: participantData,
        sessionStartTime: sessionStartTime,
        sessionEndTime: Date.now(),
        sessionDuration: Date.now() - sessionStartTime,
        completedAt: new Date().toISOString(),
        
        // Game summary
        totalScore: score,
        totalCoinsCollected: totalCoinsCollected,
        
        // ALL trial data in one place
        allTrials: trialData,
        
        // Summary statistics
        summary: {
          totalTrials: trialData.length,
          poorEnvironmentTrials: trialData.filter(t => t.environment === 'poor').length,
          richEnvironmentTrials: trialData.filter(t => t.environment === 'rich').length,
          totalKeyPresses: trialData.reduce((sum, trial) => 
            sum + (trial.rewardData?.totalPresses || 0), 0),
          totalCorrectPresses: trialData.reduce((sum, trial) => 
            sum + (trial.rewardData?.correctPresses || 0), 0),
          overallAccuracy: (() => {
            const totalPresses = trialData.reduce((sum, trial) => sum + (trial.rewardData?.totalPresses || 0), 0);
            const correctPresses = trialData.reduce((sum, trial) => sum + (trial.rewardData?.correctPresses || 0), 0);
            return totalPresses > 0 ? correctPresses / totalPresses : 0;
          })(),
          averageReactionTime: (() => {
            const avgTimes = trialData.map(trial => trial.rewardData?.averageInterKeyInterval || 0).filter(t => t > 0);
            return avgTimes.length > 0 ? avgTimes.reduce((a, b) => a + b, 0) / avgTimes.length : 0;
          })()
        }
      };
      
      console.log('About to save comprehensive session data:', comprehensiveSessionData);
      
      // Clean the data to remove any undefined values
      const cleanSessionData = JSON.parse(JSON.stringify(comprehensiveSessionData));
      
      // Add detailed console output for final data
      console.log('FINAL SESSION DATA BREAKDOWN:');
      console.log('Participant Info:', cleanSessionData.participantData);
      console.log('Session Summary:', {
        totalTrials: cleanSessionData.summary.totalTrials,
        poorTrials: cleanSessionData.summary.poorEnvironmentTrials,
        richTrials: cleanSessionData.summary.richEnvironmentTrials,
        totalScore: cleanSessionData.totalScore,
        totalCoinsCollected: cleanSessionData.totalCoinsCollected
      });
      
      // Fix the trials access - use allTrials instead of trials
      console.log('All Trials:', cleanSessionData.allTrials);
      console.log('Poor Environment Trials:', cleanSessionData.allTrials.filter(t => t.environment === 'poor'));
      console.log('Rich Environment Trials:', cleanSessionData.allTrials.filter(t => t.environment === 'rich'));
      
      // Add error checking for environment summaries
      if (cleanSessionData.environmentSummaries) {
        console.log('Environment Summaries:', {
          poor: cleanSessionData.environmentSummaries.poor,
          rich: cleanSessionData.environmentSummaries.rich
        });
      } else {
        console.log('Environment summaries not available');
      }
      
      console.log('Overall Summary:', cleanSessionData.summary);
      
      // Save session under participant subcollection only
      if (participantId) {
        saveParticipantSession(participantId, cleanSessionData).then(() => {
          console.log('Session data saved, calling onGameComplete');
          onGameComplete?.(cleanSessionData);
        }).catch((error) => {
          console.error('Failed to save session data:', error);
          // Still call onGameComplete even if save fails
          onGameComplete?.(cleanSessionData);
        });
      } else {
        // Fallback if no participantId
        onGameComplete?.(cleanSessionData);
      }
    }
  }, [currentEnvironment, environmentRound, gameCompletedRef, participantId, participantData, sessionStartTime, score, totalCoinsCollected, trialData, onGameComplete]);

  // Debug state changes
  useEffect(() => {
    console.log('State changed:', {
      currentEnvironment,
      environmentRound,
      gamePhase,
      gameActive,
      trialDataLength: trialData.length
    });
  }, [currentEnvironment, environmentRound, gamePhase, gameActive, trialData.length]);

  return (
    <div className="game-container">
      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseMove={handleMouseMove}
          className="game-canvas"
          style={{ 
            width: '100vw', 
            height: '100vh', 
            display: 'block',
            backgroundColor: '#000000' // Fallback background
          }}
        />
      </div>
    </div>
  );
};

export default Game; 