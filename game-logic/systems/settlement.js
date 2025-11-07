/**
 * Settlement Interaction System for Medieval Grand Strategy Game
 * Handles recruitment, sieges, and settlement ownership
 */

const queries = require('../state/queries');
const movement = require('./movement');

// Interaction constants
const PROXIMITY_RADIUS = 10; // pixels - army must be within this range
const RECRUITMENT_COOLDOWN_DAYS = 7; // days before settlement can recruit again
const MIN_RECRUITS = 5;
const MAX_RECRUITS = 10;
const SIEGE_TIME_CITY = 3; // game-days to capture city
const SIEGE_TIME_CASTLE = 3; // game-days to capture castle
const SIEGE_TIME_VILLAGE = 1; // game-days to capture village (attached)

// Settlement state storage (tracks dynamic data not in settlements.json)
let settlementStates = new Map(); // settlementId -> {recruitmentCooldown, lastOwner}

// Active sieges
let activeSieges = [];
let nextSiegeId = 1;

/**
 * Settlement state structure
 * @typedef {Object} SettlementState
 * @property {number} recruitmentCooldown - Days until can recruit again (0 = ready)
 * @property {string} lastOwner - Previous owner (for tracking changes)
 */

/**
 * Siege structure
 * @typedef {Object} Siege
 * @property {number} id - Unique siege ID
 * @property {number} armyId - Attacking army ID
 * @property {string} settlementId - Target settlement ID
 * @property {number} timeRemaining - Game-days until siege completes
 * @property {number} totalTime - Total siege duration
 * @property {number} startTime - When siege started (for tracking)
 */

/**
 * Gets or creates settlement state
 * @param {string} settlementId - Settlement ID
 * @returns {Object} Settlement state
 */
function getSettlementState(settlementId) {
  if (!settlementStates.has(settlementId)) {
    const settlement = queries.getSettlement(settlementId);
    settlementStates.set(settlementId, {
      recruitmentCooldown: 0,
      lastOwner: settlement ? settlement.owner : null
    });
  }
  return settlementStates.get(settlementId);
}

/**
 * Checks if army is within proximity range of a settlement
 * @param {Object} army - Army object
 * @param {Object} settlement - Settlement object
 * @returns {boolean} True if within range
 */
function isInProximity(army, settlement) {
  const distance = queries.calculateDistance(
    army.position.x, army.position.y,
    settlement.coordinates.x, settlement.coordinates.y
  );
  return distance <= PROXIMITY_RADIUS;
}

/**
 * Finds all settlements within proximity of an army
 * @param {number} armyId - Army ID
 * @returns {Array} Array of nearby settlements
 */
function checkProximity(armyId) {
  const army = movement.getArmy(armyId);
  if (!army) {
    return [];
  }

  const nearbySettlements = queries.findSettlementsInRadius(
    army.position.x,
    army.position.y,
    PROXIMITY_RADIUS
  );

  return nearbySettlements;
}

/**
 * Checks if army can recruit at a settlement
 * @param {number} armyId - Army ID
 * @param {string} settlementId - Settlement ID
 * @returns {Object} {canRecruit: boolean, reason: string}
 */
function canRecruit(armyId, settlementId) {
  const army = movement.getArmy(armyId);
  if (!army) {
    return {canRecruit: false, reason: 'Army not found'};
  }

  const settlement = queries.getSettlement(settlementId);
  if (!settlement) {
    return {canRecruit: false, reason: 'Settlement not found'};
  }

  // Check proximity
  if (!isInProximity(army, settlement)) {
    return {canRecruit: false, reason: 'Army not in proximity'};
  }

  // Check ownership
  if (settlement.owner !== army.owner) {
    return {canRecruit: false, reason: 'Settlement not owned by army owner'};
  }

  // Check cooldown
  const state = getSettlementState(settlementId);
  if (state.recruitmentCooldown > 0) {
    return {
      canRecruit: false,
      reason: `Recruitment on cooldown (${state.recruitmentCooldown.toFixed(1)} days remaining)`
    };
  }

  // Check if army is in battle
  if (army.inBattle) {
    return {canRecruit: false, reason: 'Army is in battle'};
  }

  return {canRecruit: true, reason: 'Can recruit'};
}

/**
 * Recruits troops at a settlement
 * @param {number} armyId - Army ID
 * @param {string} settlementId - Settlement ID
 * @returns {Object} {success: boolean, recruitsAdded: number, message: string}
 */
