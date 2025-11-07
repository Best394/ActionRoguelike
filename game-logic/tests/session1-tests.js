/**
 * Test Suite for Session 1 - Foundation
 * Tests settlement database, terrain grid, and query functions
 */

const queries = require('../state/queries');

// ANSI color codes for console output
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
 * Assert helper function
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
 * Test initialization
 */
function testInitialization() {
  console.log(`\n${colors.blue}=== Testing Data Initialization ===${colors.reset}`);

  try {
    queries.initializeData();
    assert(true, 'Data files load without errors');

    const stats = queries.getStatistics();
    assert(
      stats.settlements.total === 250,
      'Settlement count is 250',
      250,
      stats.settlements.total
    );

    assert(
      stats.terrain.totalCells === 20000,
      'Terrain grid has 20,000 cells (100x200)',
      20000,
      stats.terrain.totalCells
    );

    console.log(`\n  Database Statistics:`);
    console.log(`    Settlements: ${stats.settlements.total}`);
    console.log(`    Cities: ${stats.settlements.cities}`);
    console.log(`    Castles: ${stats.settlements.castles}`);
    console.log(`    Villages: ${stats.settlements.villages}`);
    console.log(`    Kingdoms: ${stats.settlements.kingdoms}`);
    console.log(`    Terrain: ${stats.terrain.dimensions}`);
    console.log(`    Map Size: ${stats.terrain.mapSize}`);

  } catch (error) {
    assert(false, 'Data initialization', 'No errors', error.message);
  }
}

/**
 * Test settlement queries
 */
function testSettlementQueries() {
  console.log(`\n${colors.blue}=== Testing Settlement Queries ===${colors.reset}`);

  // Test getSettlement
  const london = queries.getSettlement('london_001');
  assert(
    london !== null && london.name === 'London',
    'getSettlement("london_001") returns London',
    'London',
    london?.name
  );

  assert(
    london.type === 'city',
    'London is type "city"',
    'city',
    london?.type
  );

  assert(
    london.coordinates.x === 245 && london.coordinates.y === 890,
    'London coordinates are correct',
    {x: 245, y: 890},
    london?.coordinates
  );

  assert(
    london.attachedVillages.length >= 2,
    'London has attached villages',
    '>=2',
    london?.attachedVillages.length
  );

  // Test non-existent settlement
  const fake = queries.getSettlement('nonexistent_999');
  assert(
    fake === null,
    'Non-existent settlement returns null',
    null,
    fake
  );

  // Test getAllSettlements
  const all = queries.getAllSettlements();
  assert(
    all.length === 250,
    'getAllSettlements returns 250 settlements',
    250,
    all.length
  );

  // Test getSettlementsByOwner
  const englandSettlements = queries.getSettlementsByOwner('england');
  assert(
    englandSettlements.length > 0,
    'England owns at least one settlement',
    '>0',
    englandSettlements.length
  );
  console.log(`    England owns ${englandSettlements.length} settlements`);

  // Test getSettlementsByType
  const cities = queries.getSettlementsByType('city');
  const castles = queries.getSettlementsByType('castle');
  assert(
    cities.length > 0 && castles.length > 0,
    'Both cities and castles exist',
    'cities>0 && castles>0',
    `cities:${cities.length}, castles:${castles.length}`
  );
  console.log(`    Cities: ${cities.length}, Castles: ${castles.length}`);

  // Test major settlements exist
  const majorCities = ['paris_018', 'constantinople_069', 'baghdad_094', 'delhi_106'];
  for (const cityId of majorCities) {
    const city = queries.getSettlement(cityId);
    assert(
      city !== null,
      `Major city ${cityId} exists`,
      'exists',
      city ? 'exists' : 'missing'
    );
  }
}

/**
 * Test spatial queries
 */
function testSpatialQueries() {
  console.log(`\n${colors.blue}=== Testing Spatial Queries ===${colors.reset}`);

  // Test findSettlementsInRadius around London
  const londonCoords = queries.getSettlement('london_001').coordinates;
  const nearLondon = queries.findSettlementsInRadius(londonCoords.x, londonCoords.y, 100);

  assert(
    nearLondon.length > 0,
    'Finds settlements within 100 pixels of London',
    '>0',
    nearLondon.length
  );

  assert(
    nearLondon[0].id === 'london_001',
    'Nearest settlement to London is London itself',
    'london_001',
    nearLondon[0]?.id
  );

  assert(
    nearLondon[0].distance === 0,
    'Distance to London from London is 0',
    0,
    nearLondon[0]?.distance
  );

  console.log(`    Found ${nearLondon.length} settlements within 100px of London`);

  // Test that results are sorted by distance
  let sorted = true;
  for (let i = 1; i < nearLondon.length; i++) {
    if (nearLondon[i].distance < nearLondon[i-1].distance) {
      sorted = false;
      break;
    }
  }
  assert(
    sorted,
    'Results are sorted by distance (closest first)',
    'sorted',
    sorted ? 'sorted' : 'unsorted'
  );

  // Test getNearestSettlement
  const testPoint = {x: 500, y: 1000};
  const nearest = queries.getNearestSettlement(testPoint.x, testPoint.y);
  assert(
    nearest !== null && nearest.distance >= 0,
    'getNearestSettlement returns valid result',
    'valid',
    nearest ? 'valid' : 'invalid'
  );
  console.log(`    Nearest to (500,1000): ${nearest.name} at ${nearest.distance.toFixed(1)}px`);

  // Test calculateDistance
  const dist = queries.calculateDistance(0, 0, 300, 400);
  assert(
    Math.abs(dist - 500) < 0.01,
    'calculateDistance correctly computes Euclidean distance',
    500,
    dist
  );

  // Test empty radius search
  const empty = queries.findSettlementsInRadius(9999, 9999, 10);
  assert(
    empty.length === 0,
    'No settlements found in empty region',
    0,
    empty.length
  );
}

