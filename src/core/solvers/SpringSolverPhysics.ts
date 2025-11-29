import { SpringConfigPhysics, Adjacency, RoomState } from '../../types.js';
import { Vec2, Vector2 } from '../geometry/Vector2.js';
import { Polygon } from '../geometry/Polygon.js';

const DEFAULT_TIMESTEP = 0.016;
const DEFAULT_FRICTION = 0.9;
const DEFAULT_MAX_VELOCITY = 50.0;

/**
 * Spring solver for geometric optimization using physics simulation.
 * Refines room layouts from discrete solver using forces.
 *
 * NOTE: This is the original physics-based implementation, preserved for comparison.
 * See SpringSolver.ts for the new Evolutionary Strategy (ES) implementation.
 */
export class SpringSolverPhysics {
  private rooms: RoomState[];
  private adjacencies: Adjacency[];
  private boundary: Vec2[];
  private config: SpringConfigPhysics;

  // Reusable vectors to avoid allocations
  private tempVec1: Vec2 = { x: 0, y: 0 };
  private tempVec2: Vec2 = { x: 0, y: 0 };
  private tempVec3: Vec2 = { x: 0, y: 0 };

  constructor(
    rooms: RoomState[],
    boundary: Vec2[],
    adjacencies: Adjacency[],
    config: Partial<SpringConfigPhysics> = {}
  ) {
    this.rooms = rooms.map(r => ({ ...r })); // Deep copy
    this.boundary = boundary;
    this.adjacencies = adjacencies;

    this.config = {
      timestep: config.timestep ?? DEFAULT_TIMESTEP,
      friction: config.friction ?? DEFAULT_FRICTION,
      maxVelocity: config.maxVelocity ?? DEFAULT_MAX_VELOCITY,
      forces: {
        adjacency: config.forces?.adjacency ?? 10.0,
        repulsion: config.forces?.repulsion ?? 200.0,
        boundary: config.forces?.boundary ?? 50.0,
        aspectRatio: config.forces?.aspectRatio ?? 20.0,
      },
    };
  }

  /**
   * Get current room states
   */
  getState(): RoomState[] {
    return this.rooms.map(r => ({ ...r }));
  }

  /**
   * Calculate adjacency (attraction) forces
   */
  private applyAdjacencyForces(): void {
    for (const adj of this.adjacencies) {
      const roomA = this.rooms.find(r => r.id === adj.a);
      const roomB = this.rooms.find(r => r.id === adj.b);

      if (!roomA || !roomB) continue;

      const centerA: Vec2 = { x: roomA.x + roomA.width / 2, y: roomA.y + roomA.height / 2 };
      const centerB: Vec2 = { x: roomB.x + roomB.width / 2, y: roomB.y + roomB.height / 2 };

      // Direction from A to B
      Vector2.sub(this.tempVec1, centerB, centerA);
      const distance = Vector2.mag(this.tempVec1);

      if (distance > 0.001) {
        Vector2.normalize(this.tempVec2, this.tempVec1);

        // Spring force: F = k * d * direction
        const forceMag = distance * this.config.forces.adjacency * (adj.weight ?? 1.0);
        Vector2.mult(this.tempVec3, this.tempVec2, forceMag);

        // Apply force to A (towards B)
        roomA.vx += this.tempVec3.x;
        roomA.vy += this.tempVec3.y;

        // Apply opposite force to B (towards A)
        roomB.vx -= this.tempVec3.x;
        roomB.vy -= this.tempVec3.y;
      }
    }
  }

  /**
   * Calculate repulsion forces for overlapping rooms
   */
  private applyRepulsionForces(): void {
    for (let i = 0; i < this.rooms.length; i++) {
      for (let j = i + 1; j < this.rooms.length; j++) {
        const roomA = this.rooms[i];
        const roomB = this.rooms[j];

        // Create polygon representations
        const polyA = Polygon.createRectangle(roomA.x, roomA.y, roomA.width, roomA.height);
        const polyB = Polygon.createRectangle(roomB.x, roomB.y, roomB.width, roomB.height);

        // AABB check for early exit
        const aabbA = Polygon.calculateAABB(polyA);
        const aabbB = Polygon.calculateAABB(polyB);

        if (!Polygon.aabbIntersects(aabbA, aabbB)) {
          continue;
        }

        // Precise intersection check
        const overlapArea = Polygon.intersectionArea(polyA, polyB);

        if (overlapArea > 0.01) {
          const centerA: Vec2 = { x: roomA.x + roomA.width / 2, y: roomA.y + roomA.height / 2 };
          const centerB: Vec2 = { x: roomB.x + roomB.width / 2, y: roomB.y + roomB.height / 2 };

          // Direction from B to A (repulsion)
          Vector2.sub(this.tempVec1, centerA, centerB);
          const distance = Vector2.mag(this.tempVec1);

          if (distance > 0.001) {
            Vector2.normalize(this.tempVec2, this.tempVec1);
          } else {
            // If centers are identical, push in random direction
            this.tempVec2.x = Math.random() - 0.5;
            this.tempVec2.y = Math.random() - 0.5;
            Vector2.normalize(this.tempVec2, this.tempVec2);
          }

          // Repulsion force proportional to overlap area
          const forceMag = overlapArea * this.config.forces.repulsion;
          Vector2.mult(this.tempVec3, this.tempVec2, forceMag);

          // Apply force to A (away from B)
          roomA.vx += this.tempVec3.x;
          roomA.vy += this.tempVec3.y;

          // Apply opposite force to B (away from A)
          roomB.vx -= this.tempVec3.x;
          roomB.vy -= this.tempVec3.y;
        }
      }
    }
  }

