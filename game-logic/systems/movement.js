/**
 * Army Movement System for Medieval Grand Strategy Game
 * Handles army creation, pathfinding, and continuous movement on 2000x4000 map
 */

const queries = require('../state/queries');

// Game constants
const BASE_ARMY_SPEED = 50; // pixels per game-day
const ARRIVAL_THRESHOLD = 5; // pixels - army stops when this close to destination
const PATHFINDING_CELL_SIZE = 20; // must match terrain grid cell size

// Army storage
let armies = [];
let nextArmyId = 1;

/**
 * Army entity structure
 * @typedef {Object} Army
 * @property {number} id - Unique army ID
 * @property {string} owner - Owner/lord ID
 * @property {Object} position - Current position {x, y}
 * @property {Object} destination - Target position {x, y} or null
 * @property {Array} troops - Array of troop objects {type, count, quality}
 * @property {number} morale - Army morale (0-100)
 * @property {number} speed - Base movement speed (pixels per game-day)
 * @property {boolean} isMoving - Whether army is currently moving
 * @property {boolean} inBattle - Whether army is in battle
 * @property {Array} path - Current pathfinding path (array of {x, y})
 * @property {number} pathIndex - Current index in path
 */

/**
 * Creates a new army
 * @param {string} owner - Owner/lord ID
 * @param {Object} position - Starting position {x, y}
 * @param {Array} troops - Troop array [{type, count, quality}]
 * @param {number} morale - Starting morale (default 80)
 * @returns {Object} Created army object
 */
function createArmy(owner, position, troops = [], morale = 80) {
  // Validate position
  const dims = queries.getTerrainDimensions();
  if (position.x < 0 || position.x >= dims.mapWidth ||
      position.y < 0 || position.y >= dims.mapHeight) {
    throw new Error(`Invalid army position: (${position.x}, ${position.y})`);
  }

  // Validate troops
  if (!Array.isArray(troops)) {
    throw new Error('Troops must be an array');
  }

  const army = {
    id: nextArmyId++,
    owner: owner,
    position: { x: position.x, y: position.y },
    destination: null,
    troops: troops.map(t => ({
      type: t.type || 'infantry',
      count: t.count || 0,
      quality: t.quality || 50
    })),
    morale: Math.max(0, Math.min(100, morale)),
    speed: BASE_ARMY_SPEED,
    isMoving: false,
    inBattle: false,
    path: [],
    pathIndex: 0
  };

  armies.push(army);
  return army;
}

/**
 * Gets an army by ID
 * @param {number} armyId - Army ID
 * @returns {Object|null} Army object or null
 */
function getArmy(armyId) {
  return armies.find(a => a.id === armyId) || null;
}

/**
 * Gets all armies
 * @returns {Array} Array of all armies
 */
function getAllArmies() {
  return armies;
}

/**
 * Gets armies owned by a specific lord
 * @param {string} owner - Owner/lord ID
 * @returns {Array} Array of armies
 */
function getArmiesByOwner(owner) {
  return armies.filter(a => a.owner === owner);
}

/**
 * Removes an army (disbanded or destroyed)
 * @param {number} armyId - Army ID to remove
 * @returns {boolean} True if removed, false if not found
 */
function removeArmy(armyId) {
  const index = armies.findIndex(a => a.id === armyId);
  if (index !== -1) {
    armies.splice(index, 1);
    return true;
  }
  return false;
}

/**
 * Gets total troop count for an army
 * @param {Object} army - Army object
 * @returns {number} Total troop count
 */
function getTroopCount(army) {
  return army.troops.reduce((sum, t) => sum + t.count, 0);
}

/**
 * Gets average troop quality for an army
 * @param {Object} army - Army object
 * @returns {number} Average quality (0-100)
 */
function getAverageTroopQuality(army) {
  if (army.troops.length === 0) return 0;

  let totalQuality = 0;
  let totalTroops = 0;

  for (const troop of army.troops) {
    totalQuality += troop.quality * troop.count;
    totalTroops += troop.count;
  }

  return totalTroops > 0 ? totalQuality / totalTroops : 0;
}

