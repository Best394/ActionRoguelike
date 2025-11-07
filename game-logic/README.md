# Medieval Grand Strategy Game - Game Logic

Pure JavaScript game logic for a medieval grand strategy game inspired by Mount & Blade Bannerlord mechanics and territorial.io visuals. This codebase is designed to be Unity-portable for future rendering and multiplayer implementation.

## Project Vision

A real-time strategy game where players start as minor nobles and expand through conquest, diplomacy, and political maneuvering. Features 200+ AI lords, territorial control, vassal systems, and wave-based tactical battles across a map spanning England to Pakistan.

## Current Status: Session 3 Complete ✓

### Session 1 Deliverables (Complete)

**1. Settlement Database** (`data/settlements.json`)
- 250 historically-accurate settlements covering England to Pakistan
- Settlement types: 100 cities, 150 castles
- 465 attached villages (1-5 per settlement)
- 63 kingdoms represented
- Properties per settlement:
  - Unique ID and name
  - Type (city/castle)
  - Coordinates (x, y) on 2000x4000 pixel map
  - Owner (kingdom)
  - Garrison size (50-250 troops)
  - Prosperity level (0-100)
  - Fortification level (1-5)
  - Troop quality (50-100)

**2. Terrain Grid** (`data/terrain.json`)
- 100×200 cell grid (20×20 pixel cells)
- Covers 2000×4000 pixel map
- Movement costs:
  - Plains: 1.0× (70.9% of map)
  - Forest: 1.5× (14.1% of map)
  - Mountains: 2.0× (1.4% of map)
  - Water: 999× impassable (13.6% of map)
- Realistic geographical features: Alps, Pyrenees, Himalayas, Mediterranean Sea, etc.

**3. Query Functions** (`state/queries.js`)
- `getSettlement(id)` - Retrieve settlement by ID
- `getAllSettlements()` - Get all 250 settlements
- `findSettlementsInRadius(x, y, radius)` - Spatial search with distance sorting
- `getTerrainCost(x, y)` - Get movement cost at coordinates
- `getTerrainCostByCell(cellX, cellY)` - Get cost by cell coordinates
- `isPassable(x, y)` - Check if coordinate is passable
- `getNearestSettlement(x, y)` - Find closest settlement
- `getSettlementsByOwner(owner)` - Filter by kingdom
- `getSettlementsByType(type)` - Filter by type
- `pixelToCell(x, y)` - Convert pixel to cell coordinates
- `calculateDistance(x1, y1, x2, y2)` - Euclidean distance
- `getStatistics()` - Database statistics

**4. Test Suite** (`tests/session1-tests.js`)
- 43 comprehensive tests
- All tests passing ✓
- Test categories:
  - Data initialization
  - Settlement queries
  - Spatial queries
  - Terrain queries
  - Data integrity
  - Performance benchmarks
- Performance results:
  - `getSettlement`: <1ms per call
  - `findSettlementsInRadius`: <1ms per call
  - `getTerrainCost`: <0.001ms per call

### Session 2 Deliverables (Complete)

**1. Army Movement System** (`systems/movement.js`)
- Complete army entity structure
  - Position, destination, troops, morale
  - Movement state tracking (isMoving, inBattle)
  - Path and pathIndex for waypoint following
- Army management functions:
  - `createArmy(owner, position, troops, morale)` - Create new army
  - `getArmy(id)`, `getAllArmies()`, `getArmiesByOwner(owner)`
  - `removeArmy(id)` - Disband army
  - `getTroopCount(army)`, `getAverageTroopQuality(army)`

**2. A* Pathfinding Algorithm**
- Full A* implementation with terrain cost consideration
- 8-directional movement (cardinal + diagonal with √2 cost)
- Heuristic optimization (Manhattan distance)
- Open/closed set tracking with fScore
- Handles impassable terrain (returns null if no path)
- Returns waypoint array from start to destination

**3. Movement Update System**
- `updateMovement(deltaTime)` - Updates all armies
- Terrain-based speed modification:
  - Base speed: 50 pixels per game-day
  - Effective speed = base speed / terrain cost
  - Plains (1.0x), Forest (1.5x), Mountains (2.0x)
- Waypoint following with smooth interpolation
- Arrival detection (stops within 5 pixels)
- Automatic path progression

**4. Spatial Queries**
- `getArmiesInRadius(x, y, radius)` - Find armies near point
- Results sorted by distance (closest first)
- `getDistanceBetweenArmies(id1, id2)` - Calculate distance
- `getMovementStatistics()` - Army/troop counts

