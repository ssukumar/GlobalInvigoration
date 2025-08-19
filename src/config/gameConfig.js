// Game Configuration File
// Modify these values to change game behavior without editing code

export const GAME_CONFIG = {
  // ===== GAME STRUCTURE =====
  BLOCKS: {
    POOR: {
      baseRounds: 30, // Base number of rounds 
    },
    RICH: {
      baseRounds: 30, // Base number of rounds 
    }
  },

  // ===== ROUND DURATIONS =====
  ROUND_DURATIONS: {
    REACHING_PHASE: {
      mean: 20, // Mean duration in seconds
      standardDeviation: 2, // Standard deviation in seconds
      min: 15, // Minimum duration (to avoid too short rounds)
      max: 25  // Maximum duration (to avoid too long rounds)
    },
    REWARD_CUE_TIME: 3, // Seconds before reward collection when gray circle appears
    WARNING_THRESHOLD: 2 // Seconds remaining when speed warning appears
  },

  // ===== REWARD VALUES =====
  REWARDS: {
    VALUES: [10, 30, 50], // Available reward values (no more 0 reward)
    PRACTICE_VALUE: 50, // Reward value for practice mode
    PROBABILITIES: {
      POOR: {
        10: 0.50, // 50% chance for 10 points
        30: 0.30, // 30% chance for 30 points
        50: 0.20  // 20% chance for 50 points
      },
      RICH: {
        10: 0.20, // 20% chance for 10 points
        30: 0.30, // 30% chance for 30 points
        50: 0.50  // 50% chance for 50 points
      }
    }
  },

  // ===== KEY SEQUENCES =====
  KEYS: {
    VALID_KEYS: ['a', 's', 'd', 'f'], // Valid keys for reward collection
    SEQUENCE_LENGTH: 10, // Number of keys to press in sequence
    PRACTICE_SEQUENCE_LENGTH: 10, // Number of keys for practice mode
    PREDEFINED_SEQUENCES: [
      ['a', 's', 'd', 'f', 'a', 's', 'd', 'f', 'a', 's'], // Sequence 1
      ['f', 'd', 's', 'a', 'f', 'd', 's', 'a', 'f', 'd'], // Sequence 2
      ['s', 'a', 'f', 'd', 's', 'a', 'f', 'd', 's', 'a'], // Sequence 3
      ['d', 'f', 'a', 's', 'd', 'f', 'a', 's', 'd', 'f'], // Sequence 4
      ['a', 'f', 's', 'd', 'a', 'f', 's', 'd', 'a', 'f'], // Sequence 5
      ['f', 's', 'd', 'a', 'f', 's', 'd', 'a', 'f', 's']  // Sequence 6
    ]
  },

  // ===== MOVEMENT TRACKING =====
  TRACKING: {
    SAMPLE_RATE: 16, // Milliseconds between movement samples (~60fps)
    WALL_THRESHOLD: 50, // Pixels from wall edge to be considered "at wall"
    REACH_DEFINITION: 'wall_to_wall' // How to define a reach: 'wall_to_wall' or 'distance_based'
  }
};

// Helper function to calculate total rounds based on base rounds
export const calculateTotalRounds = (environment) => {
  const baseRounds = environment === 'poor' ? GAME_CONFIG.BLOCKS.POOR.baseRounds : GAME_CONFIG.BLOCKS.RICH.baseRounds;
  
  if (environment === 'poor') {
    // Poor environment: baseRounds * 2 - 1 (e.g., 10 → 19, 11 → 21, 12 → 23)
    return baseRounds * 2 - 1;
  } else {
    // Rich environment: baseRounds * 2 + 1 (e.g., 10 → 21, 11 → 23, 12 → 25)
    return baseRounds * 2 + 1;
  }
};

// Helper function to get random round duration with normal distribution
export const getRandomRoundDuration = () => {
  const config = GAME_CONFIG.ROUND_DURATIONS.REACHING_PHASE;
  
  // Box-Muller transform to generate normally distributed random numbers
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  
  // Apply mean and standard deviation
  let duration = config.mean + z0 * config.standardDeviation;
  
  // Clamp to min/max bounds
  duration = Math.max(config.min, Math.min(config.max, duration));
  
  // Round to nearest 0.1 seconds for practical use
  return Math.round(duration * 10) / 10;
};

// Helper function to get random key sequence from predefined options
export const getRandomKeySequence = () => {
  const sequences = GAME_CONFIG.KEYS.PREDEFINED_SEQUENCES;
  const randomIndex = Math.floor(Math.random() * sequences.length);
  return sequences[randomIndex];
};

// Helper function to select reward based on environment probabilities
export const selectRewardByProbability = (environment) => {
  const probabilities = GAME_CONFIG.REWARDS.PROBABILITIES[environment.toUpperCase()];
  const random = Math.random();
  
  // Cumulative probability selection
  if (random < probabilities[10]) {
    return 10;
  } else if (random < probabilities[10] + probabilities[30]) {
    return 30;
  } else {
    return 50;
  }
};

// Helper function to generate reward sequence based on environment probabilities
export const generateRewardSequence = (environment) => {
  const totalRounds = calculateTotalRounds(environment);
  
  let sequence = [];
  
  // Generate rewards based on environment-specific probabilities
  for (let i = 0; i < totalRounds; i++) {
    sequence.push(selectRewardByProbability(environment));
  }
  
  return sequence;
};

// Helper function to get reward sequence for environment
export const getRewardSequence = (environment) => {
  return generateRewardSequence(environment);
};

// Helper function to get total rounds for environment
export const getTotalRounds = (environment) => {
  return calculateTotalRounds(environment);
};

// Helper function to check if round should trigger break
export const shouldTriggerBreak = (environment, round) => {
  if (environment === 'poor' && round >= calculateTotalRounds('poor')) {
    return true;
  }
  return false;
};

// Helper function to check if game should end
export const shouldEndGame = (environment, round) => {
  if (environment === 'rich' && round >= calculateTotalRounds('rich')) {
    return true;
  }
  return false;
};

export default GAME_CONFIG;
