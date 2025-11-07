# Medieval Grand Strategy Game - Game Logic

Pure JavaScript game logic for a medieval grand strategy game inspired by Mount & Blade Bannerlord mechanics and territorial.io visuals. This codebase is designed to be Unity-portable for future rendering and multiplayer implementation.

## Project Vision

A real-time strategy game where players start as minor nobles and expand through conquest, diplomacy, and political maneuvering. Features 200+ AI lords, territorial control, vassal systems, and wave-based tactical battles across a map spanning England to Pakistan.

## Current Status: Session 1 Complete ✓

### Session 1 Deliverables

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

## Architecture

```
/game-logic
  /data
    settlements.json         - 250 settlement database
    terrain.json            - 100×200 terrain grid
    generateTerrain.js      - Terrain generation script

  /state
    queries.js              - Data access layer

  /systems                  - (Future: movement, battle, economy, AI)

  /tests
    session1-tests.js       - Test suite for Session 1

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
# From project root
node game-logic/tests/session1-tests.js

# Expected output: 43/43 tests passing
```

## Generating Terrain

```bash
# From game-logic/data directory
node generateTerrain.js

# Outputs: terrain.json with 100×200 grid
```

## Next Steps: Session 2 - Army Movement

### Planned Features:
- Army entity structure (position, destination, troops, morale)
- A* pathfinding using terrain grid
- Continuous pixel-based movement
- Movement update loop
- Army spatial queries
- Collision detection

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

// Get database statistics
const stats = queries.getStatistics();
console.log(stats.settlements.total); // 250
```

## Version History

- **Session 1** (Current) - Foundation: Settlement database, terrain grid, query functions
- **Session 2** (Planned) - Army Movement: Pathfinding and continuous movement
- **Session 3** (Planned) - Settlement Interaction: Recruitment and sieges
- **Session 4** (Planned) - AI Lords: Decision-making and scoring
- **Session 5** (Planned) - Battle System: Wave-based combat
- **Session 6** (Planned) - Economy & Loyalty: Income, taxes, rebellions
- **Session 7** (Planned) - Political Systems: Vassalage and succession
- **Session 8** (Planned) - Integration & Polish: Game loop, save/load, fog of war

## License

Part of ActionRoguelike project

## Contact

See main repository for contact information