**5. Test Suite** (`tests/session2-tests.js`)
- 43 comprehensive tests, all passing ✓
- Test categories:
  - Army creation & management (13 tests)
  - Basic movement (7 tests)
  - Pathfinding (6 tests)
  - Terrain speed (2 tests)
  - Spatial queries (6 tests)
  - Obstacle avoidance (2 tests)
  - Statistics (3 tests)
  - Performance (4 tests)
- Performance results:
  - Pathfinding: ~11ms per path
  - Movement update: 0.02ms per update (50 armies)
  - Spatial queries: 0.01ms per query
  - ✓ All targets met for 60 FPS with 200+ armies

### Session 3 Deliverables (Complete)

**1. Settlement Interaction System** (`systems/settlement.js`)
- Proximity detection (10 pixel radius)
  - `checkProximity(armyId)` - Find nearby settlements
  - `getNearbySettlementsInfo(armyId)` - Detailed interaction data
- Settlement state tracking:
  - Recruitment cooldowns (7 days)
  - Last owner tracking
  - Persistent state management

**2. Recruitment System**
- `canRecruit(armyId, settlementId)` - Validate recruitment
- `recruit(armyId, settlementId)` - Add 5-10 troops
- Checks: proximity, ownership, cooldown, battle status
- Uses settlement's troop quality
- 7-day cooldown after recruitment
- `updateRecruitmentCooldowns(deltaTime)` - Progress cooldowns

**3. Siege System**
- `canSiege(armyId, settlementId)` - Validate siege eligibility
- `initiateSiege(armyId, settlementId)` - Start siege
- Duration based on type and fortification:
  - Cities: 3 days × fortification (e.g., 15 days for level 5)
  - Castles: 3 days × fortification
  - Villages: 1 day
- `updateSieges(deltaTime)` - Progress all active sieges
- `resolveSiege(siege)` - Transfer ownership on completion
- Army stops moving during siege
- Multiple simultaneous sieges supported
- `getArmySiege(armyId)`, `getSettlementSieges(settlementId)`

**4. Ownership Transfer**
- Automatic on siege completion
- Transfers settlement + all attached villages
- Tracks previous owner in state
- Updates settlement owner property

**5. Master Update Function**
- `updateSettlementInteractions(deltaTime)` - Updates all systems
- Returns completion statistics

**6. Test Suite** (`tests/session3-tests.js`)
- 45 comprehensive tests, all passing ✓
- Test categories:
  - Proximity detection (5 tests)
  - Recruitment system (8 tests)
  - Siege mechanics (8 tests)
  - Ownership transfer (5 tests)
  - Edge cases (10 tests)
  - Integrated workflow (5 tests)
  - Performance (2 tests)
- Performance results:
  - Proximity checks: 0.06ms average
  - Settlement interactions: 0.02ms per update (20 sieges)
  - ✓ All targets met for 60 FPS

## Architecture

```
/game-logic
  /data
    settlements.json         - 250 settlement database
    terrain.json            - 100×200 terrain grid
    generateTerrain.js      - Terrain generation script

  /state
    queries.js              - Data access layer

  /systems
    movement.js             - Army movement and A* pathfinding
    settlement.js           - Settlement interactions, recruitment, sieges

  /tests
    session1-tests.js       - Test suite for Session 1
    session2-tests.js       - Test suite for Session 2
    session3-tests.js       - Test suite for Session 3

  DESIGN.md                 - Complete game vision and roadmap
  README.md                 - This file
```

## Design Principles

1. **Pure Logic** - Zero rendering dependencies, all game logic is data-driven
2. **Unity Portable** - Can be imported directly into Unity/C#
3. **Performance First** - Optimized for 200+ AI lords at 60 FPS
4. **Data-Driven** - All balance values in config files
5. **State Serialization** - Complete game state saves to JSON

## Running Tests

```bash
# Session 1: Foundation tests
node game-logic/tests/session1-tests.js
# Expected: 43/43 tests passing

# Session 2: Army movement tests
node game-logic/tests/session2-tests.js
# Expected: 43/43 tests passing

# Session 3: Settlement interaction tests
node game-logic/tests/session3-tests.js
# Expected: 45/45 tests passing
```

## Generating Terrain

```bash
# From game-logic/data directory
node generateTerrain.js

# Outputs: terrain.json with 100×200 grid
```

## Next Steps: Session 4 - AI Lords

### Planned Features:
- AI lord entity structure with personality traits
- Scoring system: (value/distance) × (1-garrison_strength) × personality
- Actions: recruit, attack weak targets, join allies
- Staggered updates (25 lords per second)
- Decision-making AI with action evaluation
- Personality types: aggressive, balanced, cautious

