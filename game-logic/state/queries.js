/**
 * Data Access Layer for Medieval Grand Strategy Game
 * Provides query functions for settlements and terrain data
 */

const fs = require('fs');
const path = require('path');

// Load data files
let settlementsData = null;
let terrainData = null;

/**
 * Initialize data by loading JSON files
 */
function initializeData() {
  if (!settlementsData) {
    const settlementsPath = path.join(__dirname, '../data/settlements.json');
    settlementsData = JSON.parse(fs.readFileSync(settlementsPath, 'utf8'));
  }

  if (!terrainData) {
    const terrainPath = path.join(__dirname, '../data/terrain.json');
    terrainData = JSON.parse(fs.readFileSync(terrainPath, 'utf8'));
  }
}

/**
 * Gets a settlement by its ID
 * @param {string} id - Settlement ID (e.g., "london_001")
 * @returns {Object|null} Settlement object or null if not found
 */
function getSettlement(id) {
  initializeData();
  const settlement = settlementsData.settlements.find(s => s.id === id);
  return settlement || null;
}

/**
 * Gets all settlements
 * @returns {Array} Array of all settlement objects
 */
function getAllSettlements() {
  initializeData();
  return settlementsData.settlements;
}

/**
 * Finds all settlements within a given radius of a point
 * @param {number} x - X coordinate in pixels
 * @param {number} y - Y coordinate in pixels
 * @param {number} radius - Search radius in pixels
 * @returns {Array} Array of settlements within radius, sorted by distance
 */
function findSettlementsInRadius(x, y, radius) {
  initializeData();

  const results = [];
  const radiusSquared = radius * radius;

  for (const settlement of settlementsData.settlements) {
    const dx = settlement.coordinates.x - x;
    const dy = settlement.coordinates.y - y;
    const distanceSquared = dx * dx + dy * dy;

    if (distanceSquared <= radiusSquared) {
      results.push({
        settlement: settlement,
        distance: Math.sqrt(distanceSquared)
      });
    }
  }

  // Sort by distance (closest first)
  results.sort((a, b) => a.distance - b.distance);

  return results.map(r => ({
    ...r.settlement,
    distance: r.distance
  }));
}

/**
 * Converts pixel coordinates to terrain grid cell coordinates
 * @param {number} x - X coordinate in pixels
 * @param {number} y - Y coordinate in pixels
 * @returns {Object} Object with cellX and cellY
 */
function pixelToCell(x, y) {
  initializeData();
  return {
    cellX: Math.floor(x / terrainData.cellSize),
    cellY: Math.floor(y / terrainData.cellSize)
  };
}

/**
 * Gets terrain movement cost at given pixel coordinates
 * @param {number} x - X coordinate in pixels
 * @param {number} y - Y coordinate in pixels
 * @returns {number} Movement cost multiplier (1.0=plains, 1.5=forest, 2.0=mountains, 999=water/impassable)
 */
function getTerrainCost(x, y) {
  initializeData();

  const { cellX, cellY } = pixelToCell(x, y);

  // Bounds checking
  if (cellX < 0 || cellX >= terrainData.width || cellY < 0 || cellY >= terrainData.height) {
    return 999; // Impassable if out of bounds
  }

  const index = cellY * terrainData.width + cellX;
  return terrainData.costs[index];
}

/**
 * Gets terrain cost for a specific cell
 * @param {number} cellX - Cell X coordinate
 * @param {number} cellY - Cell Y coordinate
 * @returns {number} Movement cost multiplier
 */
function getTerrainCostByCell(cellX, cellY) {
  initializeData();

  if (cellX < 0 || cellX >= terrainData.width || cellY < 0 || cellY >= terrainData.height) {
    return 999;
  }

  const index = cellY * terrainData.width + cellX;
  return terrainData.costs[index];
}

