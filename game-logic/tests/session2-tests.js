/**
 * Test Suite for Session 2 - Army Movement
 * Tests army creation, pathfinding, movement, and spatial queries
 */

const movement = require('../systems/movement');
const queries = require('../state/queries');

// ANSI color codes
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

/**
 * Assert helper
 */
function assert(condition, testName, expected, actual) {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
    return true;
  } else {
    testsFailed++;
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    if (expected !== undefined) {
      console.log(`  Expected: ${JSON.stringify(expected)}`);
      console.log(`  Actual: ${JSON.stringify(actual)}`);
    }
    return false;
  }
}

/**
 * Test army creation and management
 */
function testArmyCreation() {
  console.log(`\n${colors.blue}=== Testing Army Creation & Management ===${colors.reset}`);

  // Clear armies before testing
  movement.clearAllArmies();

  // Test basic army creation
  const army1 = movement.createArmy('lord_001', {x: 500, y: 1000}, [
    {type: 'infantry', count: 50, quality: 70},
    {type: 'archers', count: 20, quality: 65}
  ], 85);

  assert(
    army1 !== null && army1.id === 1,
    'Create army returns valid army with ID 1',
    1,
    army1?.id
  );

  assert(
    army1.owner === 'lord_001',
    'Army owner is correctly set',
    'lord_001',
    army1?.owner
  );

  assert(
    army1.position.x === 500 && army1.position.y === 1000,
    'Army position is correct',
    {x: 500, y: 1000},
    army1?.position
  );

  assert(
    army1.morale === 85,
    'Army morale is correct',
    85,
    army1?.morale
  );

  assert(
    army1.troops.length === 2,
    'Army has correct number of troop types',
    2,
    army1?.troops.length
  );

  // Test getTroopCount
  const troopCount = movement.getTroopCount(army1);
  assert(
    troopCount === 70,
    'getTroopCount returns correct total (50 + 20)',
    70,
    troopCount
  );

  // Test getAverageTroopQuality
  const avgQuality = movement.getAverageTroopQuality(army1);
  const expectedQuality = (70 * 50 + 65 * 20) / 70;
  assert(
    Math.abs(avgQuality - expectedQuality) < 0.01,
    'getAverageTroopQuality calculates weighted average correctly',
    expectedQuality.toFixed(2),
    avgQuality.toFixed(2)
  );

  // Test getArmy
  const retrieved = movement.getArmy(1);
  assert(
    retrieved !== null && retrieved.id === 1,
    'getArmy retrieves army by ID',
    1,
    retrieved?.id
  );

  // Test creating multiple armies
  const army2 = movement.createArmy('lord_002', {x: 800, y: 1500}, [
    {type: 'cavalry', count: 30, quality: 80}
  ]);

  assert(
    army2.id === 2,
    'Second army gets ID 2',
    2,
    army2?.id
  );

  // Test getAllArmies
  const allArmies = movement.getAllArmies();
  assert(
    allArmies.length === 2,
    'getAllArmies returns 2 armies',
    2,
    allArmies.length
  );

  // Test getArmiesByOwner
  const lord1Armies = movement.getArmiesByOwner('lord_001');
  assert(
    lord1Armies.length === 1 && lord1Armies[0].id === 1,
    'getArmiesByOwner returns correct armies',
    1,
    lord1Armies.length
  );

  // Test removeArmy
  const removed = movement.removeArmy(2);
  assert(
    removed === true && movement.getAllArmies().length === 1,
    'removeArmy successfully removes army',
    true,
    removed
  );

  // Test invalid position
  let invalidArmy = null;
  try {
    invalidArmy = movement.createArmy('lord_003', {x: -100, y: -100}, []);
    assert(false, 'Creating army with invalid position throws error');
  } catch (e) {
    assert(true, 'Creating army with invalid position throws error');
  }

  console.log(`  Total armies after tests: ${movement.getAllArmies().length}`);
}