See `DESIGN.md` for complete 8-session development roadmap.

## Technical Specifications

- **Map Size**: 2000×4000 pixels (England to Pakistan)
- **Settlements**: 250 (cities/castles) + 465 villages
- **Terrain Grid**: 100×200 cells (20px per cell)
- **Target Performance**: 60 FPS with 200+ AI lords
- **Architecture**: Pure JavaScript (Node.js compatible)

## Data Access Examples

```javascript
const queries = require('./state/queries');
const movement = require('./systems/movement');

// === Session 1: Settlement & Terrain Queries ===

// Get a specific settlement
const london = queries.getSettlement('london_001');
console.log(london.name); // "London"

// Find settlements within 100 pixels of a point
const nearby = queries.findSettlementsInRadius(245, 890, 100);
console.log(`Found ${nearby.length} settlements`);

// Check terrain at coordinates
const cost = queries.getTerrainCost(1000, 2000);
console.log(`Movement cost: ${cost}x`); // 1.0, 1.5, 2.0, or 999

// Get all English settlements
const englandSettlements = queries.getSettlementsByOwner('england');
console.log(`England owns ${englandSettlements.length} settlements`);

// === Session 2: Army Movement ===

// Create an army at London
const army = movement.createArmy('lord_edmund', london.coordinates, [
  {type: 'infantry', count: 100, quality: 75},
  {type: 'archers', count: 50, quality: 70}
], 85); // morale

console.log(`Created army ${army.id} with ${movement.getTroopCount(army)} troops`);

// Set destination (automatically calculates path)
const paris = queries.getSettlement('paris_018');
movement.setDestination(army.id, paris.coordinates.x, paris.coordinates.y);

// Update movement (0.1 game-days)
movement.updateMovement(0.1);

console.log(`Army moved to (${army.position.x}, ${army.position.y})`);

// Find nearby armies
const nearbyArmies = movement.getArmiesInRadius(london.coordinates.x, london.coordinates.y, 200);
console.log(`Found ${nearbyArmies.length} armies near London`);

// Get all armies owned by a lord
const lordArmies = movement.getArmiesByOwner('lord_edmund');
console.log(`Lord Edmund controls ${lordArmies.length} armies`);

// === Session 3: Settlement Interaction ===

const settlement = require('./systems/settlement');

// Check what settlements army can interact with
const nearbySettlements = settlement.checkProximity(army.id);
console.log(`${nearbySettlements.length} settlements nearby`);

// Recruit at a settlement (if owned and in proximity)
const recruitResult = settlement.recruit(army.id, london.id);
if (recruitResult.success) {
  console.log(`Recruited ${recruitResult.recruitsAdded} troops!`);
}

// Move army to enemy settlement
army.position.x = paris.coordinates.x;
army.position.y = paris.coordinates.y;

// Check if can siege
const siegeCheck = settlement.canSiege(army.id, paris.id);
if (siegeCheck.canSiege) {
  // Start siege
  const siegeResult = settlement.initiateSiege(army.id, paris.id);
  console.log(`Siege started! ${siegeResult.siege.totalTime} days to capture`);

  // Update sieges over time (in game loop)
  settlement.updateSettlementInteractions(1.0); // Advance 1 game-day

  // Check progress
  const activeSiege = settlement.getArmySiege(army.id);
  console.log(`${activeSiege.timeRemaining} days remaining`);
}

// Get detailed info about nearby settlements
const detailedInfo = settlement.getNearbySettlementsInfo(army.id);
for (const info of detailedInfo) {
  console.log(`${info.name}: Can recruit: ${info.canRecruit}, Can siege: ${info.canSiege}`);
}
```

## Version History

- **Session 1** (Complete) - Foundation: Settlement database, terrain grid, query functions
- **Session 2** (Complete) - Army Movement: A* pathfinding, continuous movement, spatial queries
- **Session 3** (Complete) - Settlement Interaction: Recruitment, sieges, ownership transfer
- **Session 4** (Planned) - AI Lords: Decision-making and scoring
- **Session 5** (Planned) - Battle System: Wave-based combat
- **Session 6** (Planned) - Economy & Loyalty: Income, taxes, rebellions
- **Session 7** (Planned) - Political Systems: Vassalage and succession
- **Session 8** (Planned) - Integration & Polish: Game loop, save/load, fog of war

## License

Part of ActionRoguelike project

## Contact

See main repository for contact information
