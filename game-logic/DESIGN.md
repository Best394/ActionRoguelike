# Medieval Grand Strategy Game - Complete Design Document

## Core Vision

A real-time grand strategy game combining Mount & Blade Bannerlord's political/military mechanics with territorial.io's clean, performant visuals. Players start as minor nobles and expand through conquest, diplomacy, and political maneuvering while managing vassals and succession.

## Game Pillars

1. **Strategic Warfare** - Army management and tactical combat without micromanagement
2. **Political Maneuvering** - Vassal systems, loyalty, and kingdom management
3. **Dynamic AI** - 200+ AI lords making autonomous decisions
4. **Mobile Performance** - Minimal graphics, 60 FPS on weak hardware

## Technical Specifications

### Map & Scale
- **Canvas**: 2000x4000 pixels (England to Pakistan region)
- **Settlements**: 250 castles/cities, each with 2-5 attached villages
- **Territories**: Visual overlays (Voronoi coloring) for player clarity
- **Movement**: Continuous coordinate-based (like Bannerlord), not tile-locked
- **Terrain Grid**: 100x200 cells for pathfinding (20x20 pixel cells)

### Core Systems

#### 1. Army Movement
- Continuous pixel-based positioning with real-time movement
- A* pathfinding using terrain grid
- Base speed modified by terrain costs (plains 1.0x, forest 1.5x, mountains 2.0x)
- Armies can merge, split, and transfer troops
- Movement speed: 50-100 pixels per game-day (modified by terrain)

#### 2. Combat System
- **Trigger**: Opposing armies within 15 pixels
- **Format**: Wave-based battles (3-5 waves)
- **Tactics**: Players choose aggressive/defensive/flanking each wave
- **Resolution**: Casualties = base_damage × tactics_modifier × morale × troop_quality
- **Retreat**: Option between waves (20% troop loss penalty)
- **Victory**: Attacker wins = settlement siege begins, defender wins = attacker retreats

#### 3. Territory Control
- **Siege Mechanics**: Must reduce garrison to 0 to capture
- **Siege Duration**: 1-10 game-days based on fortification level
- **Village Transfer**: Attached villages change ownership with parent settlement
- **Garrison**: Auto-replenishes at 2-5 troops per game-day from prosperity

#### 4. Recruitment
- **Source**: Any owned settlement
- **Amount**: 5-10 troops per visit
- **Cooldown**: 7 game-days before settlement can recruit again
- **Quality**: Troops inherit settlement's troop_quality (50-100)

#### 5. Political Layer
- **Vassalization**: Territory cap = 30% of map (defeated lords become vassals)
- **Independence**: Territory cap = 50% of map (must manage directly)
- **Loyalty System**: 0-100%, affected by taxes, war losses, prosperity
- **Rebellion**: <30% loyalty = 5% daily rebellion chance
- **Succession**: Heir inherits personality traits, vassals may defect

#### 6. Economy
- **Income**: Each settlement generates daily_income based on prosperity × type_multiplier
  - City: prosperity × 2.0
  - Castle: prosperity × 1.0
  - Village: prosperity × 0.5
- **Taxes**: 0-30% rate, higher taxes reduce loyalty
- **Army Costs**: 1 gold per troop per day × quality_multiplier
- **Bankruptcy**: Negative treasury for 7 days = forced troop dismissal

#### 7. AI Lords
- **Count**: 200+ autonomous nobles
- **Decision Making**: Simple scoring system (Bannerlord-inspired)
  - Score = (settlement_value / distance) × (1 - garrison_strength) × personality_weight
- **Personalities**:
  - Aggressive (0.8-1.0): Prioritizes expansion
  - Balanced (0.4-0.7): Mix of defense and offense
  - Cautious (0.0-0.3): Defends territory, rare attacks
- **Actions**: Recruit, attack weak targets, join allied armies, defend territory
- **Update Frequency**: Staggered - 25 lords evaluate per second (8 second full cycle)

## Architecture

### Directory Structure
```
/game-logic (pure JavaScript, Unity-portable)
  /data
    - settlements.json (250 settlements with coordinates, stats)
    - terrain.json (100x200 grid with movement costs)
    - config.json (game constants and balance values)
  /systems
    - movement.js (army movement, pathfinding)
    - battle.js (combat resolution, tactics)
    - economy.js (income, expenses, loyalty)
    - ai.js (AI lord decision-making)
    - politics.js (vassalage, kingdoms, succession)
  /state
    - gameState.js (central state manager, save/load)
    - queries.js (data access functions)
/rendering (canvas prototype - discard for Unity)
  /map (territory coloring, settlement rendering)
  /ui (HUD, menus)
```

