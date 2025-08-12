import { saveSubjectData, saveTrialData, saveGameData } from './config.js';

/*
 * RESEARCH DATA COLLECTION SYSTEM
 * 
 * This system collects raw movement data at high frequency (60+ Hz) for research analysis.
 * Instead of calculating metrics in real-time, we collect pure x, y, time data and let
 * researchers perform detailed analysis post-game. This approach:
 * 
 * 1. Maximizes data quality and completeness
 * 2. Eliminates real-time calculation overhead
 * 3. Provides flexibility for different analysis methods
 * 4. Ensures no data loss during gameplay
 * 
 * Data collected per movement:
 * - timestamp: absolute time (ms)
 * - relativeTime: time since trial start (ms) 
 * - x, y: raw pixel coordinates
 * - currentBar: which bar is being hovered ('left', 'right', or null)
 * - screen dimensions for context
 */

// Generate unique participant ID
export const generateParticipantId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `P_${timestamp}_${random}`;
};

// Collect system and browser information
export const collectSystemInfo = () => {
  return {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenColorDepth: window.screen.colorDepth,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Detect input device type
    hasTouch: 'ontouchstart' in window,
    maxTouchPoints: navigator.maxTouchPoints || 0,
    // Browser detection
    browser: detectBrowser(),
    os: detectOS()
  };
};

// Browser detection
const detectBrowser = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  return 'Unknown';
};

// OS detection
const detectOS = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS')) return 'iOS';
  return 'Unknown';
};

// Initialize participant session
export const initializeParticipant = async (participantData) => {
  const participantId = generateParticipantId();
  const systemInfo = collectSystemInfo();
  
  const fullParticipantData = {
    id: participantId,
    ...participantData,
    systemInfo,
    sessionStart: new Date().toISOString(),
    experimentVersion: '1.0',
    status: 'active'
  };

  try {
    await saveSubjectData(fullParticipantData);
    return participantId;
  } catch (error) {
    console.error('Failed to initialize participant:', error);
    throw error;
  }
};

// Save trial data
export const saveTrialDataPoint = async (trialData) => {
  const enhancedTrialData = {
    ...trialData,
    timestamp: new Date().toISOString(),
    sessionTimestamp: Date.now()
  };

  try {
    await saveTrialData(enhancedTrialData);
  } catch (error) {
    console.error('Failed to save trial data:', error);
  }
};

// Save complete session data
export const saveSessionData = async (sessionData) => {
  const enhancedSessionData = {
    ...sessionData,
    sessionEnd: new Date().toISOString(),
    totalDuration: Date.now() - sessionData.sessionStart
  };

  try {
    await saveGameData(enhancedSessionData);
  } catch (error) {
    console.error('Failed to save session data:', error);
    throw error;
  }
};

// Track mouse movement during bar switching phase 
export class RawMovementTracker {
  constructor(participantId) {
    this.participantId = participantId;
    this.isTracking = false;
    this.currentTrial = null;
    this.rawMovements = [];
    this.startTime = null;
    this.barPositions = null;
    this.screenDimensions = { width: window.innerWidth, height: window.innerHeight };
  }

  startTracking(trialInfo, barPositions = null) {
    this.isTracking = true;
    this.currentTrial = trialInfo;
    this.rawMovements = [];
    this.startTime = Date.now();
    this.barPositions = barPositions;
    
    // Update screen dimensions in case of resize
    this.screenDimensions = { width: window.innerWidth, height: window.innerHeight };
  }

  recordMovement(x, y, currentBar) {
    if (!this.isTracking) return;

    const timestamp = Date.now();
    const relativeTime = timestamp - this.startTime;
    
    // Simple raw data point - no calculations, just pure data
    const movementPoint = {
      timestamp: timestamp,           // Absolute timestamp
      relativeTime: relativeTime,     // Time since trial start (ms)
      x: x,                          // Raw x coordinate (pixels)
      y: y,                          // Raw y coordinate (pixels)
      currentBar: currentBar,        // 'left', 'right', or null
      screenWidth: this.screenDimensions.width,
      screenHeight: this.screenDimensions.height
    };
    
    this.rawMovements.push(movementPoint);
    

  }

  stopTracking() {
    if (!this.isTracking) return null;

    this.isTracking = false;
    const endTime = Date.now();
    const duration = endTime - this.startTime;
    
    // Return raw data only - all analysis will be done post-game
    return {
      participantId: this.participantId,
      trialInfo: this.currentTrial,
      startTime: this.startTime,
      endTime: endTime,
      duration: duration,
      screenDimensions: this.screenDimensions,
      barPositions: this.barPositions,
      rawMovements: this.rawMovements,
      totalMovements: this.rawMovements.length,
      samplingRate: this.rawMovements.length / (duration / 1000), // Hz
      // No calculated metrics - just raw data for research analysis
    };
  }
}

// Track hand dynamometer force during reward collection


// Track key pressing during reward collection
export class RewardTracker {
  constructor(participantId) {
    this.participantId = participantId;
    this.isTracking = false;
    this.currentTrial = null;
    this.keyPresses = [];
    this.startTime = null;
    this.expectedSequence = [];
    this.correctPresses = 0;
    this.totalPresses = 0;
  }

  startTracking(trialInfo, expectedSequence) {
    this.isTracking = true;
    this.currentTrial = trialInfo;
    this.keyPresses = [];
    this.startTime = Date.now();
    this.expectedSequence = expectedSequence;
    this.correctPresses = 0;
    this.totalPresses = 0;
  }

  recordKeyPress(key, isCorrect) {
    if (!this.isTracking) return;

    const timestamp = Date.now();
    this.totalPresses++;
    if (isCorrect) this.correctPresses++;

    this.keyPresses.push({
      key,
      isCorrect,
      timestamp,
      relativeTime: timestamp - this.startTime,
      sequencePosition: this.correctPresses
    });
  }

  stopTracking() {
    if (!this.isTracking) return null;

    this.isTracking = false;
    const endTime = Date.now();
    
    // Calculate timing metrics
    const interKeyIntervals = [];
    for (let i = 1; i < this.keyPresses.length; i++) {
      interKeyIntervals.push(
        this.keyPresses[i].relativeTime - this.keyPresses[i-1].relativeTime
      );
    }

    return {
      participantId: this.participantId,
      trialInfo: this.currentTrial,
      startTime: this.startTime,
      endTime,
      duration: endTime - this.startTime,
      expectedSequence: this.expectedSequence,
      keyPresses: this.keyPresses,
      totalPresses: this.totalPresses,
      correctPresses: this.correctPresses,
      accuracy: this.correctPresses / this.totalPresses,
      overshoot: this.totalPresses - this.expectedSequence.length,
      averageInterKeyInterval: interKeyIntervals.length > 0 ? 
        interKeyIntervals.reduce((a, b) => a + b, 0) / interKeyIntervals.length : 0,
      completionTime: this.correctPresses >= this.expectedSequence.length ? 
        this.keyPresses[this.correctPresses - 1].relativeTime : null
    };
  }
} 