function recruit(armyId, settlementId) {
  // Check if can recruit
  const check = canRecruit(armyId, settlementId);
  if (!check.canRecruit) {
    return {success: false, recruitsAdded: 0, message: check.reason};
  }

  const army = movement.getArmy(armyId);
  const settlement = queries.getSettlement(settlementId);

  // Calculate recruits (random between min and max)
  const recruitsAdded = Math.floor(Math.random() * (MAX_RECRUITS - MIN_RECRUITS + 1)) + MIN_RECRUITS;

  // Add troops to army (use settlement's troop quality)
  army.troops.push({
    type: 'infantry', // Default to infantry for recruitment
    count: recruitsAdded,
    quality: settlement.troopQuality
  });

  // Set recruitment cooldown
  const state = getSettlementState(settlementId);
  state.recruitmentCooldown = RECRUITMENT_COOLDOWN_DAYS;

  return {
    success: true,
    recruitsAdded: recruitsAdded,
    message: `Recruited ${recruitsAdded} troops at ${settlement.name}`
  };
}

/**
 * Checks if army can initiate siege at a settlement
 * @param {number} armyId - Army ID
 * @param {string} settlementId - Settlement ID
 * @returns {Object} {canSiege: boolean, reason: string}
 */
function canSiege(armyId, settlementId) {
  const army = movement.getArmy(armyId);
  if (!army) {
    return {canSiege: false, reason: 'Army not found'};
  }

  const settlement = queries.getSettlement(settlementId);
  if (!settlement) {
    return {canSiege: false, reason: 'Settlement not found'};
  }

  // Check proximity
  if (!isInProximity(army, settlement)) {
    return {canSiege: false, reason: 'Army not in proximity'};
  }

  // Can't siege own settlement
  if (settlement.owner === army.owner) {
    return {canSiege: false, reason: 'Cannot siege own settlement'};
  }

  // Check if army is strong enough
  const armyStrength = movement.getTroopCount(army);
  if (armyStrength <= settlement.garrison) {
    return {
      canSiege: false,
      reason: `Army too weak (${armyStrength} vs ${settlement.garrison} garrison)`
    };
  }

  // Check if army is in battle
  if (army.inBattle) {
    return {canSiege: false, reason: 'Army is in battle'};
  }

  // Check if army is already sieging this settlement
  const existingSiege = activeSieges.find(s =>
    s.armyId === armyId && s.settlementId === settlementId
  );
  if (existingSiege) {
    return {canSiege: false, reason: 'Already sieging this settlement'};
  }

  return {canSiege: true, reason: 'Can initiate siege'};
}

/**
 * Initiates a siege
 * @param {number} armyId - Army ID
 * @param {string} settlementId - Settlement ID
 * @returns {Object} {success: boolean, siege: Object|null, message: string}
 */
function initiateSiege(armyId, settlementId) {
  // Check if can siege
  const check = canSiege(armyId, settlementId);
  if (!check.canSiege) {
    return {success: false, siege: null, message: check.reason};
  }

  const army = movement.getArmy(armyId);
  const settlement = queries.getSettlement(settlementId);

  // Determine siege duration based on settlement type and fortification
  let siegeDuration;
  if (settlement.type === 'city') {
    siegeDuration = SIEGE_TIME_CITY * settlement.fortification;
  } else if (settlement.type === 'castle') {
    siegeDuration = SIEGE_TIME_CASTLE * settlement.fortification;
  } else {
    siegeDuration = SIEGE_TIME_VILLAGE;
  }

  // Create siege
  const siege = {
    id: nextSiegeId++,
    armyId: armyId,
    settlementId: settlementId,
    timeRemaining: siegeDuration,
    totalTime: siegeDuration,
    startTime: Date.now()
  };

  activeSieges.push(siege);

  // Stop army movement during siege
  movement.stopArmy(armyId);

  return {
    success: true,
    siege: siege,
    message: `Siege initiated at ${settlement.name} (${siegeDuration.toFixed(1)} days)`
  };
}

/**
 * Gets active siege for an army
 * @param {number} armyId - Army ID
 * @returns {Object|null} Siege object or null
 */
function getArmySiege(armyId) {
  return activeSieges.find(s => s.armyId === armyId) || null;
}

/**
 * Gets all sieges at a settlement
 * @param {string} settlementId - Settlement ID
 * @returns {Array} Array of sieges
 */
function getSettlementSieges(settlementId) {
  return activeSieges.filter(s => s.settlementId === settlementId);
}

/**
 * Cancels a siege
 * @param {number} siegeId - Siege ID
 * @param {string} reason - Reason for cancellation
 * @returns {boolean} True if cancelled
 */
function cancelSiege(siegeId, reason = 'Cancelled') {
  const index = activeSieges.findIndex(s => s.id === siegeId);
  if (index !== -1) {
    const siege = activeSieges[index];
    activeSieges.splice(index, 1);
    console.log(`Siege ${siegeId} cancelled: ${reason}`);
    return true;
  }
  return false;
}

/**
 * Resolves a completed siege (transfers ownership)
 * @param {Object} siege - Siege object
 * @returns {Object} {success: boolean, message: string, capturedVillages: number}
 */