/**
 * Checks if a coordinate is passable (not water/impassable)
 * @param {number} x - X coordinate in pixels
 * @param {number} y - Y coordinate in pixels
 * @returns {boolean} True if passable, false otherwise
 */
function isPassable(x, y) {
  return getTerrainCost(x, y) < 999;
}

/**
 * Gets terrain data dimensions
 * @returns {Object} Object with width, height, cellSize, mapWidth, mapHeight
 */
function getTerrainDimensions() {
  initializeData();
  return {
    width: terrainData.width,
    height: terrainData.height,
    cellSize: terrainData.cellSize,
    mapWidth: terrainData.mapWidth,
    mapHeight: terrainData.mapHeight
  };
}

/**
 * Finds settlements by owner (kingdom)
 * @param {string} owner - Owner/kingdom ID
 * @returns {Array} Array of settlements owned by this kingdom
 */
function getSettlementsByOwner(owner) {
  initializeData();
  return settlementsData.settlements.filter(s => s.owner === owner);
}

/**
 * Finds settlements by type (city, castle, village)
 * @param {string} type - Settlement type
 * @returns {Array} Array of settlements of this type
 */
function getSettlementsByType(type) {
  initializeData();
  return settlementsData.settlements.filter(s => s.type === type);
}

/**
 * Gets the nearest settlement to given coordinates
 * @param {number} x - X coordinate in pixels
 * @param {number} y - Y coordinate in pixels
 * @returns {Object|null} Nearest settlement with distance property
 */
function getNearestSettlement(x, y) {
  initializeData();

  let nearest = null;
  let minDistance = Infinity;

  for (const settlement of settlementsData.settlements) {
    const dx = settlement.coordinates.x - x;
    const dy = settlement.coordinates.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < minDistance) {
      minDistance = distance;
      nearest = { ...settlement, distance };
    }
  }

  return nearest;
}

/**
 * Calculates distance between two points
 * @param {number} x1 - First point X
 * @param {number} y1 - First point Y
 * @param {number} x2 - Second point X
 * @param {number} y2 - Second point Y
 * @returns {number} Distance in pixels
 */
function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Gets database statistics
 * @returns {Object} Statistics about loaded data
 */
function getStatistics() {
  initializeData();

  const settlements = settlementsData.settlements;
  const owners = new Set(settlements.map(s => s.owner));
  const types = {
    city: settlements.filter(s => s.type === 'city').length,
    castle: settlements.filter(s => s.type === 'castle').length
  };

  const terrainCounts = {
    plains: 0,
    forest: 0,
    mountains: 0,
    water: 0
  };

  for (const cost of terrainData.costs) {
    if (cost === 1.0) terrainCounts.plains++;
    else if (cost === 1.5) terrainCounts.forest++;
    else if (cost === 2.0) terrainCounts.mountains++;
    else if (cost === 999) terrainCounts.water++;
  }

  return {
    settlements: {
      total: settlements.length,
      cities: types.city,
      castles: types.castle,
      kingdoms: owners.size,
      villages: settlements.reduce((sum, s) => sum + s.attachedVillages.length, 0)
    },
    terrain: {
      totalCells: terrainData.costs.length,
      plains: terrainCounts.plains,
      forest: terrainCounts.forest,
      mountains: terrainCounts.mountains,
      water: terrainCounts.water,
      dimensions: `${terrainData.width}x${terrainData.height} cells`,
      mapSize: `${terrainData.mapWidth}x${terrainData.mapHeight} pixels`
    }
  };
}

// Export all functions
module.exports = {
  // Initialization
  initializeData,

  // Settlement queries
  getSettlement,
  getAllSettlements,
  findSettlementsInRadius,
  getSettlementsByOwner,
  getSettlementsByType,
  getNearestSettlement,

  // Terrain queries
  getTerrainCost,
  getTerrainCostByCell,
  isPassable,
  getTerrainDimensions,
  pixelToCell,

  // Utilities
  calculateDistance,
  getStatistics
};
