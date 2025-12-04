import { EvolutionaryGene, EvolutionaryConfig } from './EvolutionaryGene.js';
import { RoomStateES, Adjacency } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';
import { Polygon } from '../geometry/Polygon.js';

/**
 * Evolutionary Floorplan Solver
 *
 * Population-based evolutionary algorithm with:
 * - Fixed population of 25 variants
 * - Mutation → Physics → Selection → Duplication cycle
 * - Three mutation operators: Teleport, Swap, Rotation
 * - Fitness prioritizes shared wall compliance + geometric validity
 */
export class EvolutionaryFloorplanSolver {
  private population: EvolutionaryGene[] = [];
  private boundary: Vec2[];
  private adjacencies: Adjacency[];
  private config: EvolutionaryConfig;
  private globalTargetRatio: number | undefined;
  public generation: number = 0;

  constructor(
    initialRooms: RoomStateES[],
    boundary: Vec2[],
    adjacencies: Adjacency[],
    config: EvolutionaryConfig,
    globalTargetRatio?: number
  ) {
    this.boundary = boundary;
    this.adjacencies = adjacencies;
    this.config = config;
    this.globalTargetRatio = globalTargetRatio;

    // Initialize population of 25 random variants
    this.initializePopulation(initialRooms);
  }

  /**
   * Initialize population with 25 random variants
   */
  private initializePopulation(baseRooms: RoomStateES[]): void {
    const boundaryAABB = Polygon.calculateAABB(this.boundary);

    for (let i = 0; i < this.config.populationSize; i++) {
      // Create a copy of rooms with randomized positions
      const randomizedRooms = baseRooms.map(room => ({
        ...room,
        x: boundaryAABB.minX + Math.random() * (boundaryAABB.maxX - boundaryAABB.minX - room.width),
        y: boundaryAABB.minY + Math.random() * (boundaryAABB.maxY - boundaryAABB.minY - room.height),
      }));

      const gene = new EvolutionaryGene(randomizedRooms);
      this.population.push(gene);
    }
  }

  /**
   * Execute ONE generation of the evolutionary algorithm:
   * 1. Mutation - Create 25 mutants (1-3 random mutations each)
   * 2. Physics - Run 10 iterations on all 50 genes
   * 3. Fitness Evaluation
   * 4. Selection - Keep best 12-13 (50% of 25)
   * 5. Duplication - Refill to 25
   */
  step(): void {
    // STEP 1: Mutation - Create 25 mutants
    const mutants = this.applyMutations();
    const expanded = [...this.population, ...mutants]; // Total: 50

    // STEP 2: Physics - Run 10 iterations on ALL 50 genes
    for (const gene of expanded) {
      for (let i = 0; i < this.config.physicsIterations; i++) {
        gene.applySquishCollisions(this.boundary, this.config as any, this.globalTargetRatio);
      }
    }

    // STEP 3: Fitness Evaluation
    for (const gene of expanded) {
      gene.calculateEvolutionaryFitness(this.boundary, this.adjacencies, this.config);
    }

    // STEP 4: Selection - Keep best 50% (12-13 out of 25)
    expanded.sort((a, b) => a.fitness - b.fitness);
    const numToKeep = Math.ceil(this.config.populationSize * 0.5); // 13 from 25
    const survivors = expanded.slice(0, numToKeep);

    // STEP 5: Duplication - Refill to 25 in round-robin fashion
    this.population = [];
    while (this.population.length < this.config.populationSize) {
      const sourceIndex = this.population.length % survivors.length;
      const source = survivors[sourceIndex];
      this.population.push(source.clone());
    }

    this.generation++;
  }

  /**
   * Run the solver for N generations
   */
  simulate(generations: number): void {
    for (let i = 0; i < generations && this.generation < this.config.maxGenerations; i++) {
      this.step();
    }
  }

  /**
   * Apply mutations to create 25 mutants from current population.
   * Each gene receives 1-3 random mutations.
   */
  private applyMutations(): EvolutionaryGene[] {
    const mutants: EvolutionaryGene[] = [];

    for (const parent of this.population) {
      const mutant = parent.clone();
      const numMutations = Math.floor(Math.random() * 3) + 1; // 1-3 mutations

      for (let i = 0; i < numMutations; i++) {
        const rand = Math.random();
        const totalProb =
          this.config.teleportProbability +
          this.config.swapProbability +
          this.config.rotationProbability;

        const normalizedRand = rand * totalProb;

        if (normalizedRand < this.config.teleportProbability) {
          this.applyTeleport(mutant);
        } else if (
          normalizedRand <
          this.config.teleportProbability + this.config.swapProbability
        ) {
          this.applySwap(mutant);
        } else {
          this.applyRotation(mutant);
        }
      }

      mutants.push(mutant);
    }

    return mutants;
  }