/**
 * Test terrain queries
 */
function testTerrainQueries() {
  console.log(`\n${colors.blue}=== Testing Terrain Queries ===${colors.reset}`);

  // Test terrain dimensions
  const dims = queries.getTerrainDimensions();
  assert(
    dims.width === 100 && dims.height === 200,
    'Terrain grid is 100x200 cells',
    '100x200',
    `${dims.width}x${dims.height}`
  );

  assert(
    dims.mapWidth === 2000 && dims.mapHeight === 4000,
    'Map size is 2000x4000 pixels',
    '2000x4000',
    `${dims.mapWidth}x${dims.mapHeight}`
  );

  assert(
    dims.cellSize === 20,
    'Cell size is 20 pixels',
    20,
    dims.cellSize
  );

  // Test getTerrainCost
  const cost1 = queries.getTerrainCost(1000, 2000);
  assert(
    cost1 >= 1.0,
    'getTerrainCost returns valid movement cost',
    '>=1.0',
    cost1
  );

  // Test terrain cost values are valid
  const testPoints = [
    {x: 500, y: 1000},
    {x: 1500, y: 2500},
    {x: 1000, y: 3000}
  ];

  let allValidCosts = true;
  for (const point of testPoints) {
    const cost = queries.getTerrainCost(point.x, point.y);
    if (cost !== 1.0 && cost !== 1.5 && cost !== 2.0 && cost !== 999) {
      allValidCosts = false;
      break;
    }
  }
  assert(
    allValidCosts,
    'All terrain costs are valid values (1.0, 1.5, 2.0, or 999)',
    'valid',
    allValidCosts ? 'valid' : 'invalid'
  );

  // Test pixelToCell conversion
  const cell = queries.pixelToCell(1000, 2000);
  assert(
    cell.cellX === 50 && cell.cellY === 100,
    'pixelToCell correctly converts (1000, 2000) to cell (50, 100)',
    {cellX: 50, cellY: 100},
    cell
  );

  // Test isPassable
  const passable1 = queries.isPassable(1000, 2000);
  assert(
    typeof passable1 === 'boolean',
    'isPassable returns boolean',
    'boolean',
    typeof passable1
  );

  // Test out of bounds returns impassable
  const outOfBounds = queries.getTerrainCost(-100, -100);
  assert(
    outOfBounds === 999,
    'Out of bounds coordinates return impassable (999)',
    999,
    outOfBounds
  );

  const outOfBounds2 = queries.getTerrainCost(5000, 5000);
  assert(
    outOfBounds2 === 999,
    'Out of bounds coordinates (5000, 5000) return impassable',
    999,
    outOfBounds2
  );

  // Count terrain types
  const stats = queries.getStatistics();
  console.log(`    Plains: ${stats.terrain.plains} (${(stats.terrain.plains/200).toFixed(1)}%)`);
  console.log(`    Forest: ${stats.terrain.forest} (${(stats.terrain.forest/200).toFixed(1)}%)`);
  console.log(`    Mountains: ${stats.terrain.mountains} (${(stats.terrain.mountains/200).toFixed(1)}%)`);
  console.log(`    Water: ${stats.terrain.water} (${(stats.terrain.water/200).toFixed(1)}%)`);

  assert(
    stats.terrain.plains > 0,
    'Map contains plains',
    '>0',
    stats.terrain.plains
  );

  assert(
    stats.terrain.water > 0,
    'Map contains water',
    '>0',
    stats.terrain.water
  );
}

/**
 * Test data integrity
 */