/**
 * A* Pathfinding Algorithm
 * Finds optimal path from start to end considering terrain costs
 */

/**
 * Heuristic function for A* (Manhattan distance)
 * @param {Object} a - Cell position {cellX, cellY}
 * @param {Object} b - Cell position {cellX, cellY}
 * @returns {number} Estimated distance
 */
function heuristic(a, b) {
  return Math.abs(a.cellX - b.cellX) + Math.abs(a.cellY - b.cellY);
}

/**
 * Gets neighbors of a cell for pathfinding
 * @param {number} cellX - Cell X coordinate
 * @param {number} cellY - Cell Y coordinate
 * @param {Object} dims - Terrain dimensions
 * @returns {Array} Array of neighbor cells {cellX, cellY, cost}
 */
function getNeighbors(cellX, cellY, dims) {
  const neighbors = [];
  const directions = [
    {dx: 0, dy: -1},  // North
    {dx: 1, dy: 0},   // East
    {dx: 0, dy: 1},   // South
    {dx: -1, dy: 0},  // West
    {dx: 1, dy: -1},  // Northeast
    {dx: 1, dy: 1},   // Southeast
    {dx: -1, dy: 1},  // Southwest
    {dx: -1, dy: -1}  // Northwest
  ];

  for (const dir of directions) {
    const newX = cellX + dir.dx;
    const newY = cellY + dir.dy;

    // Check bounds
    if (newX >= 0 && newX < dims.width && newY >= 0 && newY < dims.height) {
      const cost = queries.getTerrainCostByCell(newX, newY);

      // Only add passable cells (cost < 999)
      if (cost < 999) {
        // Diagonal movement costs more (sqrt(2) ≈ 1.414)
        const movementCost = (dir.dx !== 0 && dir.dy !== 0) ? cost * 1.414 : cost;
        neighbors.push({
          cellX: newX,
          cellY: newY,
          cost: movementCost
        });
      }
    }
  }

  return neighbors;
}

/**
 * Finds path using A* algorithm
 * @param {Object} start - Start position {x, y} in pixels
 * @param {Object} end - End position {x, y} in pixels
 * @returns {Array|null} Array of waypoints [{x, y}] or null if no path
 */
function findPath(start, end) {
  // Convert pixel coordinates to cells
  const startCell = queries.pixelToCell(start.x, start.y);
  const endCell = queries.pixelToCell(end.x, end.y);
  const dims = queries.getTerrainDimensions();

  // Check if start and end are passable
  if (!queries.isPassable(start.x, start.y) || !queries.isPassable(end.x, end.y)) {
    return null;
  }

  // Initialize open and closed sets
  const openSet = [];
  const closedSet = new Set();
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const startKey = `${startCell.cellX},${startCell.cellY}`;
  const endKey = `${endCell.cellX},${endCell.cellY}`;

  openSet.push(startCell);
  gScore.set(startKey, 0);
  fScore.set(startKey, heuristic(startCell, endCell));

  while (openSet.length > 0) {
    // Find cell with lowest fScore
    let current = openSet[0];
    let currentKey = `${current.cellX},${current.cellY}`;
    let lowestIndex = 0;

    for (let i = 1; i < openSet.length; i++) {
      const key = `${openSet[i].cellX},${openSet[i].cellY}`;
      if (fScore.get(key) < fScore.get(currentKey)) {
        current = openSet[i];
        currentKey = key;
        lowestIndex = i;
      }
    }

    // Reached destination
    if (currentKey === endKey) {
      return reconstructPath(cameFrom, current, start, end);
    }

    // Move current from open to closed
    openSet.splice(lowestIndex, 1);
    closedSet.add(currentKey);

    // Check neighbors
    const neighbors = getNeighbors(current.cellX, current.cellY, dims);

    for (const neighbor of neighbors) {
      const neighborKey = `${neighbor.cellX},${neighbor.cellY}`;

      if (closedSet.has(neighborKey)) {
        continue;
      }

      const tentativeGScore = gScore.get(currentKey) + neighbor.cost;

      // Add to open set if not present
      if (!openSet.find(n => `${n.cellX},${n.cellY}` === neighborKey)) {
        openSet.push(neighbor);
      } else if (tentativeGScore >= (gScore.get(neighborKey) || Infinity)) {
        continue;
      }

      // This path is the best so far
      cameFrom.set(neighborKey, current);
      gScore.set(neighborKey, tentativeGScore);
      fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, endCell));
    }
  }

  // No path found
  return null;
}