### Design Principles
- **Pure Logic**: game-logic folder has zero rendering dependencies
- **Unity Portable**: Can import game-logic directly into Unity/C#
- **Data-Driven**: All balance values in config files, not hardcoded
- **Performance First**: Stagger updates, minimize calculations
- **State Serialization**: Complete game state saves to JSON

## Development Roadmap (8-12 Sessions)

### Session 1: Foundation ✓ (Current)
**Deliverables**:
- DESIGN.md (this document)
- Settlement database: 250 settlements with realistic coordinates
  - Fields: id, name, type, coordinates {x,y}, owner, garrison, prosperity, attachedVillages[]
- Terrain grid: 100×200 cells with movement costs
  - Values: 1.0 (plains), 1.5 (forest), 2.0 (mountains), 999 (impassable)
- Query functions:
  - `getSettlement(id)` - Retrieve settlement by ID
  - `findSettlementsInRadius(x, y, radius)` - Spatial query
  - `getTerrainCost(x, y)` - Get movement cost at coordinate
- Test suite validating all queries

**Validation**: Can query settlements, terrain loads correctly, radius search works

---

### Session 2: Army Movement
**Prompt**:
"Build army movement system for 2000×4000 map using Session 1 data. Army entity structure: {id, position: {x,y}, destination: {x,y}, owner, troops: [], morale: 0-100, speed: base_speed}. Implement A* pathfinding using terrain grid from settlements.json. Movement rules: armies move at base_speed (50 px/day) modified by terrain cost. Include functions: createArmy(owner, position, troops), setDestination(armyId, x, y), updateMovement(deltaTime) - moves all armies toward destinations, getArmiesInRadius(x, y, radius). Army stops when within 5 pixels of destination."

**Deliverables**:
- /systems/movement.js
- Army data structure
- A* pathfinding implementation
- Movement update loop
- Spatial queries for armies

**Validation**: Create 10 test armies, set destinations, verify pathfinding around mountains, check arrival detection

---

### Session 3: Settlement Interaction
**Prompt**:
"Add settlement interaction system. When army within 10 pixels of settlement, enable actions: recruit(armyId, settlementId) - add 5-10 troops, set settlement recruitment_cooldown = 7 days; initiateSiege(armyId, settlementId) - if army_troops > garrison, start siege_timer (3 days for castle, 1 day for village); resolveSiege() - transfer settlement and attached villages to attacker. Include checkProximity(armyId) - returns nearby settlements, canRecruit(settlementId) - checks cooldown, canSiege(armyId, settlementId) - checks army strength vs garrison."

**Deliverables**:
- /systems/settlement.js
- Recruitment mechanics with cooldowns
- Basic siege system
- Ownership transfer logic
- Proximity detection

**Validation**: Move army to settlement, recruit troops (verify cooldown), capture weakly-defended castle, confirm villages transfer

---

### Session 4: AI Lord Behavior
**Prompt**:
"Create AI lord system. Lord structure: {id, name, personality: 0-1 (0=cautious, 1=aggressive), controlledArmies: [], controlledSettlements: [], treasury, kingdom}. Every 10 seconds, lord evaluates possible actions using scoring: score = (settlement_value / distance_in_pixels) × (1 - garrison_strength_ratio) × personality. Actions: 1) Recruit at owned settlement (score = 5 × personality), 2) Attack weak enemy settlement (score formula above), 3) Join nearby ally army if <50 pixels away (score = 3). Implement: evaluateActions(lordId) - returns sorted action list, executeTopAction(lordId), updateAllLords() - staggers updates (25 per second). Lords create new armies at owned settlements when recruiting."

**Deliverables**:
- /systems/ai.js
- AI lord data structure
- Scoring system for target evaluation
- Action execution (recruit, attack, support)
- Staggered update system (performance)

**Validation**: Spawn 50 AI lords, run 30 game-days, verify they recruit sensibly and attack weak targets, check staggering works

---

### Session 5: Battle System
**Prompt**:
"Implement wave-based battle system. When opposing armies within 15 pixels, trigger battle: {attackerId, defenderId, wave: 1, maxWaves: 3-5, attackerTactic: null, defenderTactic: null}. Each wave: both sides choose tactic (aggressive/defensive/flanking). Resolve wave: calculate casualties = (enemy_troops × 0.1) × tactic_modifier × morale_modifier × troop_quality_avg. Tactic modifiers: aggressive vs defensive = 0.8 attacker casualties, 1.2 defender; flanking vs aggressive = 1.3 attacker casualties, 0.7 defender; etc (rock-paper-scissors). After wave: allow retreat (20% troop loss), or continue. Battle ends when one side eliminated or retreats. Functions: initiateBattle(), resolveCombatWave(), applyTactics(), handleRetreat(), declareVictor()."

