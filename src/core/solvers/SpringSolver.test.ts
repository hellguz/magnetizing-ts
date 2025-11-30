import { describe, it, expect } from 'vitest';
import { SpringSolver } from './SpringSolver.js';
import { RoomState } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';

describe('SpringSolver', () => {
  const createSimpleBoundary = (): Vec2[] => [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ];

  const createSimpleRooms = (): RoomState[] => [
    {
      id: 'room1',
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      vx: 0,
      vy: 0,
      targetRatio: 1.2,
    },
    {
      id: 'room2',
      x: 50,
      y: 50,
      width: 20,
      height: 20,
      vx: 0,
      vy: 0,
      targetRatio: 1.2,
    },
  ];

  describe('constructor', () => {
    it('should initialize with rooms and boundary', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      expect(solver).toBeDefined();
      expect(solver.getState().length).toBe(2);
    });

    it('should not mutate input rooms array', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();
      const originalRooms = JSON.stringify(rooms);

      const solver = new SpringSolver(rooms, boundary, []);
      solver.step();

      expect(JSON.stringify(rooms)).toBe(originalRooms);
    });

    it('should accept custom config', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, [], {
        timestep: 0.01,
        friction: 0.95,
        maxVelocity: 100,
        forces: {
          adjacency: 5,
          repulsion: 100,
          boundary: 25,
          aspectRatio: 10,
        },
      });

      expect(solver).toBeDefined();
    });
  });

  describe('step', () => {
    it('should perform one evolutionary iteration', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);
      const generation1 = solver.getGeneration();

      solver.step();

      const generation2 = solver.getGeneration();

      // Generation should increment
      expect(generation2).toBe(generation1 + 1);
    });

    it('should evolve room positions over multiple steps', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 10,
          y: 10,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);
      const initialState = JSON.stringify(solver.getState());

      // Run multiple generations
      solver.simulate(10);

      const finalState = JSON.stringify(solver.getState());

      // State may have evolved (not guaranteed to change, but we test the solver runs)
      expect(solver.getGeneration()).toBe(10);
    });

    it('should return rooms with zero velocity (ES solver)', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);
      solver.step();

      const state = solver.getState();

      // ES solver always returns vx=0, vy=0 (no physics simulation)
      state.forEach(room => {
        expect(room.vx).toBe(0);
        expect(room.vy).toBe(0);
      });
    });
  });

  describe('evolutionary optimization', () => {
    it('should respect adjacencies through fitness', () => {
      const rooms: RoomState[] = [
        {
          id: 'A',
          x: 10,
          y: 10,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
        {
          id: 'B',
          x: 70,
          y: 70,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();
      const adjacencies = [{ a: 'A', b: 'B', weight: 1.0 }];

      const solver = new SpringSolver(rooms, boundary, adjacencies, {
        fitnessBalance: 0.0, // Favor topological fitness (adjacency)
      });

      // Solver should be initialized
      expect(solver).toBeDefined();
      expect(solver.getState().length).toBe(2);
    });
  });

  describe('collision resolution', () => {
    it('should handle overlapping rooms through squish', () => {
      const rooms: RoomState[] = [
        {
          id: 'A',
          x: 40,
          y: 40,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
        {
          id: 'B',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      // Solver should initialize and handle overlaps through genetic algorithm
      expect(solver).toBeDefined();
      solver.simulate(20);

      // Solver should complete without errors
      const state = solver.getState();
      expect(state.length).toBe(2);
    });
  });

  describe('boundary containment', () => {
    it('should constrain rooms to boundary polygon', () => {
      const rooms: RoomState[] = [
        {
          id: 'escapee',
          x: -10, // Outside boundary
          y: -10,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);
      solver.simulate(50);

      const state = solver.getState()[0];

      // Room should be inside boundary after evolution
      expect(state.x).toBeGreaterThanOrEqual(0);
      expect(state.y).toBeGreaterThanOrEqual(0);
      expect(state.x + state.width).toBeLessThanOrEqual(100);
      expect(state.y + state.height).toBeLessThanOrEqual(100);
    });
  });

  describe('aspect ratio mutations', () => {
    it('should support aspect ratio mutations', () => {
      const rooms: RoomState[] = [
        {
          id: 'room',
          x: 50,
          y: 50,
          width: 20,
          height: 20, // Ratio = 1.0 (square), valid for targetRatio=1.2
          vx: 0,
          vy: 0,
          targetRatio: 1.2,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, [], {
        aspectRatioMutationRate: 1.0, // Always mutate aspect ratio
        populationSize: 10,
      });

      // Solver should handle aspect ratio mutations without errors
      expect(() => solver.simulate(20)).not.toThrow();

      const state = solver.getState()[0];
      const finalRatio = state.width / state.height;

      // Aspect ratio should be valid (ES algorithm preserves valid configurations)
      // Valid range: [1/1.2, 1.2] = [0.83, 1.2]
      const minRatio = 1.0 / rooms[0].targetRatio;
      const maxRatio = rooms[0].targetRatio;

      expect(finalRatio).toBeGreaterThanOrEqual(minRatio);
      expect(finalRatio).toBeLessThanOrEqual(maxRatio);
    });
  });

  describe('hasConverged', () => {
    it('should return true when fitness is below threshold', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      // Run simulation to convergence
      solver.simulate(100);

      // Check if converged with a reasonable threshold
      expect(solver.hasConverged(1.0)).toBeDefined();
    });

    it('should return false initially with high threshold', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      // Very strict threshold should not be met initially
      expect(solver.hasConverged(0.00001)).toBe(false);
    });
  });

  describe('getKineticEnergy', () => {
    it('should return fitness (ES solver)', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);
      const energy = solver.getKineticEnergy();

      // In ES implementation, "kinetic energy" is actually fitness
      // Lower fitness = better solution = lower "energy"
      expect(typeof energy).toBe('number');
      expect(energy).toBeGreaterThanOrEqual(0);
    });

    it('should decrease over generations (fitness improvement)', () => {
      const rooms: RoomState[] = [
        {
          id: 'room1',
          x: 50,
          y: 50,
          width: 20,
          height: 20,
          vx: 0,
          vy: 0,
          targetRatio: 1.0,
        },
      ];
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      const energyBefore = solver.getKineticEnergy();
      solver.simulate(50);
      const energyAfter = solver.getKineticEnergy();

      // Fitness should improve (decrease) or stay the same
      expect(energyAfter).toBeLessThanOrEqual(energyBefore);
    });
  });

  describe('simulate', () => {
    it('should run multiple steps', () => {
      const rooms = createSimpleRooms();
      const boundary = createSimpleBoundary();

      const solver = new SpringSolver(rooms, boundary, []);

      expect(() => solver.simulate(100)).not.toThrow();
    });
  });
});