  /**
   * Mutation 1: TELEPORT
   * Move a random room to a random position within the boundary
   */
  private applyTeleport(gene: EvolutionaryGene): void {
    const rooms = gene.rooms;
    if (rooms.length === 0) return;

    const room = rooms[Math.floor(Math.random() * rooms.length)];
    const boundaryAABB = Polygon.calculateAABB(this.boundary);

    // Random position within boundary (accounting for room dimensions)
    const maxX = boundaryAABB.maxX - room.width;
    const maxY = boundaryAABB.maxY - room.height;

    if (maxX > boundaryAABB.minX && maxY > boundaryAABB.minY) {
      room.x = boundaryAABB.minX + Math.random() * (maxX - boundaryAABB.minX);
      room.y = boundaryAABB.minY + Math.random() * (maxY - boundaryAABB.minY);
    }
  }

  /**
   * Mutation 2: SWAP
   * Exchange positions of 2-4 random rooms
   */
  private applySwap(gene: EvolutionaryGene): void {
    const rooms = gene.rooms;
    if (rooms.length < 2) return;

    // Randomly select 2-4 rooms
    const numRoomsToSwap = Math.min(4, Math.floor(Math.random() * 3) + 2); // 2-4 rooms

    // Select random unique indices
    const indices: number[] = [];
    while (indices.length < numRoomsToSwap && indices.length < rooms.length) {
      const idx = Math.floor(Math.random() * rooms.length);
      if (!indices.includes(idx)) {
        indices.push(idx);
      }
    }

    // Swap first half with second half
    for (let i = 0; i < Math.floor(indices.length / 2); i++) {
      const idxA = indices[i];
      const idxB = indices[indices.length - 1 - i];

      const tempX = rooms[idxA].x;
      const tempY = rooms[idxA].y;
      rooms[idxA].x = rooms[idxB].x;
      rooms[idxA].y = rooms[idxB].y;
      rooms[idxB].x = tempX;
      rooms[idxB].y = tempY;
    }
  }

  /**
   * Mutation 3: ROTATION
   * Rotate the entire floorplan by a random angle (25°-335°) around the boundary center
   */
  private applyRotation(gene: EvolutionaryGene): void {
    // Random angle between 25° and 335°
    const angleDegrees = 25 + Math.random() * (335 - 25);
    const angleRadians = (angleDegrees * Math.PI) / 180;

    // Calculate boundary center
    const center = this.calculateCentroid(this.boundary);

    // Rotate all rooms around the boundary center
    for (const room of gene.rooms) {
      // Room center position
      const roomCenterX = room.x + room.width / 2;
      const roomCenterY = room.y + room.height / 2;

      // Translate to origin
      const dx = roomCenterX - center.x;
      const dy = roomCenterY - center.y;

      // Apply rotation
      const cos = Math.cos(angleRadians);
      const sin = Math.sin(angleRadians);
      const newDx = dx * cos - dy * sin;
      const newDy = dx * sin + dy * cos;

      // Translate back and update position
      const newCenterX = center.x + newDx;
      const newCenterY = center.y + newDy;

      room.x = newCenterX - room.width / 2;
      room.y = newCenterY - room.height / 2;
    }
  }

  /**
   * Calculate the centroid of a polygon
   */
  private calculateCentroid(points: Vec2[]): Vec2 {
    const x = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    return { x, y };
  }

  /**
   * Get the best gene (lowest fitness)
   */
  getBest(): EvolutionaryGene {
    return this.population.reduce((best, gene) =>
      gene.fitness < best.fitness ? gene : best
    );
  }

  /**
   * Get the entire population
   */
  getPopulation(): EvolutionaryGene[] {
    return this.population;
  }

  /**
   * Get solver statistics
   */
  getStats() {
    const fitnesses = this.population.map(g => g.fitness);
    const best = this.getBest();

    return {
      generation: this.generation,
      bestFitness: Math.min(...fitnesses),
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      worstFitness: Math.max(...fitnesses),
      bestFitnessG: best.fitnessG,
      bestFitnessT: best.fitnessT,
      bestFitnessSharedWall: best.fitnessSharedWall,
      bestFitnessArea: best.fitnessArea,
    };
  }

  /**
   * Check if solver has reached max generations
   */
  hasReachedMaxGenerations(): boolean {
    return this.generation >= this.config.maxGenerations;
  }

  /**
   * Get current best room configuration (SpringSystem3D compatibility)
   */
  getState(): Array<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    targetRatio: number;
    vx: number;
    vy: number;
  }> {
    const best = this.getBest();

    // Convert RoomStateES back to RoomState (add zero velocities for compatibility)
    return best.rooms.map(r => ({
      id: r.id,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      targetRatio: r.targetRatio,
      vx: 0,
      vy: 0,
    }));
  }

  /**
   * Check if the algorithm has converged (SpringSystem3D compatibility)
   */
  hasConverged(threshold: number = 0.01): boolean {
    const stats = this.getStats();

    // If best fitness is very close to 0, we've found a good solution
    if (stats.bestFitness < threshold) {
      return true;
    }

    // Check if population has stagnated (low diversity)
    const fitnessRange = stats.worstFitness - stats.bestFitness;
    return fitnessRange < threshold;
  }

  /**
   * Get the current generation number (SpringSystem3D compatibility)
   */
  getGeneration(): number {
    return this.generation;
  }

  /**
   * Legacy compatibility: Get "kinetic energy" (mapped to fitness)
   * Lower fitness = lower "energy" = more converged
   */
  getKineticEnergy(): number {
    return this.getBest().fitness;
  }
}
