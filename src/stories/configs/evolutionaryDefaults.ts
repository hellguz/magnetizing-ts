import { EvolutionaryTemplateType } from '../templates/evolutionaryTemplates.js';

/**
 * Storybook visualization arguments for Evolutionary Floorplan Solver
 */
export interface EvolutionaryVisualizationArgs {
  // Template
  template: EvolutionaryTemplateType;

  // Mutation operators
  teleportProbability: number;
  swapProbability: number;
  rotationProbability: number;

  // Physics
  maxAspectRatio: number;

  // Fitness weights
  sharedWallTarget: number;
  sharedWallWeight: number;
  geometricWeight: number;
  areaDeviationWeight: number;

  // Visualization
  showPopulationGrid: boolean;
  autoPlay: boolean;
  animationSpeed: number;
  showAdjacencies: boolean;
  showBoundary: boolean;

  // Boundary
  autoScaleBoundary: boolean;
  boundaryScale: number;
  globalTargetRatio: number;
  editBoundary: boolean;

  // Advanced
  useNonLinearOverlapPenalty: boolean;
  overlapPenaltyExponent: number;
}

/**
 * Default configuration for Evolutionary Floorplan Solver story
 */
export const evolutionaryDefaults: EvolutionaryVisualizationArgs = {
  // Template
  template: "howoge-3-room",

  // Mutation operators (probabilities should sum to ~1.0 for balanced mutations)
  teleportProbability: 0.3,
  swapProbability: 0.4,
  rotationProbability: 0.3,

  // Physics
  maxAspectRatio: 2.0,

  // Fitness weights
  sharedWallTarget: 1.5,           // 1.5 meters minimum shared wall
  sharedWallWeight: 1000,          // High priority (dominates fitness)
  geometricWeight: 10,             // Moderate penalty for overlaps/out-of-bounds
  areaDeviationWeight: 20,         // Moderate penalty for area deviation

  // Visualization
  showPopulationGrid: true,
  autoPlay: true,
  animationSpeed: 10,             
  showAdjacencies: true,
  showBoundary: true,

  // Boundary
  autoScaleBoundary: true,         // Auto-scale boundary to match room areas
  boundaryScale: 1.0,              // Additional manual scaling
  globalTargetRatio: 2.0,          // Global aspect ratio constraint
  editBoundary: false,             // Enable boundary editing

  // Advanced
  useNonLinearOverlapPenalty: true,
  overlapPenaltyExponent: 1.5,     // Slightly superlinear penalty for overlaps
};