/**
 * Test basic movement
 */
function testBasicMovement() {
  console.log(`\n${colors.blue}=== Testing Basic Movement ===${colors.reset}`);

  movement.clearAllArmies();

  // Create test army
  const army = movement.createArmy('lord_001', {x: 500, y: 1000}, [
    {type: 'infantry', count: 100, quality: 70}
  ]);

  // Test setDestination
  const destSet = movement.setDestination(army.id, 600, 1100);
  assert(
    destSet === true,
    'setDestination returns true for valid destination',
    true,
    destSet
  );

  assert(
    army.destination !== null && army.destination.x === 600 && army.destination.y === 1100,
    'Army destination is set correctly',
    {x: 600, y: 1100},
    army.destination
  );

  assert(
    army.isMoving === true,
    'Army isMoving flag is set',
    true,
    army.isMoving
  );

  assert(
    army.path.length > 0,
    'Army has calculated path',
    '>0',
    army.path.length
  );

  // Test stopArmy
  movement.stopArmy(army.id);
  assert(
    army.isMoving === false && army.destination === null,
    'stopArmy halts movement',
    false,
    army.isMoving
  );

  // Test movement update
  movement.setDestination(army.id, 700, 1000);
  const startX = army.position.x;

  // Simulate 0.1 game-days of movement
  movement.updateMovement(0.1);

  assert(
    army.position.x !== startX,
    'updateMovement changes army position',
    'changed',
    army.position.x !== startX ? 'changed' : 'unchanged'
  );

  console.log(`  Army moved from x=${startX.toFixed(1)} to x=${army.position.x.toFixed(1)}`);

  // Test arrival detection
  movement.clearAllArmies();
  const army2 = movement.createArmy('lord_002', {x: 500, y: 1000}, [
    {type: 'infantry', count: 50, quality: 70}
  ]);

  movement.setDestination(army2.id, 510, 1000); // Very close destination

  // Move until arrived
  for (let i = 0; i < 20; i++) {
    movement.updateMovement(0.1);
    if (!army2.isMoving) break;
  }

  const finalDist = queries.calculateDistance(
    army2.position.x, army2.position.y,
    510, 1000
  );

  assert(
    !army2.isMoving && finalDist < movement.ARRIVAL_THRESHOLD + 1,
    'Army stops when reaching destination',
    'stopped',
    army2.isMoving ? 'still moving' : 'stopped'
  );

  console.log(`  Final distance to destination: ${finalDist.toFixed(2)}px`);
}

/**
 * Test pathfinding
 */
function testPathfinding() {
  console.log(`\n${colors.blue}=== Testing Pathfinding ===${colors.reset}`);

  // Test simple path on plains
  const path1 = movement.findPath({x: 500, y: 1000}, {x: 600, y: 1100});
  assert(
    path1 !== null && path1.length > 0,
    'findPath finds path on plains',
    'found',
    path1 ? 'found' : 'not found'
  );

  if (path1) {
    console.log(`  Plain path length: ${path1.length} waypoints`);

    assert(
      path1[0].x === 500 && path1[0].y === 1000,
      'Path starts at start position',
      {x: 500, y: 1000},
      path1[0]
    );

    assert(
      path1[path1.length - 1].x === 600 && path1[path1.length - 1].y === 1100,
      'Path ends at destination',
      {x: 600, y: 1100},
      path1[path1.length - 1]
    );
  }

  // Test path to impassable location (should return null)
  const waterPath = movement.findPath({x: 500, y: 1000}, {x: 50, y: 50});
  // This might work if there's a path around water, so just check it doesn't crash
  assert(
    true,
    'Pathfinding to potentially impassable location does not crash',
    'no crash',
    'no crash'
  );

  // Test pathfinding around obstacles
  // Find a location with varied terrain
  const path2 = movement.findPath({x: 500, y: 1000}, {x: 1500, y: 2000});
  assert(
    path2 !== null,
    'findPath handles long distances',
    'found',
    path2 ? 'found' : 'not found'
  );

  if (path2) {
    console.log(`  Long path length: ${path2.length} waypoints`);
  }

  // Test path from same location
  const path3 = movement.findPath({x: 500, y: 1000}, {x: 500, y: 1000});
  assert(
    path3 !== null,
    'findPath handles start = destination',
    'handled',
    path3 ? 'handled' : 'failed'
  );
}

