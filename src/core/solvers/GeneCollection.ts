import { Gene } from './Gene.js';
import { RoomStateES, Adjacency, SpringConfig } from '../../types.js';
import { Vec2 } from '../geometry/Vector2.js';

/**
 * Manages a population of genes for the evolutionary algorithm.
 * Handles selection, crossover, mutation, and fitness evaluation.
 */
export class GeneCollection {
  private genes: Gene[] = [];
  private boundary: Vec2[];
  private adjacencies: Adjacency[];
  private config: SpringConfig;
  private globalTargetRatio: number | undefined;
  private currentGeneration: number = 0; // Track generation for simulated annealing

  constructor(
    initialRooms: RoomStateES[],
    boundary: Vec2[],
    adjacencies: Adjacency[],
    config: SpringConfig,
    globalTargetRatio?: number
  ) {
    this.boundary = boundary;
    this.adjacencies = adjacencies;
    this.config = config;
    this.globalTargetRatio = globalTargetRatio;

    // Initialize population with random variations
    this.initializePopulation(initialRooms);
  }

  /**
   * Create initial population by mutating the base configuration
   */
  private initializePopulation(baseRooms: RoomStateES[]): void {
    // Create the first gene from the base configuration
    const baseGene = new Gene(baseRooms);
    this.genes.push(baseGene);

    // Create the rest of the population with mutations
    for (let i = 1; i < this.config.populationSize; i++) {
      const gene = baseGene.clone();
      gene.mutate(0.5, this.config.mutationStrength * 2, this.config.aspectRatioMutationRate, this.globalTargetRatio, this.config, this.adjacencies); // Higher initial mutation
      this.genes.push(gene);
    }
  }