function resolveSiege(siege) {
  const army = movement.getArmy(siege.armyId);
  const settlement = queries.getSettlement(siege.settlementId);

  if (!army) {
    return {success: false, message: 'Army no longer exists', capturedVillages: 0};
  }

  if (!settlement) {
    return {success: false, message: 'Settlement no longer exists', capturedVillages: 0};
  }

  // Transfer ownership
  const oldOwner = settlement.owner;
  settlement.owner = army.owner;

  // Update settlement state
  const state = getSettlementState(siege.settlementId);
  state.lastOwner = oldOwner;

  // Transfer attached villages
  const capturedVillages = settlement.attachedVillages.length;

  // Remove siege from active list
  cancelSiege(siege.id, 'Siege successful');

  return {
    success: true,
    message: `${settlement.name} captured! ${capturedVillages} villages transferred.`,
    capturedVillages: capturedVillages
  };
}

/**
 * Updates all active sieges
 * @param {number} deltaTime - Time elapsed in game-days
 */
function updateSieges(deltaTime) {
  const completedSieges = [];

  // Update siege timers
  for (const siege of activeSieges) {
    siege.timeRemaining -= deltaTime;

    // Check if siege completed
    if (siege.timeRemaining <= 0) {
      completedSieges.push(siege);
    }
  }

  // Resolve completed sieges
  for (const siege of completedSieges) {
    resolveSiege(siege);
  }

  return completedSieges.length;
}

/**
 * Updates recruitment cooldowns
 * @param {number} deltaTime - Time elapsed in game-days
 */
function updateRecruitmentCooldowns(deltaTime) {
  for (const [settlementId, state] of settlementStates.entries()) {
    if (state.recruitmentCooldown > 0) {
      state.recruitmentCooldown = Math.max(0, state.recruitmentCooldown - deltaTime);
    }
  }
}

/**
 * Master update function for all settlement interactions
 * @param {number} deltaTime - Time elapsed in game-days
 * @returns {Object} Update statistics
 */
function updateSettlementInteractions(deltaTime) {
  const siegesCompleted = updateSieges(deltaTime);
  updateRecruitmentCooldowns(deltaTime);

  return {
    siegesCompleted: siegesCompleted,
    activeSieges: activeSieges.length
  };
}

/**
 * Gets interaction statistics
 * @returns {Object} Statistics
 */
function getInteractionStatistics() {
  const settlementsOnCooldown = Array.from(settlementStates.values())
    .filter(s => s.recruitmentCooldown > 0)
    .length;

  return {
    activeSieges: activeSieges.length,
    settlementsOnCooldown: settlementsOnCooldown,
    totalSettlementStates: settlementStates.size
  };
}

/**
 * Gets detailed information about nearby settlements for an army
 * @param {number} armyId - Army ID
 * @returns {Array} Array of settlements with interaction info
 */
function getNearbySettlementsInfo(armyId) {
  const nearbySettlements = checkProximity(armyId);
  const army = movement.getArmy(armyId);

  if (!army) {
    return [];
  }

  return nearbySettlements.map(settlement => {
    const recruitCheck = canRecruit(armyId, settlement.id);
    const siegeCheck = canSiege(armyId, settlement.id);
    const activeSiege = getSettlementSieges(settlement.id)[0] || null;
    const state = getSettlementState(settlement.id);

    return {
      ...settlement,
      canRecruit: recruitCheck.canRecruit,
      recruitReason: recruitCheck.reason,
      canSiege: siegeCheck.canSiege,
      siegeReason: siegeCheck.reason,
      recruitmentCooldown: state.recruitmentCooldown,
      activeSiege: activeSiege ? {
        id: activeSiege.id,
        timeRemaining: activeSiege.timeRemaining,
        progress: (1 - activeSiege.timeRemaining / activeSiege.totalTime) * 100
      } : null
    };
  });
}

/**
 * Clears all settlement interaction state (for testing/reset)
 */
function clearAllInteractionState() {
  settlementStates.clear();
  activeSieges = [];
  nextSiegeId = 1;
}

/**
 * Gets all active sieges
 * @returns {Array} Array of all sieges
 */
function getAllSieges() {
  return activeSieges;
}

// Export all functions
module.exports = {
  // Proximity
  checkProximity,
  isInProximity,
  getNearbySettlementsInfo,

  // Recruitment
  canRecruit,
  recruit,

  // Sieges
  canSiege,
  initiateSiege,
  getArmySiege,
  getSettlementSieges,
  cancelSiege,
  resolveSiege,
  getAllSieges,

  // Updates
  updateSieges,
  updateRecruitmentCooldowns,
  updateSettlementInteractions,

  // State
  getSettlementState,
  clearAllInteractionState,
  getInteractionStatistics,

  // Constants
  PROXIMITY_RADIUS,
  RECRUITMENT_COOLDOWN_DAYS,
  MIN_RECRUITS,
  MAX_RECRUITS,
  SIEGE_TIME_CITY,
  SIEGE_TIME_CASTLE,
  SIEGE_TIME_VILLAGE
};
