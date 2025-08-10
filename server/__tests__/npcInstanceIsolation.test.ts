import request from 'supertest';
import express from 'express';

jest.mock('../src/models/Map', () => {
  return {
    Map: {
      findOne: jest.fn(),
      deleteOne: jest.fn()
    }
  };
});

// Bypass auth in battle routes for these tests
jest.mock('../src/middleware/auth', () => {
  return (req: any, _res: any, next: any) => { req.user = { _id: 'user-1' }; next(); };
});

// Mock services we control in these tests
jest.mock('../src/services/CombatService');
jest.mock('../src/services/PointTrackingService');
jest.mock('../src/services/MapService', () => {
  return {
    MapService: jest.fn().mockImplementation(() => ({
      generateMap: jest.fn().mockResolvedValue({ name: 'main', gridSize: 50, cells: [], version: 2 })
    }))
  };
});

describe('NPC instance isolation', () => {
  it('map route returns 1 NPC when DB has 1 (no reseed)', async () => {
    const app = express();
    const router = require('../src/routes/map').default;
    app.use(express.json());
    app.use('/api/map', router);

    const { Map } = require('../src/models/Map');

    const makeEmptyGrid = (size: number) => Array.from({ length: size }, () => Array.from({ length: size }, () => ({ terrain: 'plain', entity: 'empty' })));

    const gridSize = 50;
    const baseCells: any[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        baseCells.push({ x, y, terrain: 'plain', isActive: true, isOccupied: false, canBeOccupied: true, occupiedBy: 'none', entityName: '' });
      }
    }

    const idx = (x: number, y: number) => y * gridSize + x;
    const cellsWithPlayerAndOneNpc = JSON.parse(JSON.stringify(baseCells));
    cellsWithPlayerAndOneNpc[idx(8, 11)] = { ...cellsWithPlayerAndOneNpc[idx(8, 11)], isOccupied: true, occupiedBy: 'player', entityName: 'YOU' };
    cellsWithPlayerAndOneNpc[idx(10, 10)] = { ...cellsWithPlayerAndOneNpc[idx(10, 10)], isOccupied: true, occupiedBy: 'npc', entityName: 'Small Corporation', npcSlug: 'npc-small-corporation' };

    const cellsWithPlayerAndZeroNpc = JSON.parse(JSON.stringify(baseCells));
    cellsWithPlayerAndZeroNpc[idx(8, 11)] = { ...cellsWithPlayerAndZeroNpc[idx(8, 11)], isOccupied: true, occupiedBy: 'player', entityName: 'YOU' };

    const mapDoc1 = { name: 'main', gridSize, cells: cellsWithPlayerAndOneNpc, version: 2, markModified: jest.fn(), save: jest.fn().mockResolvedValue(true) } as any;
    const mapDoc2 = { name: 'main', gridSize, cells: cellsWithPlayerAndZeroNpc, version: 2, markModified: jest.fn(), save: jest.fn().mockResolvedValue(true) } as any;

    Map.findOne.mockImplementation(() => Promise.resolve(mapDoc1));

    const res1 = await request(app).get('/api/map/main');
    if (res1.status !== 200) throw new Error('GET /api/map/main failed: ' + JSON.stringify(res1.body));
    const firstGrid = res1.body.grid as any[][];
    let npcCount1 = 0;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const cell = firstGrid[y][x] as any;
        if (cell.owner === 'enemy' && cell.npcSlug) npcCount1++;
      }
    }
    expect(npcCount1).toBe(1);

  });

  it('map route returns 0 NPC when DB has 0 (no reseed)', async () => {
    const app = express();
    const router = require('../src/routes/map').default;
    app.use(express.json());
    app.use('/api/map', router);

    const { Map } = require('../src/models/Map');

    const gridSize = 50;
    const baseCells: any[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        baseCells.push({ x, y, terrain: 'plain', isActive: true, isOccupied: false, canBeOccupied: true, occupiedBy: 'none', entityName: '' });
      }
    }
    const idx = (x: number, y: number) => y * gridSize + x;
    const cellsWithPlayerAndZeroNpc = JSON.parse(JSON.stringify(baseCells));
    cellsWithPlayerAndZeroNpc[idx(8, 11)] = { ...cellsWithPlayerAndZeroNpc[idx(8, 11)], isOccupied: true, occupiedBy: 'player', entityName: 'YOU' };
    const mapDoc2 = { name: 'main', gridSize, cells: cellsWithPlayerAndZeroNpc, version: 2 } as any;

    Map.findOne.mockImplementation(() => Promise.resolve(mapDoc2));

    const res2 = await request(app).get('/api/map/main');
    if (res2.status !== 200) throw new Error('GET /api/map/main failed: ' + JSON.stringify(res2.body));
    const secondGrid = res2.body.grid as any[][];
    let npcCount2 = 0;
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const cell = secondGrid[y][x] as any;
        if (cell.owner === 'enemy' && cell.npcSlug) npcCount2++;
      }
    }
    expect(npcCount2).toBe(0);
  });

  it('adds npcInstanceId to NPC cells in map API response', async () => {
    const app = express();
    const router = require('../src/routes/map').default;
    app.use(express.json());
    app.use('/api/map', router);

    const { Map } = require('../src/models/Map');

    const gridSize = 50;
    const cells: any[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        cells.push({ x, y, terrain: 'plain', isActive: true, isOccupied: false, canBeOccupied: true, occupiedBy: 'none', entityName: '' });
      }
    }
    const at = (x: number, y: number) => y * gridSize + x;
    cells[at(8, 11)] = { ...cells[at(8, 11)], isOccupied: true, occupiedBy: 'player', entityName: 'YOU' };
    cells[at(12, 13)] = { ...cells[at(12, 13)], isOccupied: true, occupiedBy: 'npc', entityName: 'Small Corporation', npcSlug: 'npc-small-corporation', npcInstanceId: 'inst-123' };

    Map.findOne.mockImplementation(() => Promise.resolve({ name: 'main', gridSize, cells, version: 2 }));

    const res = await request(app).get('/api/map/main');
    if (res.status !== 200) throw new Error('GET /api/map/main failed: ' + JSON.stringify(res.body));
    const grid = res.body.grid as any[][];
    expect(grid[13][12].npcSlug).toBe('npc-small-corporation');
    expect(grid[13][12].npcInstanceId).toBe('inst-123');
  });

  it('battle route forwards defenderNpcInstanceId to controller', async () => {
    jest.resetModules();
    jest.doMock('../src/controllers/BattleController', () => {
      return {
        BattleController: jest.fn().mockImplementation(() => ({
          startBattle: jest.fn().mockResolvedValue({ battleId: 'b-1' })
        }))
      };
    });

    const app = express();
    const router = require('../src/routes/battle').default;
    app.use(express.json());
    // simple auth stub
    app.use((req, _res, next) => { (req as any).user = { _id: 'user-1' }; next(); });
    app.use('/api/battle', router);

    const { BattleController } = require('../src/controllers/BattleController');

    const body = {
      screenWidth: 100,
      screenHeight: 100,
      defenderNpcSlug: 'npc-small-corporation',
      defenderNpcInstanceId: 'inst-abc'
    };

    const res = await request(app).post('/api/battle/start').send(body);
    expect(res.status).toBe(201);
    // Grab the instance that the router created
    const controllerCtor = BattleController as unknown as jest.Mock;
    expect(controllerCtor).toHaveBeenCalled();
    const createdValue = (controllerCtor as any).mock.results[0]?.value;
    expect(createdValue && createdValue.startBattle).toBeTruthy();
    const lastCallArgs = (createdValue.startBattle as jest.Mock).mock.calls.pop();
    expect(lastCallArgs).toEqual(expect.arrayContaining([
      expect.any(String), // attackerId
      expect.any(String), // defenderId
      100,
      100,
      undefined, // userBattalions
      'npc-small-corporation',
      expect.anything(), // unlockHackRigOnWin
      'inst-abc' // defenderNpcInstanceId (new)
    ]));
  });

  it('BattleSetupService persists defenderNpcInstanceId on battle document', async () => {
    jest.resetModules();
    jest.doMock('../src/models/Battle', () => {
      return {
        Battle: jest.fn().mockImplementation((data: any) => ({
          ...data,
          save: jest.fn().mockResolvedValue(data)
        }))
      };
    });
    jest.doMock('../src/services/NPCService', () => ({ NPCService: { getNPCBySlug: jest.fn().mockResolvedValue(null) } }));

    const { BattleSetupService } = require('../src/services/BattleSetupService');
    const battle = await (BattleSetupService as any).createBattle('attacker-1', 'computer', 100, 100, undefined, 'npc-small-corporation', false, 'inst-xyz');
    expect(battle.defenderNpcSlug).toBe('npc-small-corporation');
    expect(battle.defenderNpcInstanceId).toBe('inst-xyz');
  });

  it('NPCRespawnService clears and schedules by npcInstanceId (mapName:npcInstanceId key)', async () => {
    jest.resetModules();
    const { Map } = require('../src/models/Map');

    const cells = [
      { x: 1, y: 1, terrain: 'plain', isActive: true, isOccupied: true, canBeOccupied: true, occupiedBy: 'npc', entityName: 'Small Corporation', npcSlug: 'npc-small-corporation', npcInstanceId: 'inst-1' },
      { x: 2, y: 2, terrain: 'plain', isActive: true, isOccupied: true, canBeOccupied: true, occupiedBy: 'npc', entityName: 'Small Corporation', npcSlug: 'npc-small-corporation', npcInstanceId: 'inst-2' },
    ];
    const markModified = jest.fn();
    const save = jest.fn().mockResolvedValue(true);
    Map.findOne.mockResolvedValue({ name: 'main', cells, markModified, save });

    const { NPCRespawnService } = require('../src/services/NPCRespawnService');
    // New API expected by behavior
    await (NPCRespawnService as any).clearNpcInstanceFromMap('inst-2', 'main');
    expect(cells[0].isOccupied).toBe(true);
    expect(cells[1].isOccupied).toBe(false);
    expect(markModified).toHaveBeenCalledWith('cells');
    expect(save).toHaveBeenCalled();

    jest.useFakeTimers();
    const respawnSpy = jest.spyOn(NPCRespawnService as any, 'respawnNpc').mockResolvedValue(undefined);

    (NPCRespawnService as any).scheduleRespawnForInstance('npc-small-corporation', 'inst-2', 1, 'main');
    (NPCRespawnService as any).scheduleRespawnForInstance('npc-small-corporation', 'inst-2', 1, 'main');
    (NPCRespawnService as any).scheduleRespawnForInstance('npc-small-corporation', 'inst-1', 1, 'main');

    jest.runOnlyPendingTimers();
    expect(respawnSpy).toHaveBeenCalledWith('npc-small-corporation', 'main', 'inst-2');
    expect(respawnSpy).toHaveBeenCalledWith('npc-small-corporation', 'main', 'inst-1');
    // only one call per instance id should be scheduled
    const calls = respawnSpy.mock.calls.filter((c: any[]) => c[2] === 'inst-2');
    expect(calls.length).toBe(1);
  });

  it('BattleService clears defeated NPC instance and schedules respawn using npc.mapRecoverySeconds', async () => {
    jest.resetModules();
    jest.useFakeTimers();
    const { NPCRespawnService } = require('../src/services/NPCRespawnService');
    const { NPCService } = require('../src/services/NPCService');

    // Mock NPC doc with custom recovery seconds
    jest.spyOn(NPCService, 'getNPCBySlug').mockResolvedValue({ mapRecoverySeconds: 7 });

    // Spy on instance-based clear/schedule
    const clearSpy = jest.spyOn(NPCRespawnService as any, 'clearNpcInstanceFromMap').mockResolvedValue(undefined);
    const scheduleSpy = jest.spyOn(NPCRespawnService as any, 'scheduleRespawnForInstance').mockImplementation(() => {});

    // Prepare battle so user wins by elimination against NPC instance
    const { BattleService } = require('../src/services/BattleService');
    const service = new BattleService();
    jest.spyOn(service as any, 'getBattle').mockResolvedValue({
      battleId: 'b-1',
      attackerId: 'user-1',
      battalions: [],
      startingBattalions: [],
      save: jest.fn().mockResolvedValue(true),
      defenderNpcSlug: 'npc-small-corporation',
      defenderNpcInstanceId: 'inst-9'
    });
    jest.spyOn(service as any, 'endBattle').mockResolvedValue(null);

    const { CombatService } = require('../src/services/CombatService');
    CombatService.checkCompleteElimination.mockReturnValue({ userEliminated: false, enemyEliminated: true });

    const { PointTrackingService } = require('../src/services/PointTrackingService');
    PointTrackingService.calculateBattleLosses.mockReturnValue({ winner: 'user' });

    await (service as any).handleBattleEnd('b-1');

    expect(clearSpy).toHaveBeenCalledWith('inst-9', 'main');
    expect(scheduleSpy).toHaveBeenCalledWith('npc-small-corporation', 'inst-9', 7, 'main');
  });

  it('respawn chooses a non-water/non-mountain/non-road cell', async () => {
    jest.resetModules();
    const { Map } = require('../src/models/Map');
    const { NPCRespawnService } = require('../src/services/NPCRespawnService');

    const gridSize = 5;
    const cells: any[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        cells.push({ x, y, terrain: 'plain', isActive: true, isOccupied: false, canBeOccupied: true, occupiedBy: 'none', entityName: '' });
      }
    }

    const at = (x: number, y: number) => y * gridSize + x;
    cells[at(1, 1)].terrain = 'road';
    cells[at(2, 2)].terrain = 'forest';
    cells[at(3, 3)].terrain = 'mountain';
    cells[at(4, 4)].terrain = 'water';

    const markModified = jest.fn();
    const save = jest.fn().mockResolvedValue(true);
    Map.findOne.mockResolvedValue({ name: 'main', cells, markModified, save });

    const originalRandom = Math.random;
    Math.random = () => 0; // would pick the first valid candidate

    await (NPCRespawnService as any).respawnNpc('npc-small-corporation', 'main');

    // restore randomness
    Math.random = originalRandom;

    // road should NOT have been used
    expect(cells[at(1, 1)].isOccupied).not.toBe(true);
    // a non-road, non-water, non-mountain cell should have been used
    const occupied = cells.find(c => c.isOccupied === true && c.occupiedBy === 'npc');
    expect(occupied).toBeTruthy();
    expect(['water', 'mountain', 'road'].includes(occupied.terrain)).toBe(false);
    expect(occupied.entityName).toBe('Small Corporation');
    expect(occupied.npcSlug).toBe('npc-small-corporation');
    expect(markModified).toHaveBeenCalledWith('cells');
    expect(save).toHaveBeenCalled();
  });
});