function testDataIntegrity() {
  console.log(`\n${colors.blue}=== Testing Data Integrity ===${colors.reset}`);

  const all = queries.getAllSettlements();

  // Test all settlements have required fields
  let allValid = true;
  let invalidSettlement = null;

  for (const settlement of all) {
    if (!settlement.id || !settlement.name || !settlement.type ||
        !settlement.coordinates || !settlement.owner ||
        settlement.garrison === undefined || settlement.prosperity === undefined) {
      allValid = false;
      invalidSettlement = settlement.id;
      break;
    }
  }

  assert(
    allValid,
    'All settlements have required fields',
    'all valid',
    allValid ? 'all valid' : `invalid: ${invalidSettlement}`
  );

  // Test coordinates are within map bounds
  let allInBounds = true;
  for (const settlement of all) {
    const x = settlement.coordinates.x;
    const y = settlement.coordinates.y;
    if (x < 0 || x >= 2000 || y < 0 || y >= 4000) {
      allInBounds = false;
      break;
    }
  }

  assert(
    allInBounds,
    'All settlement coordinates are within map bounds (0-2000, 0-4000)',
    'all in bounds',
    allInBounds ? 'all in bounds' : 'some out of bounds'
  );

  // Test garrison values are reasonable
  let reasonableGarrisons = true;
  for (const settlement of all) {
    if (settlement.garrison < 50 || settlement.garrison > 250) {
      reasonableGarrisons = false;
      break;
    }
  }

  assert(
    reasonableGarrisons,
    'All garrisons are in reasonable range (50-250)',
    '50-250',
    reasonableGarrisons ? 'valid' : 'out of range'
  );

  // Test prosperity values
  let validProsperity = true;
  for (const settlement of all) {
    if (settlement.prosperity < 0 || settlement.prosperity > 100) {
      validProsperity = false;
      break;
    }
  }

  assert(
    validProsperity,
    'All prosperity values are 0-100',
    '0-100',
    validProsperity ? 'valid' : 'out of range'
  );

  // Test unique IDs
  const ids = all.map(s => s.id);
  const uniqueIds = new Set(ids);
  assert(
    ids.length === uniqueIds.size,
    'All settlement IDs are unique',
    250,
    uniqueIds.size
  );

  // Test attached villages
  let totalVillages = 0;
  for (const settlement of all) {
    if (settlement.attachedVillages && Array.isArray(settlement.attachedVillages)) {
      totalVillages += settlement.attachedVillages.length;
    }
  }

  assert(
    totalVillages > 0,
    'Settlements have attached villages',
    '>0',
    totalVillages
  );
  console.log(`    Total villages: ${totalVillages}`);

  assert(
    totalVillages >= 400 && totalVillages <= 1250,
    'Total villages in reasonable range (400-1250, avg 1.6-5 per settlement)',
    '400-1250',
    totalVillages
  );
}

/**
 * Test performance
 */
function testPerformance() {
  console.log(`\n${colors.blue}=== Testing Performance ===${colors.reset}`);

  // Test query performance
  const iterations = 1000;

  // Test getSettlement performance
  const start1 = Date.now();
  for (let i = 0; i < iterations; i++) {
    queries.getSettlement('london_001');
  }
  const time1 = Date.now() - start1;
  const avg1 = time1 / iterations;

  assert(
    avg1 < 1,
    `getSettlement performs well (avg: ${avg1.toFixed(3)}ms per call)`,
    '<1ms',
    `${avg1.toFixed(3)}ms`
  );

  // Test findSettlementsInRadius performance
  const start2 = Date.now();
  for (let i = 0; i < 100; i++) {
    queries.findSettlementsInRadius(1000, 2000, 200);
  }
  const time2 = Date.now() - start2;
  const avg2 = time2 / 100;

  assert(
    avg2 < 5,
    `findSettlementsInRadius performs well (avg: ${avg2.toFixed(2)}ms per call)`,
    '<5ms',
    `${avg2.toFixed(2)}ms`
  );

  // Test getTerrainCost performance
  const start3 = Date.now();
  for (let i = 0; i < iterations; i++) {
    queries.getTerrainCost(Math.random() * 2000, Math.random() * 4000);
  }
  const time3 = Date.now() - start3;
  const avg3 = time3 / iterations;

  assert(
    avg3 < 1,
    `getTerrainCost performs well (avg: ${avg3.toFixed(3)}ms per call)`,
    '<1ms',
    `${avg3.toFixed(3)}ms`
  );

  console.log(`\n  Performance Summary:`);
  console.log(`    getSettlement: ${avg1.toFixed(3)}ms avg (${iterations} calls)`);
  console.log(`    findSettlementsInRadius: ${avg2.toFixed(2)}ms avg (100 calls)`);
  console.log(`    getTerrainCost: ${avg3.toFixed(3)}ms avg (${iterations} calls)`);
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log(`${colors.yellow}
╔══════════════════════════════════════════════════════════════╗
║        Medieval Grand Strategy - Session 1 Test Suite       ║
╚══════════════════════════════════════════════════════════════╝
${colors.reset}`);

  testInitialization();
  testSettlementQueries();
  testSpatialQueries();
  testTerrainQueries();
  testDataIntegrity();
  testPerformance();

  // Summary
  console.log(`\n${colors.yellow}=== Test Summary ===${colors.reset}`);
  console.log(`  Total Tests: ${testsRun}`);
  console.log(`  ${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`  ${colors.red}Failed: ${testsFailed}${colors.reset}`);

  if (testsFailed === 0) {
    console.log(`\n${colors.green}✓ All tests passed! Session 1 foundation is complete.${colors.reset}\n`);
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