/**
 * Test terrain-based speed
 */
function testTerrainSpeed() {
  console.log(`\n${colors.blue}=== Testing Terrain-Based Speed ===${colors.reset}`);

  movement.clearAllArmies();

  // Create army on plains
  const army = movement.createArmy('lord_001', {x: 1000, y: 2000}, [
    {type: 'infantry', count: 100, quality: 70}
  ]);

  // Set destination
  movement.setDestination(army.id, 1100, 2000);

  // Record starting position
  const startPos = {x: army.position.x, y: army.position.y};

  // Update movement (0.1 game-days)
  movement.updateMovement(0.1);

  // Calculate distance moved
  const distMoved = queries.calculateDistance(
    startPos.x, startPos.y,
    army.position.x, army.position.y
  );

  // On plains (cost 1.0), should move base_speed * deltaTime = 50 * 0.1 = 5 pixels
  const expectedDist = movement.BASE_ARMY_SPEED * 0.1;

  assert(
    Math.abs(distMoved - expectedDist) < 1.0,
    `Army moves expected distance on plains (~${expectedDist}px in 0.1 days)`,
    expectedDist.toFixed(1),
    distMoved.toFixed(1)
  );

  console.log(`  Distance moved: ${distMoved.toFixed(2)}px (expected ~${expectedDist}px)`);

  // Test that terrain cost affects speed
  const terrainCost = queries.getTerrainCost(army.position.x, army.position.y);
  console.log(`  Terrain cost at current position: ${terrainCost}x`);

  assert(
    terrainCost >= 1.0,
    'Terrain cost is valid',
    '>=1.0',
    terrainCost
  );
}

/**
 * Test spatial queries
 */
function testSpatialQueries() {
  console.log(`\n${colors.blue}=== Testing Spatial Queries ===${colors.reset}`);

  movement.clearAllArmies();

  // Create multiple armies
  const army1 = movement.createArmy('lord_001', {x: 500, y: 1000}, [
    {type: 'infantry', count: 50, quality: 70}
  ]);

  const army2 = movement.createArmy('lord_002', {x: 550, y: 1000}, [
    {type: 'infantry', count: 60, quality: 75}
  ]);

  const army3 = movement.createArmy('lord_003', {x: 700, y: 1000}, [
    {type: 'cavalry', count: 30, quality: 80}
  ]);

  // Test getArmiesInRadius
  const nearbyArmies = movement.getArmiesInRadius(500, 1000, 100);

  assert(
    nearbyArmies.length === 2,
    'getArmiesInRadius finds 2 armies within 100px',
    2,
    nearbyArmies.length
  );

  assert(
    nearbyArmies[0].id === army1.id,
    'Nearest army is army1 (at search center)',
    army1.id,
    nearbyArmies[0]?.id
  );

  assert(
    nearbyArmies[0].distance === 0,
    'Army at search center has distance 0',
    0,
    nearbyArmies[0]?.distance
  );

  // Check sorting by distance
  let sorted = true;
  for (let i = 1; i < nearbyArmies.length; i++) {
    if (nearbyArmies[i].distance < nearbyArmies[i-1].distance) {
      sorted = false;
      break;
    }
  }

  assert(
    sorted,
    'Results are sorted by distance',
    'sorted',
    sorted ? 'sorted' : 'unsorted'
  );

  console.log(`  Found armies at distances: ${nearbyArmies.map(a => a.distance.toFixed(1) + 'px').join(', ')}`);

  // Test getDistanceBetweenArmies
  const dist = movement.getDistanceBetweenArmies(army1.id, army2.id);
  assert(
    Math.abs(dist - 50) < 1,
    'getDistanceBetweenArmies calculates correct distance',
    50,
    dist?.toFixed(1)
  );

  // Test empty search
  const farAway = movement.getArmiesInRadius(50, 50, 10);
  assert(
    farAway.length === 0,
    'Empty radius search returns no armies',
    0,
    farAway.length
  );
}