/**
 * Reconstructs path from A* result
 * @param {Map} cameFrom - Map of previous cells
 * @param {Object} current - Final cell
 * @param {Object} startPixel - Start position in pixels
 * @param {Object} endPixel - End position in pixels
 * @returns {Array} Path as array of pixel coordinates
 */
function reconstructPath(cameFrom, current, startPixel, endPixel) {
  const path = [];
  const dims = queries.getTerrainDimensions();

  // Build path backwards
  let currentKey = `${current.cellX},${current.cellY}`;
  const cellPath = [current];

  while (cameFrom.has(currentKey)) {
    current = cameFrom.get(currentKey);
    currentKey = `${current.cellX},${current.cellY}`;
    cellPath.unshift(current);
  }

  // Convert cells to pixel coordinates (cell center)
  for (const cell of cellPath) {
    path.push({
      x: cell.cellX * PATHFINDING_CELL_SIZE + PATHFINDING_CELL_SIZE / 2,
      y: cell.cellY * PATHFINDING_CELL_SIZE + PATHFINDING_CELL_SIZE / 2
    });
  }

  // Add exact start and end positions
  if (path.length > 0) {
    path[0] = { x: startPixel.x, y: startPixel.y };
    path[path.length - 1] = { x: endPixel.x, y: endPixel.y };
  }

  return path;
}

/**
 * Sets army destination and calculates path
 * @param {number} armyId - Army ID
 * @param {number} x - Destination X in pixels
 * @param {number} y - Destination Y in pixels
 * @returns {boolean} True if path found, false otherwise
 */
function setDestination(armyId, x, y) {
  const army = getArmy(armyId);
  if (!army) {
    return false;
  }

  const dims = queries.getTerrainDimensions();

  // Validate destination
  if (x < 0 || x >= dims.mapWidth || y < 0 || y >= dims.mapHeight) {
    console.warn(`Invalid destination: (${x}, ${y})`);
    return false;
  }

  if (!queries.isPassable(x, y)) {
    console.warn(`Destination not passable: (${x}, ${y})`);
    return false;
  }

  army.destination = { x, y };

  // Calculate path
  const path = findPath(army.position, army.destination);

  if (path) {
    army.path = path;
    // Start at index 1 if path has multiple waypoints (skip starting position)
    army.pathIndex = path.length > 1 ? 1 : 0;
    army.isMoving = true;
    return true;
  } else {
    console.warn(`No path found from (${army.position.x}, ${army.position.y}) to (${x}, ${y})`);
    army.destination = null;
    army.isMoving = false;
    return false;
  }
}

/**
 * Stops army movement
 * @param {number} armyId - Army ID
 */
function stopArmy(armyId) {
  const army = getArmy(armyId);
  if (army) {
    army.isMoving = false;
    army.destination = null;
    army.path = [];
    army.pathIndex = 0;
  }
}

/**
 * Updates army movement for one time step
 * @param {Object} army - Army object
 * @param {number} deltaTime - Time elapsed (in game-days)
 */