**Deliverables**:
- /systems/battle.js
- Battle state manager
- Wave resolution logic
- Tactic system (rock-paper-scissors)
- Retreat mechanics
- Casualty calculation

**Validation**: Force two armies to collide, simulate full battle with tactic choices, verify casualties apply correctly, test retreat

---

### Session 6: Economy & Loyalty
**Prompt**:
"Add economic layer. Daily income calculation: for each settlement, income = prosperity × type_multiplier (city: 2.0, castle: 1.0, village: 0.5). Lords set tax_rate (0-30%) affecting loyalty: loyalty_change = -5% at 10% tax, -15% at 30% tax. Army maintenance: daily_cost = total_troops × troop_quality_avg × 1.0 gold. Track lord treasury: income - expenses. If negative for 7 consecutive days, forced to disband weakest army. Loyalty affects rebellion: if loyalty < 30%, 5% daily chance settlement rebels (transfers to neutral/nearest enemy). Functions: processDailyIncome(), calculateTaxes(), payArmyMaintenance(), checkBankruptcy(), checkRebellions()."

**Deliverables**:
- /systems/economy.js
- Income generation per settlement
- Tax system with loyalty impact
- Army maintenance costs
- Bankruptcy penalties
- Rebellion system

**Validation**: Run 30 game-days, verify income/expenses balance, set high taxes and trigger rebellion, bankrupt lord and check army dismissal

---

### Session 7: Political Systems
**Prompt**:
"Implement vassal/kingdom system. Kingdom structure: {id, ruler, vassals: [], color}. Lords have territory_cap based on status: vassal = 30% of map (75 settlements), independent = 50% (125 settlements). When lord defeated in battle with <20% troops remaining, offer vassalization: they join victor's kingdom, keep settlements, gain protection. If lord exceeds cap, must grant settlements to vassals or grant independence. Succession: when lord dies (1% chance per year at age 60+), heir inherits with personality_variance ±0.2. Functions: proposeVassalization(), acceptVassalage(), checkTerritoryCaps(), enforceCapLimits(), triggerSuccession()."

**Deliverables**:
- /systems/politics.js
- Kingdom/vassal structure
- Territory cap enforcement
- Vassalization mechanics
- Succession with heir system
- Loyalty tracking between vassal and liege

**Validation**: Create kingdom with 3 vassals, test territory cap enforcement, force succession event, verify heir inherits correctly

---

### Session 8: Integration & Polish
**Prompt**:
"Create main game loop controller. GameState class orchestrates all systems: each tick (100ms real-time = 1 game-hour), update armies, process AI decisions (staggered), resolve battles, calculate economy, check loyalty events. Add time controls: pause, 1× speed (1 game-day = 24 seconds), 3× speed. Implement save/load: serialize entire game state to JSON (armies, lords, settlements, battles). Add fog of war: track last_seen timestamp per settlement, hide enemy armies not seen for 2 game-days. Performance monitoring: log update time per system, warn if >16ms (below 60 FPS). Functions: gameLoop(), saveGame(), loadGame(), getVisibleEntities(lordId)."

**Deliverables**:
- /state/gameState.js
- Master game loop
- Time progression controls
- Complete save/load system
- Fog of war implementation
- Performance monitoring

**Validation**: Run 100 game-days with 200 AI lords, verify 60 FPS, save and load mid-game, check fog of war hides enemies

---

### Session 9-12: Advanced Features (Optional)

**Session 9**: Troop Types & Quality
- Add unit types: infantry, archers, cavalry
- Rock-paper-scissors combat modifiers
- Training systems to improve troop quality

**Session 10**: Supply Lines & Attrition
- Armies need supply from owned settlements
- Deep enemy territory causes attrition
- Raiding for supplies

**Session 11**: Cultural Bonuses & Religions
- Regions have cultures (English, French, Turkish, etc.)
- Culture bonuses for defending home territory
- Loyalty penalties for foreign rulers

**Session 12**: Scenario System & Balance
- Historical scenarios (1066 Norman Conquest, 1187 Crusades)
- Win conditions (unify map, economic victory)
- AI personality templates (honorable, treacherous, cowardly)
- Balance pass on all formulas

## Data Specifications