  /**
   * Run one generation of the evolutionary algorithm:
   * 1. Apply squish collisions to all genes
   * 2. Evaluate fitness
   * 3. Sort by fitness
   * 4. Perform crossover
   * 5. Mutate offspring
   * 6. Cull worst performers
   *
   * FEATURE: Simulated Annealing - decay mutation strength over generations
   */
  iterate(): void {
    // Log every 50 generations to track fresh blood impact
    if (this.currentGeneration % 50 === 0 && this.currentGeneration > 0) {
      const fitnesses = this.genes.map(g => g.fitness);
      const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
      console.log(`[Gen ${this.currentGeneration}] Population: ${this.genes.length} genes, Avg Fitness: ${avgFitness.toFixed(2)}, Best: ${Math.min(...fitnesses).toFixed(2)}`);
    }

    // FEATURE: Simulated Annealing - calculate annealed mutation strength
    const progress = this.currentGeneration / this.config.maxGenerations;
    const annealedMutationStrength = this.config.useSimulatedAnnealing
      ? this.config.mutationStrength * (1.0 - progress)
      : this.config.mutationStrength;

    // Step 1: Apply collision resolution to all genes
    for (const gene of this.genes) {
      gene.applySquishCollisions(this.boundary, this.config, this.globalTargetRatio);
    }

    // Step 2: Calculate fitness for all genes
    for (const gene of this.genes) {
      gene.calculateFitness(this.boundary, this.adjacencies, this.config.fitnessBalance, this.config);
    }

    // Step 3: Sort by fitness (lower is better)
    this.genes.sort((a, b) => a.fitness - b.fitness);

    // Step 4: Crossover - create offspring from best genes
    const offspring: Gene[] = [];
    const numOffspring = Math.floor(this.config.populationSize * this.config.crossoverRate);

    for (let i = 0; i < numOffspring; i++) {
      // Select two random parents from the top half
      const topHalfSize = Math.floor(this.genes.length / 2);
      const parentAIndex = Math.floor(Math.random() * topHalfSize);
      const parentBIndex = Math.floor(Math.random() * topHalfSize);

      const parentA = this.genes[parentAIndex];
      const parentB = this.genes[parentBIndex];

      const child = parentA.crossover(parentB);
      offspring.push(child);
    }

    // Step 5: Mutate offspring (with annealed mutation strength)
    for (const child of offspring) {
      child.mutate(
        this.config.mutationRate,
        annealedMutationStrength,
        this.config.aspectRatioMutationRate,
        this.globalTargetRatio,
        this.config,
        this.adjacencies
      );

      // FEATURE: Physics Warm-Up - allow mutated genes to settle before evaluation
      // Run multiple physics iterations immediately to prevent "death of potential geniuses"
      const warmUpIterations = this.config.warmUpIterations ?? 0;
      for (let i = 0; i < warmUpIterations; i++) {
        child.applySquishCollisions(this.boundary, this.config, this.globalTargetRatio);
      }
    }

    // Step 6: Add offspring to population
    this.genes.push(...offspring);

    // Step 7: Cull worst performers
    const numToCull = Math.floor(this.genes.length * this.config.selectionPressure);
    this.genes = this.genes.slice(0, this.genes.length - numToCull);

    // Ensure we maintain minimum population size
    while (this.genes.length < this.config.populationSize) {
      const randomGene = this.genes[Math.floor(Math.random() * this.genes.length)];
      const clone = randomGene.clone();
      clone.mutate(
        this.config.mutationRate,
        annealedMutationStrength,
        this.config.aspectRatioMutationRate,
        this.globalTargetRatio,
        this.config,
        this.adjacencies
      );

      // FEATURE: Physics Warm-Up - allow mutated genes to settle before evaluation
      const warmUpIterations = this.config.warmUpIterations ?? 0;
      for (let i = 0; i < warmUpIterations; i++) {
        clone.applySquishCollisions(this.boundary, this.config, this.globalTargetRatio);
      }

      this.genes.push(clone);
    }

    // Increment generation counter for simulated annealing
    this.currentGeneration++;

    // FEATURE: Fresh Blood - periodically replace worst performers with new random genes
    // This maintains genetic diversity and prevents premature convergence

    // DEBUG: Log config at gen 50 to verify it's being passed correctly
    if (this.currentGeneration === 50) {
      console.log(`🔍 [Gen 50] DEBUG Config Check:`);
      console.log(`   useFreshBlood: ${this.config.useFreshBlood}`);
      console.log(`   freshBloodInterval: ${this.config.freshBloodInterval}`);
      console.log(`   freshBloodWarmUp: ${this.config.freshBloodWarmUp}`);
    }

    if (this.config.useFreshBlood) {
      const interval = this.config.freshBloodInterval ?? 20;

      // Skip generation 0 (population is already random at initialization)
      if (this.currentGeneration > 0 && this.currentGeneration % interval === 0) {
        try {
          console.log(`\n🩸 [Gen ${this.currentGeneration}] ========== FRESH BLOOD INJECTION ==========`);

          // Sort by fitness to identify worst performers (lower is better, so worst are at the end)
          this.genes.sort((a, b) => a.fitness - b.fitness);

        const popSizeBefore = this.genes.length;
        const bestFitnessBefore = this.genes[0].fitness;
        const worstFitnessBefore = this.genes[this.genes.length - 1].fitness;

        // Replace worst quarter with fresh random genes
        const quarterSize = Math.floor(this.genes.length / 4);
        const numToReplace = Math.max(1, quarterSize); // At least 1

        console.log(`   Population before: ${popSizeBefore} genes`);
        console.log(`   Fitness range: ${bestFitnessBefore.toFixed(2)} (best) to ${worstFitnessBefore.toFixed(2)} (worst)`);
        console.log(`   Removing ${numToReplace} worst genes (${((numToReplace / this.genes.length) * 100).toFixed(1)}%)`);

        // Keep the best 75%
        this.genes = this.genes.slice(0, this.genes.length - numToReplace);

        // Get template for structure (room properties) but will randomize positions
        const templateGene = this.genes[0];

        // Calculate boundary bounds for random placement
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of this.boundary) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }

        // Add some margin to keep rooms away from edges initially
        const margin = 20;
        minX += margin;
        maxX -= margin;
        minY += margin;
        maxY -= margin;

        // PREPARE INCUBATION CONFIG
        // Create a "Hyper-Active" config for the warm-up phase to force topological untangling
        const incubationConfig: SpringConfig = {
          ...this.config,
          // Force topological tools ON with aggressive parameters
          useSwapMutation: true,
          swapMutationRate: 0.5,           // Very high swap rate to untangle crossed rooms
          usePartnerBias: true,
          partnerBiasRate: 0.8,            // Very high attraction to connected neighbors
          useCenterGravity: true,
          centerGravityRate: 0.5,          // High rate to prevent flying off map
          centerGravityStrength: 0.1,      // Strong pull toward center
        };

        // Generate fresh genes and run INCUBATION PHASE
        const freshGenesFitnesses: number[] = [];

        for (let i = 0; i < numToReplace; i++) {
          const freshGene = templateGene.clone();

          // Log inherited fitness (should be best gene's fitness - THIS IS THE BUG WE FIXED)
          const inheritedFitness = freshGene.fitness;

          // 1. HARD RESET: Scramble all positions randomly within boundary
          // This simulates "refreshing the page" - completely new starting configuration
          for (const room of freshGene.rooms) {
            // Random position within boundary
            room.x = minX + Math.random() * (maxX - minX);
            room.y = minY + Math.random() * (maxY - minY);

            // Reset dimensions to initial target values (removes any "squished" bias)
            room.width = Math.sqrt(room.targetArea * room.targetRatio);
            room.height = room.targetArea / room.width;

            // Reset accumulated pressure history to prevent momentum carryover
            room.accumulatedPressureX = 0;
            room.accumulatedPressureY = 0;
          }

          // 2. INCUBATION PHASE: The "Mini-Evolution" / "Boot Camp"
          // Run a private, accelerated evolution loop to untangle topology before
          // this gene joins the main population. This prevents "survival of the luckiest"
          // by allowing the fresh gene to organize itself first.
          const warmUpSteps = this.config.freshBloodWarmUp || 100;

          for (let j = 0; j < warmUpSteps; j++) {
            // Step A: AGGRESSIVE MUTATION (The "Pull")
            // Force topological untangling through swaps, partner attraction, and centering
            freshGene.mutate(
              0.9,                                    // 90% chance to mutate (very high activity)
              this.config.mutationStrength * 3.0,    // Violent movement allowed for rapid organization
              1.0,                                    // 100% aspect ratio adaptation for shape flexibility
              this.globalTargetRatio,
              incubationConfig,                       // Use hyper-active config
              this.adjacencies
            );

            // Step B: PHYSICS RESOLUTION (The "Push")
            // Resolve overlaps and boundary violations created by aggressive mutation
            freshGene.applySquishCollisions(this.boundary, incubationConfig, this.globalTargetRatio);
          }

          // 3. GRADUATION
          // The gene is now "incubated" and ready to join the main population
          // Final collision pass to ensure valid state
          freshGene.applySquishCollisions(this.boundary, this.config, this.globalTargetRatio);

          // CRITICAL: Calculate fitness so the gene can compete fairly
          // Without this, fresh genes inherit the best fitness from templateGene.clone()
          // which breaks selection pressure (random genes masquerading as elite)
          freshGene.calculateFitness(
            this.boundary,
            this.adjacencies,
            this.config.fitnessBalance,
            this.config
          );

          freshGenesFitnesses.push(freshGene.fitness);

          if (i === 0) {
            // Log first fresh gene details
            console.log(`   Fresh Gene #1: inherited=${inheritedFitness.toFixed(2)} → calculated=${freshGene.fitness.toFixed(2)} (G=${freshGene.fitnessG.toFixed(2)}, T=${freshGene.fitnessT.toFixed(2)})`);
          }

          this.genes.push(freshGene);
        }

        const popSizeAfter = this.genes.length;
        const avgFreshFitness = freshGenesFitnesses.reduce((a, b) => a + b, 0) / freshGenesFitnesses.length;
        const minFreshFitness = Math.min(...freshGenesFitnesses);
        const maxFreshFitness = Math.max(...freshGenesFitnesses);

        console.log(`   Created ${numToReplace} fresh genes with avg fitness: ${avgFreshFitness.toFixed(2)} (range: ${minFreshFitness.toFixed(2)} - ${maxFreshFitness.toFixed(2)})`);
        console.log(`   Population after: ${popSizeAfter} genes`);
        console.log(`   ✓ Fresh blood injection complete\n`);
        } catch (error) {
          console.error(`❌ [Gen ${this.currentGeneration}] Fresh Blood Injection FAILED:`, error);
          throw error; // Re-throw to ensure we don't silently fail
        }
      }
    }
  }

  /**
   * Get the best gene (lowest fitness)
   */
  getBest(): Gene {
    // Ensure genes are sorted
    this.genes.sort((a, b) => a.fitness - b.fitness);
    return this.genes[0];
  }

  /**
   * Get all genes in the population
   */
  getAll(): Gene[] {
    return [...this.genes];
  }

  /**
   * Get population statistics for monitoring
   */
  getStats(): {
    bestFitness: number;
    worstFitness: number;
    avgFitness: number;
    bestFitnessG: number;
    bestFitnessT: number;
  } {
    if (this.genes.length === 0) {
      return {
        bestFitness: Infinity,
        worstFitness: Infinity,
        avgFitness: Infinity,
        bestFitnessG: Infinity,
        bestFitnessT: Infinity,
      };
    }

    const fitnesses = this.genes.map(g => g.fitness);
    const best = this.getBest();

    return {
      bestFitness: Math.min(...fitnesses),
      worstFitness: Math.max(...fitnesses),
      avgFitness: fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length,
      bestFitnessG: best.fitnessG,
      bestFitnessT: best.fitnessT,
    };
  }
}