function updateArmyMovement(army, deltaTime) {
  if (!army.isMoving || army.inBattle || !army.destination || army.path.length === 0) {
    return;
  }

  // Get current target waypoint
  if (army.pathIndex >= army.path.length) {
    // Reached final destination
    army.position.x = army.destination.x;
    army.position.y = army.destination.y;
    stopArmy(army.id);
    return;
  }

  const target = army.path[army.pathIndex];

  // Calculate direction to target
  const dx = target.x - army.position.x;
  const dy = target.y - army.position.y;
  const distanceToTarget = Math.sqrt(dx * dx + dy * dy);

  // Check if reached current waypoint
  if (distanceToTarget <= ARRIVAL_THRESHOLD) {
    army.pathIndex++;

    // Check if this was the final waypoint
    if (army.pathIndex >= army.path.length) {
      army.position.x = army.destination.x;
      army.position.y = army.destination.y;
      stopArmy(army.id);
    }
    return;
  }

  // Get terrain cost at current position
  const terrainCost = queries.getTerrainCost(army.position.x, army.position.y);

  // Calculate effective speed (base speed divided by terrain cost)
  const effectiveSpeed = army.speed / terrainCost;

  // Calculate movement distance this frame
  const movementDistance = effectiveSpeed * deltaTime;

  // Calculate normalized direction
  const dirX = dx / distanceToTarget;
  const dirY = dy / distanceToTarget;

  // Move towards target
  if (movementDistance >= distanceToTarget) {
    // Will reach target this frame
    army.position.x = target.x;
    army.position.y = target.y;
    army.pathIndex++;
  } else {
    // Move partial distance
    army.position.x += dirX * movementDistance;
    army.position.y += dirY * movementDistance;
  }
}

/**
 * Updates all armies' movement
 * @param {number} deltaTime - Time elapsed (in game-days)
 */
function updateMovement(deltaTime) {
  for (const army of armies) {
    updateArmyMovement(army, deltaTime);
  }
}

/**
 * Finds armies within radius of a point
 * @param {number} x - Center X
 * @param {number} y - Center Y
 * @param {number} radius - Search radius
 * @returns {Array} Array of armies with distance property
 */
function getArmiesInRadius(x, y, radius) {
  const results = [];
  const radiusSquared = radius * radius;

  for (const army of armies) {
    const dx = army.position.x - x;
    const dy = army.position.y - y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= radiusSquared) {
      results.push({
        ...army,
        distance: Math.sqrt(distanceSquared)
      });
    }
  }

  // Sort by distance
  results.sort((a, b) => a.distance - b.distance);

  return results;
}

/**
 * Gets distance between two armies
 * @param {number} armyId1 - First army ID
 * @param {number} armyId2 - Second army ID
 * @returns {number|null} Distance in pixels or null if army not found
 */
function getDistanceBetweenArmies(armyId1, armyId2) {
  const army1 = getArmy(armyId1);
  const army2 = getArmy(armyId2);

  if (!army1 || !army2) {
    return null;
  }

  return queries.calculateDistance(
    army1.position.x, army1.position.y,
    army2.position.x, army2.position.y
  );
}

/**
 * Clears all armies (for testing/reset)
 */
function clearAllArmies() {
  armies = [];
  nextArmyId = 1;
}

/**
 * Gets movement statistics
 * @returns {Object} Statistics about armies
 */
function getMovementStatistics() {
  const movingArmies = armies.filter(a => a.isMoving).length;
  const totalTroops = armies.reduce((sum, a) => sum + getTroopCount(a), 0);

  return {
    totalArmies: armies.length,
    movingArmies: movingArmies,
    stationaryArmies: armies.length - movingArmies,
    totalTroops: totalTroops,
    averageTroopsPerArmy: armies.length > 0 ? totalTroops / armies.length : 0
  };
}

// Export all functions
module.exports = {
  // Army management
  createArmy,
  getArmy,
  getAllArmies,
  getArmiesByOwner,
  removeArmy,
  getTroopCount,
  getAverageTroopQuality,

  // Movement
  setDestination,
  stopArmy,
  updateMovement,
  updateArmyMovement,

  // Pathfinding
  findPath,

  // Spatial queries
  getArmiesInRadius,
  getDistanceBetweenArmies,

  // Utilities
  clearAllArmies,
  getMovementStatistics,

  // Constants
  BASE_ARMY_SPEED,
  ARRIVAL_THRESHOLD
};
