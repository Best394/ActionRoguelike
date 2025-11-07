/**
 * Terrain Generator for Medieval Grand Strategy Game
 * Generates a 100x200 terrain grid with realistic geographical features
 * for the map covering England to Pakistan (2000x4000 pixels)
 */

// Terrain cost constants
const TERRAIN_TYPES = {
  PLAINS: 1.0,
  FOREST: 1.5,
  MOUNTAINS: 2.0,
  WATER: 999  // Impassable
};

// Grid dimensions
const GRID_WIDTH = 100;
const GRID_HEIGHT = 200;
const CELL_SIZE = 20; // pixels

/**
 * Generates noise value for procedural terrain generation
 */
function simpleNoise(x, y, seed = 42) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Gets smoothed noise for natural-looking terrain
 */
function smoothNoise(x, y, octave) {
  let total = 0;
  let frequency = 1 / octave;
  let amplitude = octave;

  for (let i = 0; i < 4; i++) {
    total += simpleNoise(x * frequency, y * frequency, i * 1000) * amplitude;
    frequency *= 2;
    amplitude /= 2;
  }

  return total / (octave * 2);
}

/**
 * Generates terrain grid with realistic geographical features
 */
function generateTerrainGrid() {
  const costs = new Array(GRID_WIDTH * GRID_HEIGHT);

  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const index = y * GRID_WIDTH + x;

      // Calculate normalized coordinates (0-1)
      const normX = x / GRID_WIDTH;
      const normY = y / GRID_HEIGHT;

      // Base elevation noise
      const elevation = smoothNoise(x * 0.5, y * 0.5, 8);

      // Regional terrain features based on real geography
      let terrainCost = TERRAIN_TYPES.PLAINS;

      // English Channel / North Sea (top-left water)
      if (y < 15 && x < 25) {
        terrainCost = TERRAIN_TYPES.WATER;
      }
      // Atlantic Ocean (left edge, western side)
      else if (x < 5 && y < 100) {
        terrainCost = TERRAIN_TYPES.WATER;
      }
      // Mediterranean Sea (bottom-left to middle)
      else if (y > 150 && x < 40 && y < 170) {
        terrainCost = TERRAIN_TYPES.WATER;
      }
      // Mediterranean eastern basin
      else if (y > 140 && x > 35 && x < 55 && y < 175) {
        terrainCost = TERRAIN_TYPES.WATER;
      }
      // Persian Gulf
      else if (y > 180 && x > 55 && x < 75 && y < 195) {
        terrainCost = TERRAIN_TYPES.WATER;
      }
      // Arabian Sea / Indian Ocean
      else if (y > 195 && x > 70) {
        terrainCost = TERRAIN_TYPES.WATER;
      }
      // Caspian Sea
      else if (x > 45 && x < 60 && y > 100 && y < 125 && elevation > 0.4) {
        terrainCost = TERRAIN_TYPES.WATER;
      }

      // Mountain ranges (if not water)
      else if (terrainCost !== TERRAIN_TYPES.WATER) {
        // Alps (central Europe)
        if (x > 22 && x < 32 && y > 110 && y < 120 && elevation > 0.6) {
          terrainCost = TERRAIN_TYPES.MOUNTAINS;
        }
        // Pyrenees (France-Spain border)
        else if (x > 15 && x < 22 && y > 125 && y < 132 && elevation > 0.55) {
          terrainCost = TERRAIN_TYPES.MOUNTAINS;
        }
        // Carpathian Mountains
        else if (x > 30 && x < 42 && y > 95 && y < 110 && elevation > 0.6) {
          terrainCost = TERRAIN_TYPES.MOUNTAINS;
        }
        // Caucasus Mountains
        else if (x > 50 && x < 62 && y > 125 && y < 138 && elevation > 0.65) {
          terrainCost = TERRAIN_TYPES.MOUNTAINS;
        }
        // Zagros Mountains (Persia)
        else if (x > 60 && x < 72 && y > 155 && y < 175 && elevation > 0.6) {
          terrainCost = TERRAIN_TYPES.MOUNTAINS;
        }
        // Hindu Kush / Himalayas
        else if (x > 75 && x < 90 && y > 160 && y < 185 && elevation > 0.65) {
          terrainCost = TERRAIN_TYPES.MOUNTAINS;
        }
        // Ural Mountains
        else if (x > 48 && x < 54 && y > 50 && y < 90 && elevation > 0.55) {
          terrainCost = TERRAIN_TYPES.MOUNTAINS;
        }

        // Forest regions
        else if (elevation > 0.35 && elevation < 0.55) {
          // Northern European forests (Scandinavia, Russia)
          if (y < 80 && x > 25) {
            terrainCost = TERRAIN_TYPES.FOREST;
          }
          // Central European forests
          else if (y > 80 && y < 120 && x > 20 && x < 45) {
            terrainCost = TERRAIN_TYPES.FOREST;
          }
          // Anatolian highlands
          else if (y > 130 && y < 160 && x > 40 && x < 55) {
            terrainCost = TERRAIN_TYPES.FOREST;
          }
        }

        // Default to plains if no other terrain assigned
        else {
          terrainCost = TERRAIN_TYPES.PLAINS;
        }
      }

      costs[index] = terrainCost;
    }
  }

  return {
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    cellSize: CELL_SIZE,
    mapWidth: GRID_WIDTH * CELL_SIZE,   // 2000 pixels
    mapHeight: GRID_HEIGHT * CELL_SIZE, // 4000 pixels
    costs: costs
  };
}

// Generate and export terrain data
const terrainData = generateTerrainGrid();

// Calculate statistics
const stats = {
  plains: terrainData.costs.filter(c => c === TERRAIN_TYPES.PLAINS).length,
  forests: terrainData.costs.filter(c => c === TERRAIN_TYPES.FOREST).length,
  mountains: terrainData.costs.filter(c => c === TERRAIN_TYPES.MOUNTAINS).length,
  water: terrainData.costs.filter(c => c === TERRAIN_TYPES.WATER).length
};

console.log('Terrain Grid Generated:');
console.log(`  Grid Size: ${GRID_WIDTH}x${GRID_HEIGHT} cells`);
console.log(`  Map Size: ${terrainData.mapWidth}x${terrainData.mapHeight} pixels`);
console.log(`  Plains: ${stats.plains} cells (${(stats.plains / 20000 * 100).toFixed(1)}%)`);
console.log(`  Forests: ${stats.forests} cells (${(stats.forests / 20000 * 100).toFixed(1)}%)`);
console.log(`  Mountains: ${stats.mountains} cells (${(stats.mountains / 20000 * 100).toFixed(1)}%)`);
console.log(`  Water: ${stats.water} cells (${(stats.water / 20000 * 100).toFixed(1)}%)`);

// Export to JSON file
const fs = require('fs');
const path = require('path');

fs.writeFileSync(
  path.join(__dirname, 'terrain.json'),
  JSON.stringify(terrainData, null, 2)
);

console.log('\nTerrain data written to terrain.json');

module.exports = { generateTerrainGrid, TERRAIN_TYPES };