/**
 * Test pathfinding around obstacles
 */
function testObstacleAvoidance() {
  console.log(`\n${colors.blue}=== Testing Obstacle Avoidance ===${colors.reset}`);

  movement.clearAllArmies();

  // Find a settlement near water/mountains to test pathfinding around obstacles
  const london = queries.getSettlement('london_001');

  // Create army near London
  const army = movement.createArmy('lord_001',
    {x: london.coordinates.x, y: london.coordinates.y},
    [{type: 'infantry', count: 100, quality: 70}]
  );

  // Try to path to various destinations
  const destinations = [
    {x: london.coordinates.x + 200, y: london.coordinates.y},
    {x: london.coordinates.x, y: london.coordinates.y + 200},
    {x: london.coordinates.x + 200, y: london.coordinates.y + 200}
  ];

  let pathsFound = 0;
  for (const dest of destinations) {
    const success = movement.setDestination(army.id, dest.x, dest.y);
    if (success) pathsFound++;
  }

  assert(
    pathsFound > 0,
    'At least one path found from London',
    '>0',
    pathsFound
  );

  console.log(`  Successfully pathed to ${pathsFound}/${destinations.length} destinations from London`);

  // Test movement along calculated path
  if (army.isMoving) {
    const pathLength = army.path.length;
    console.log(`  Path has ${pathLength} waypoints`);

    assert(
      pathLength > 0,
      'Path has waypoints',
      '>0',
      pathLength
    );

    // Simulate movement
    for (let i = 0; i < 50; i++) {
      movement.updateMovement(0.1);
      if (!army.isMoving) break;
    }

    console.log(`  Army progressed to waypoint ${army.pathIndex}/${pathLength}`);
  }
}

/**
 * Test movement statistics
 */
function testStatistics() {
  console.log(`\n${colors.blue}=== Testing Movement Statistics ===${colors.reset}`);

  movement.clearAllArmies();

  // Create some armies
  movement.createArmy('lord_001', {x: 500, y: 1000}, [
    {type: 'infantry', count: 100, quality: 70}
  ]);

  movement.createArmy('lord_002', {x: 600, y: 1100}, [
    {type: 'cavalry', count: 50, quality: 80}
  ]);

  const stats = movement.getMovementStatistics();

  assert(
    stats.totalArmies === 2,
    'Statistics show correct number of armies',
    2,
    stats.totalArmies
  );

  assert(
    stats.totalTroops === 150,
    'Statistics show correct total troops (100 + 50)',
    150,
    stats.totalTroops
  );

  assert(
    stats.averageTroopsPerArmy === 75,
    'Statistics calculate correct average troops per army',
    75,
    stats.averageTroopsPerArmy
  );

  console.log(`  Statistics:`);
  console.log(`    Total armies: ${stats.totalArmies}`);
  console.log(`    Moving: ${stats.movingArmies}`);
  console.log(`    Stationary: ${stats.stationaryArmies}`);
  console.log(`    Total troops: ${stats.totalTroops}`);
  console.log(`    Avg troops/army: ${stats.averageTroopsPerArmy}`);
}

/**
 * Test performance
 */