  /**
   * Calculate boundary containment forces
   */
  private applyBoundaryForces(): void {
    const boundaryCentroid = Polygon.calculateCentroid(this.boundary);

    for (const room of this.rooms) {
      const roomPoly = Polygon.createRectangle(room.x, room.y, room.width, room.height);

      // Check if room is fully contained
      if (!Polygon.contains(this.boundary, roomPoly)) {
        const roomCenter: Vec2 = { x: room.x + room.width / 2, y: room.y + room.height / 2 };

        // Direction towards boundary centroid
        Vector2.sub(this.tempVec1, boundaryCentroid, roomCenter);
        const distance = Vector2.mag(this.tempVec1);

        if (distance > 0.001) {
          Vector2.normalize(this.tempVec2, this.tempVec1);

          // Apply force towards center
          const forceMag = this.config.forces.boundary;
          Vector2.mult(this.tempVec3, this.tempVec2, forceMag);

          room.vx += this.tempVec3.x;
          room.vy += this.tempVec3.y;
        }
      }
    }
  }

  /**
   * Calculate aspect ratio preservation forces
   */
  private applyAspectRatioForces(): void {
    for (const room of this.rooms) {
      const currentRatio = room.width / room.height;

      if (currentRatio < room.minRatio) {
        // Too narrow, expand width or shrink height
        const force = (room.minRatio - currentRatio) * this.config.forces.aspectRatio;
        room.width += force * this.config.timestep;
        room.height -= force * this.config.timestep * 0.5;
      } else if (currentRatio > room.maxRatio) {
        // Too wide, shrink width or expand height
        const force = (currentRatio - room.maxRatio) * this.config.forces.aspectRatio;
        room.width -= force * this.config.timestep;
        room.height += force * this.config.timestep * 0.5;
      }

      // Enforce minimum dimensions
      room.width = Math.max(1, room.width);
      room.height = Math.max(1, room.height);
    }
  }

  /**
   * Perform one physics step using Symplectic Euler integration
   */
  step(): void {
    // Reset forces (velocities already contain previous forces)
    // Forces are accumulated in velocity

    // Apply all forces
    this.applyAdjacencyForces();
    this.applyRepulsionForces();
    this.applyBoundaryForces();
    this.applyAspectRatioForces();

    // Integration
    for (const room of this.rooms) {
      // Clamp velocity
      const speed = Math.sqrt(room.vx * room.vx + room.vy * room.vy);
      if (speed > this.config.maxVelocity) {
        const scale = this.config.maxVelocity / speed;
        room.vx *= scale;
        room.vy *= scale;
      }

      // Apply friction
      room.vx *= this.config.friction;
      room.vy *= this.config.friction;

      // Update position
      room.x += room.vx * this.config.timestep;
      room.y += room.vy * this.config.timestep;

      // Ensure non-negative positions
      room.x = Math.max(0, room.x);
      room.y = Math.max(0, room.y);
    }
  }

  /**
   * Run simulation for N steps
   */
  simulate(steps: number): void {
    for (let i = 0; i < steps; i++) {
      this.step();
    }
  }

  /**
   * Check if simulation has converged (velocities near zero)
   */
  hasConverged(threshold: number = 0.1): boolean {
    for (const room of this.rooms) {
      const speed = Math.sqrt(room.vx * room.vx + room.vy * room.vy);
      if (speed > threshold) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get total kinetic energy (useful for convergence checking)
   */
  getKineticEnergy(): number {
    let energy = 0;
    for (const room of this.rooms) {
      energy += room.vx * room.vx + room.vy * room.vy;
    }
    return energy;
  }
}