### Settlement Schema
```javascript
{
  id: "london_001",
  name: "London",
  type: "city", // city, castle, village
  coordinates: {x: 245, y: 890},
  owner: "england", // kingdom ID
  garrison: 150, // troops defending
  prosperity: 100, // 0-100, affects income
  fortification: 3, // 1-5, affects siege time
  recruitmentCooldown: 0, // days until can recruit
  troopQuality: 75, // 50-100, affects combat
  attachedVillages: ["london_village_001", "london_village_002"]
}
```

### Terrain Grid Schema
```javascript
{
  width: 100,
  height: 200,
  cellSize: 20, // pixels
  costs: [ // 20000 values
    1.0, 1.0, 1.5, 2.0, 1.0, // row 0
    // ... 19995 more values
  ]
}
```

### Army Schema
```javascript
{
  id: "army_001",
  owner: "lord_042",
  position: {x: 1250, y: 2300},
  destination: {x: 1400, y: 2400},
  velocity: {x: 0, y: 0},
  troops: [
    {type: "infantry", count: 45, quality: 70},
    {type: "archers", count: 20, quality: 65}
  ],
  morale: 85, // 0-100
  speed: 50, // pixels per game-day
  isMoving: true,
  inBattle: false
}
```

### Lord Schema
```javascript
{
  id: "lord_042",
  name: "Duke Edmund",
  personality: 0.75, // 0=cautious, 1=aggressive
  controlledArmies: ["army_001", "army_003"],
  controlledSettlements: ["london_001", "dover_005"],
  treasury: 5420,
  kingdom: "england", // null if independent
  age: 38,
  heir: "lord_105"
}
```

## Performance Targets

- **Target FPS**: 60 (16ms frame budget)
- **AI Update Budget**: 5ms per frame (25 lords @ 0.2ms each)
- **Pathfinding**: <1ms per army (cache paths, update every 5 seconds)
- **Battle Resolution**: <2ms per battle
- **Rendering**: <8ms (handled by Unity, not game-logic)
- **Total Entities**: 200 lords, 250 settlements, 500+ armies

## Balance Constants

```javascript
const GAME_CONFIG = {
  // Map
  MAP_WIDTH: 2000,
  MAP_HEIGHT: 4000,
  TERRAIN_CELL_SIZE: 20,

  // Movement
  BASE_ARMY_SPEED: 50, // pixels per game-day
  ARRIVAL_THRESHOLD: 5, // pixels

  // Combat
  BATTLE_TRIGGER_RANGE: 15, // pixels
  WAVES_PER_BATTLE: 3,
  BASE_CASUALTY_RATE: 0.1, // 10% per wave
  RETREAT_PENALTY: 0.2, // lose 20% on retreat

  // Recruitment
  TROOPS_PER_RECRUITMENT: [5, 10], // min, max
  RECRUITMENT_COOLDOWN: 7, // game-days

  // Economy
  CITY_INCOME_MULT: 2.0,
  CASTLE_INCOME_MULT: 1.0,
  VILLAGE_INCOME_MULT: 0.5,
  TROOP_COST_PER_DAY: 1.0,

  // Politics
  VASSAL_TERRITORY_CAP: 0.30, // 30% of map
  INDEPENDENT_TERRITORY_CAP: 0.50, // 50% of map
  REBELLION_LOYALTY_THRESHOLD: 30,
  REBELLION_CHANCE: 0.05, // 5% daily

  // AI
  AI_UPDATE_INTERVAL: 10, // seconds
  AI_LORDS_PER_UPDATE: 25,

  // Time
  GAME_HOURS_PER_TICK: 1,
  TICK_INTERVAL_MS: 100,
  GAME_DAYS_PER_YEAR: 365
};
```

## Unity Integration Plan (Post-Session 8)

1. **Import game-logic**: Copy folder to Unity Assets/Scripts/GameLogic
2. **Rendering Layer**: Create C# wrapper that reads game state and renders:
   - Voronoi territory coloring
   - Settlement icons (castle/city sprites)
   - Army dots (colored circles)
   - Simple UI overlay
3. **Netcode**: Use Unity Netcode for GameObjects
   - Server runs game-logic
   - Clients receive state updates (60Hz)
   - Input lag compensation for army movement
4. **Multiplayer**: 8-12 player matches, each controls one lord

## Success Metrics

- **Performance**: 200 AI lords at 60 FPS
- **Depth**: 8+ hours single-player campaign
- **Balance**: AI can win vs player without cheating
- **Polish**: Intuitive UI, clear feedback on actions
- **Multiplayer**: 8 players stable for 2+ hour matches

## Current Status

**Session 1**: Complete
- Settlement database created
- Terrain grid generated
- Query functions implemented
- Test suite passing

**Next Session**: Session 2 - Army Movement System