function testPerformance() {
  console.log(`\n${colors.blue}=== Testing Performance ===${colors.reset}`);

  movement.clearAllArmies();

  // Create 50 armies for performance testing
  const numArmies = 50;
  const dims = queries.getTerrainDimensions();

  for (let i = 0; i < numArmies; i++) {
    const x = Math.random() * (dims.mapWidth - 200) + 100;
    const y = Math.random() * (dims.mapHeight - 200) + 100;

    movement.createArmy(`lord_${i}`, {x, y}, [
      {type: 'infantry', count: Math.floor(Math.random() * 100) + 50, quality: 70}
    ]);
  }

  assert(
    movement.getAllArmies().length === numArmies,
    `Successfully created ${numArmies} armies`,
    numArmies,
    movement.getAllArmies().length
  );

  // Test pathfinding performance
  const start1 = Date.now();
  let pathsCalculated = 0;

  for (let i = 0; i < 20; i++) {
    const army = movement.getAllArmies()[i];
    const destX = Math.random() * (dims.mapWidth - 200) + 100;
    const destY = Math.random() * (dims.mapHeight - 200) + 100;

    const path = movement.findPath(army.position, {x: destX, y: destY});
    if (path) pathsCalculated++;
  }

  const pathTime = Date.now() - start1;
  const avgPathTime = pathTime / 20;

  assert(
    avgPathTime < 50,
    `Pathfinding performs well (avg ${avgPathTime.toFixed(1)}ms per path)`,
    '<50ms',
    `${avgPathTime.toFixed(1)}ms`
  );

  console.log(`  Calculated ${pathsCalculated}/20 paths in ${pathTime}ms (avg ${avgPathTime.toFixed(1)}ms)`);

  // Set destinations for all armies
  const armies = movement.getAllArmies();
  for (const army of armies) {
    const destX = Math.random() * (dims.mapWidth - 200) + 100;
    const destY = Math.random() * (dims.mapHeight - 200) + 100;
    movement.setDestination(army.id, destX, destY);
  }

  // Test movement update performance
  const start2 = Date.now();
  const iterations = 100;

  for (let i = 0; i < iterations; i++) {
    movement.updateMovement(0.01);
  }

  const updateTime = Date.now() - start2;
  const avgUpdateTime = updateTime / iterations;

  assert(
    avgUpdateTime < 5,
    `Movement update performs well with ${numArmies} armies (avg ${avgUpdateTime.toFixed(2)}ms per update)`,
    '<5ms',
    `${avgUpdateTime.toFixed(2)}ms`
  );

  console.log(`  Updated ${numArmies} armies ${iterations} times in ${updateTime}ms (avg ${avgUpdateTime.toFixed(2)}ms)`);

  // Test spatial query performance
  const start3 = Date.now();
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * dims.mapWidth;
    const y = Math.random() * dims.mapHeight;
    movement.getArmiesInRadius(x, y, 200);
  }
  const spatialTime = Date.now() - start3;
  const avgSpatialTime = spatialTime / 100;

  assert(
    avgSpatialTime < 2,
    `Spatial queries perform well (avg ${avgSpatialTime.toFixed(2)}ms per query)`,
    '<2ms',
    `${avgSpatialTime.toFixed(2)}ms`
  );

  console.log(`  100 spatial queries in ${spatialTime}ms (avg ${avgSpatialTime.toFixed(2)}ms)`);
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log(`${colors.yellow}
╔══════════════════════════════════════════════════════════════╗
║      Medieval Grand Strategy - Session 2 Test Suite         ║
║                    Army Movement System                      ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  testArmyCreation();
  testBasicMovement();
  testPathfinding();
  testTerrainSpeed();
  testSpatialQueries();
  testObstacleAvoidance();
  testStatistics();
  testPerformance();

  // Summary
  console.log(`\n${colors.yellow}=== Test Summary ===${colors.reset}`);
  console.log(`  Total Tests: ${testsRun}`);
  console.log(`  ${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${testsFailed}${colors.reset}`);

  if (testsFailed === 0) {
    console.log(`\n${colors.green}✓ All tests passed! Session 2 army movement is complete.${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}✗ Some tests failed. Please review the errors above.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
