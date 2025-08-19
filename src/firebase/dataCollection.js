import { saveSubjectData, saveTrialData, saveGameData, database } from './config.js';
import { addDoc, collection, doc, setDoc } from 'firebase/firestore';

// Generate meaningful participant identifier (workerId format)
export const generateParticipantId = (surveyData) => {
  const workerId = surveyData?.workerId || 'UNK'; // Worker ID from survey
  
  return workerId; // Just use the worker ID (e.g., gb_1, gb_2)
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
  const participantId = generateParticipantId(participantData);
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

// Save trial data (legacy top-level collection)
export const saveTrialDataPoint = async (trialData) => {
  try {
    const documentReference = await addDoc(collection(database, 'globalInvigorationTrials'), trialData);
    return documentReference;
  } catch (error) {
    console.error("Error saving trial data: ", error);
    throw error;
  }
};

// NEW: Save trial to flat trials collection with custom document ID
export const saveParticipantTrial = async (participantId, trialRow, customDocId) => {
  try {
    const trialsColl = collection(database, 'globalInvigorationTrials');
    const docRef = doc(trialsColl, customDocId);
    return await setDoc(docRef, trialRow);
  } catch (error) {
    console.error('Error saving participant trial:', error);
    throw error;
  }
};

// Raw movement tracking class
export class RawMovementTracker {
  constructor(participantId) {
    this.participantId = participantId;
    this.isTracking = false;
    this.startTime = null;
    this.endTime = null;
    this.movements = [];
    this.trialInfo = null;
    this.barPositions = null;
  }

  startTracking(trialInfo, barPositions = null) {
    this.isTracking = true;
    this.startTime = Date.now();
    this.trialInfo = trialInfo;
    this.barPositions = barPositions;
    this.movements = [];
    console.log('Raw movement tracking started:', trialInfo);
  }

  recordMovement(x, y, currentBar) {
    if (!this.isTracking) return;
    
    const movement = {
      timestamp: Date.now(),
      relativeTime: Date.now() - this.startTime,
      x: Math.round(x),
      y: Math.round(y),
      currentBar: currentBar
    };
    
    this.movements.push(movement);
  }

  stopTracking() {
    if (!this.isTracking) return null;
    
    this.isTracking = false;
    this.endTime = Date.now();
    
    const movementData = {
      participantId: this.participantId,
      trialInfo: this.trialInfo,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime - this.startTime,
      screenDimensions: { 
        width: window.innerWidth, 
        height: window.innerHeight 
      },
      barPositions: this.barPositions,
      rawMovements: this.movements,
      totalMovements: this.movements.length,
      samplingRate: this.movements.length / ((this.endTime - this.startTime) / 1000)
    };
    
    console.log('Raw movement tracking stopped:', movementData);
    return movementData;
  }
}

// Reward tracking class
export class RewardTracker {
  constructor(participantId) {
    this.participantId = participantId;
    this.isTracking = false;
    this.startTime = null;
    this.endTime = null;
    this.trialInfo = null;
    this.expectedSequence = [];
    this.keyPresses = [];
  }

  startTracking(trialInfo, expectedSequence) {
    this.isTracking = true;
    this.startTime = Date.now();
    this.trialInfo = trialInfo;
    this.expectedSequence = expectedSequence;
    this.keyPresses = [];
    console.log('Reward tracking started:', { trialInfo, expectedSequence });
  }

  recordKeyPress(pressedKey, expectedKey) {
    if (!this.isTracking) return;
    
    const keyPress = {
      timestamp: Date.now(),
      relativeTime: Date.now() - this.startTime,
      pressedKey: pressedKey,
      expectedKey: expectedKey,
      isCorrect: pressedKey === expectedKey
    };
    
    this.keyPresses.push(keyPress);
  }

  stopTracking() {
    if (!this.isTracking) return null;
    
    this.isTracking = false;
    this.endTime = Date.now();
    
    const correctPresses = this.keyPresses.filter(press => press.isCorrect).length;
    const totalPresses = this.keyPresses.length;
    const accuracy = totalPresses > 0 ? (correctPresses / totalPresses) * 100 : 0;
    
    // Calculate average interval between key presses
    let averageInterKeyInterval = 0;
    if (this.keyPresses.length > 1) {
      const intervals = [];
      for (let i = 1; i < this.keyPresses.length; i++) {
        const interval = this.keyPresses[i].relativeTime - this.keyPresses[i-1].relativeTime;
        intervals.push(interval);
      }
      averageInterKeyInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    }
    
    const rewardData = {
      participantId: this.participantId,
      trialInfo: this.trialInfo,
      startTime: this.startTime,
      endTime: this.endTime,
      duration: this.endTime - this.startTime,
      expectedSequence: this.expectedSequence,
      keyPresses: this.keyPresses,
      totalPresses: totalPresses,
      correctPresses: correctPresses,
      accuracy: accuracy,
      overshoot: Math.max(0, totalPresses - this.expectedSequence.length),
      averageInterKeyInterval: averageInterKeyInterval,
      completionTime: totalPresses >= this.expectedSequence.length ? this.endTime - this.startTime : null
    };
    
    console.log('Reward tracking stopped:', rewardData);
    return rewardData;
  }
}

// Save session data (legacy top-level collection)
export const saveSessionData = async (sessionData) => {
  try {
    const documentReference = await addDoc(collection(database, 'globalInvigorationSessions'), sessionData);
    console.log('Session data saved with ID:', documentReference.id);
    return documentReference;
  } catch (error) {
    console.error("Error saving session data: ", error);
    throw error;
  }
};

// NEW: Save session under participant subcollection
export const saveParticipantSession = async (participantId, sessionData) => {
  try {
    const sessionsColl = collection(database, `globalInvigorationSubjects/${participantId}/sessions`);
    const documentReference = await addDoc(sessionsColl, sessionData);
    console.log('Participant session saved with ID:', documentReference.id);
    return documentReference;
  } catch (error) {
    console.error('Error saving participant session:', error);
    throw error;
  }
};
