import { GridBuffer, Point } from '../grid/GridBuffer.js';
import { Random } from '../../utils/Random.js';
import { DiscreteConfig, RoomRequest, Adjacency } from '../../types.js';
import { CELL_EMPTY, CELL_CORRIDOR, CELL_OUT_OF_BOUNDS, DEFAULT_GRID_RESOLUTION, DEFAULT_MAX_ITERATIONS, DEFAULT_MUTATION_RATE } from '../../constants.js';

interface PlacedRoom {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  roomIndex: number;
}

interface PlacementCandidate {
  x: number;
  y: number;
  width: number;
  height: number;
  score: number;
}

/**
 * Discrete solver for topological optimization using evolutionary strategy.
 * Places rooms on a grid using mutation and scoring.
 */
export class DiscreteSolver {
  private grid: GridBuffer;
  private rooms: RoomRequest[];
  private adjacencies: Adjacency[];
  private config: DiscreteConfig;
  private rng: Random;
  private roomIndexMap: Map<string, number>;
  private placedRooms: Map<string, PlacedRoom>;
  private bestGrid: GridBuffer | null = null;
  private bestScore: number = -Infinity;

  constructor(
    boundary: Point[],
    rooms: RoomRequest[],
    adjacencies: Adjacency[],
    config: Partial<DiscreteConfig> = {},
    seed: number = Date.now()
  ) {
    this.rooms = [...rooms];
    this.adjacencies = adjacencies;
    this.rng = new Random(seed);

    // Merge with defaults
    this.config = {
      gridResolution: config.gridResolution ?? DEFAULT_GRID_RESOLUTION,
      maxIterations: config.maxIterations ?? DEFAULT_MAX_ITERATIONS,
      mutationRate: config.mutationRate ?? DEFAULT_MUTATION_RATE,
      weights: {
        compactness: config.weights?.compactness ?? 2.0,
        adjacency: config.weights?.adjacency ?? 3.0,
        corridor: config.weights?.corridor ?? 0.5,
      },
    };

    // Calculate grid dimensions from boundary
    const { width, height } = this.calculateGridDimensions(boundary);
    this.grid = new GridBuffer(width, height);
    this.grid.rasterizePolygon(boundary);

    // Create room index map (1-based indexing for grid cells)
    this.roomIndexMap = new Map();
    this.rooms.forEach((room, idx) => {
      this.roomIndexMap.set(room.id, idx + 1);
    });

    this.placedRooms = new Map();
  }

  /**
   * Calculate grid dimensions from boundary polygon
   */
  private calculateGridDimensions(boundary: Point[]): { width: number; height: number } {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of boundary) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    const width = Math.ceil((maxX - minX) / this.config.gridResolution);
    const height = Math.ceil((maxY - minY) / this.config.gridResolution);

    return { width, height };
  }

  /**
   * Sort rooms by connectivity degree (most connected first)
   */
  private sortRoomsByConnectivity(): RoomRequest[] {
    const connectivityMap = new Map<string, number>();

    // Count connections for each room
    this.rooms.forEach(room => connectivityMap.set(room.id, 0));
    this.adjacencies.forEach(adj => {
      connectivityMap.set(adj.a, (connectivityMap.get(adj.a) || 0) + 1);
      connectivityMap.set(adj.b, (connectivityMap.get(adj.b) || 0) + 1);
    });

    // Sort descending by connectivity
    return [...this.rooms].sort((a, b) => {
      return (connectivityMap.get(b.id) || 0) - (connectivityMap.get(a.id) || 0);
    });
  }

  /**
   * Check if a rectangle fits in the grid at position (x, y)
   */
  private canPlaceRoom(x: number, y: number, width: number, height: number): boolean {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const cellValue = this.grid.get(x + dx, y + dy);
        if (cellValue !== CELL_EMPTY) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Calculate compactness score (number of edges touching non-empty cells)
   */
  private calculateCompactness(x: number, y: number, width: number, height: number): number {
    let touchCount = 0;

    // Check perimeter cells
    for (let dx = 0; dx < width; dx++) {
      // Top edge
      const topCell = this.grid.get(x + dx, y - 1);
      if (topCell !== CELL_EMPTY && topCell !== CELL_OUT_OF_BOUNDS) touchCount++;

      // Bottom edge
      const bottomCell = this.grid.get(x + dx, y + height);
      if (bottomCell !== CELL_EMPTY && bottomCell !== CELL_OUT_OF_BOUNDS) touchCount++;
    }

    for (let dy = 0; dy < height; dy++) {
      // Left edge
      const leftCell = this.grid.get(x - 1, y + dy);
      if (leftCell !== CELL_EMPTY && leftCell !== CELL_OUT_OF_BOUNDS) touchCount++;

      // Right edge
      const rightCell = this.grid.get(x + width, y + dy);
      if (rightCell !== CELL_EMPTY && rightCell !== CELL_OUT_OF_BOUNDS) touchCount++;
    }

    return touchCount;
  }

  /**
   * Calculate adjacency score (distance to required neighbors)
   */
  private calculateAdjacencyScore(roomId: string, cx: number, cy: number): number {
    let totalDistance = 0;
    let count = 0;

    // Find all required adjacencies for this room
    const requiredNeighbors = this.adjacencies.filter(
      adj => adj.a === roomId || adj.b === roomId
    );

    for (const adj of requiredNeighbors) {
      const neighborId = adj.a === roomId ? adj.b : adj.a;
      const neighbor = this.placedRooms.get(neighborId);

      if (neighbor) {
        // Calculate distance from center to neighbor center
        const neighborCx = neighbor.x + neighbor.width / 2;
        const neighborCy = neighbor.y + neighbor.height / 2;
        const distance = Math.sqrt(
          Math.pow(cx - neighborCx, 2) + Math.pow(cy - neighborCy, 2)
        );
        totalDistance += distance * (adj.weight ?? 1.0);
        count++;
      }
    }

    return count > 0 ? totalDistance / count : 0;
  }

  /**
   * Place a room on the grid
   */
  private placeRoom(room: RoomRequest, x: number, y: number, width: number, height: number): void {
    const roomIndex = this.roomIndexMap.get(room.id) || 0;

    // Place room core
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        this.grid.set(x + dx, y + dy, roomIndex);
      }
    }

    // Paint corridors if rule is defined (NONE = 0 is falsy)
    if (room.corridorRule) {
      this.paintCorridors(x, y, width, height, room.corridorRule);
    }

    this.placedRooms.set(room.id, {
      id: room.id,
      x,
      y,
      width,
      height,
      roomIndex,
    });
  }

  /**
   * Paint corridor cells around a room according to the corridor rule.
   * Only overwrites CELL_EMPTY; never overwrites rooms.
   */
  private paintCorridors(x: number, y: number, w: number, h: number, rule: number): void {
    const tryPaint = (px: number, py: number) => {
      if (this.grid.get(px, py) === CELL_EMPTY) {
        this.grid.set(px, py, CELL_CORRIDOR);
      }
    };

    // CorridorRule.ONE_SIDE = 1: Bottom strip
    if (rule >= 1) {
      const bottomY = y + h;
      for (let px = x; px < x + w; px++) {
        tryPaint(px, bottomY);
      }
    }

    // CorridorRule.TWO_SIDES = 2: Bottom + Right (L-Shape)
    if (rule >= 2) {
      const rightX = x + w;
      for (let py = y; py <= y + h; py++) {
        tryPaint(rightX, py);
      }
    }

    // CorridorRule.ALL_SIDES = 3: Halo (all 4 sides)
    if (rule >= 3) {
      // Top strip
      const topY = y - 1;
      for (let px = x - 1; px <= x + w; px++) {
        tryPaint(px, topY);
      }

      // Bottom strip (extended to include corners)
      const bottomY = y + h;
      for (let px = x - 1; px <= x + w; px++) {
        tryPaint(px, bottomY);
      }

      // Left strip (without top/bottom corners already painted)
      const leftX = x - 1;
      for (let py = y; py < y + h; py++) {
        tryPaint(leftX, py);
      }

      // Right strip (without top/bottom corners already painted)
      const rightX = x + w;
      for (let py = y; py < y + h; py++) {
        tryPaint(rightX, py);
      }
    }
  }

  /**
   * Remove a room from the grid
   */
  private removeRoom(roomId: string): void {
    const room = this.placedRooms.get(roomId);
    if (!room) return;

    for (let dy = 0; dy < room.height; dy++) {
      for (let dx = 0; dx < room.width; dx++) {
        this.grid.set(room.x + dx, room.y + dy, CELL_EMPTY);
      }
    }

    this.placedRooms.delete(roomId);
  }

  /**
   * Find best placement for a room
   */
  private findBestPlacement(room: RoomRequest): PlacementCandidate | null {
    // Calculate target dimensions
    const ratio = this.rng.nextFloat(room.minRatio, room.maxRatio);
    const width = Math.ceil(Math.sqrt(room.targetArea / ratio) / this.config.gridResolution);
    const height = Math.ceil((room.targetArea / (width * this.config.gridResolution)) / this.config.gridResolution);

    let bestCandidate: PlacementCandidate | null = null;
    let bestScore = -Infinity;

    // Scan all grid positions
    for (let y = 0; y < this.grid.height - height; y++) {
      for (let x = 0; x < this.grid.width - width; x++) {
        if (!this.canPlaceRoom(x, y, width, height)) {
          continue;
        }

        const cx = x + width / 2;
        const cy = y + height / 2;

        const compactness = this.calculateCompactness(x, y, width, height);
        const adjacencyDist = this.calculateAdjacencyScore(room.id, cx, cy);

        const score =
          compactness * this.config.weights.compactness -
          adjacencyDist * this.config.weights.adjacency;

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = { x, y, width, height, score };
        }
      }
    }

    return bestCandidate;
  }

  /**
   * Calculate global score of current layout
   */
  private calculateGlobalScore(): number {
    let score = 0;

    // Score based on number of rooms placed
    score += this.placedRooms.size * 100;

    // Score based on satisfied adjacencies
    for (const adj of this.adjacencies) {
      const roomA = this.placedRooms.get(adj.a);
      const roomB = this.placedRooms.get(adj.b);

      if (roomA && roomB) {
        const dx = (roomA.x + roomA.width / 2) - (roomB.x + roomB.width / 2);
        const dy = (roomA.y + roomA.height / 2) - (roomB.y + roomB.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Closer is better
        score -= dist * (adj.weight ?? 1.0);
      }
    }

    return score;
  }

  /**
   * Count non-empty neighbors (not CELL_EMPTY and not CELL_OUT_OF_BOUNDS)
   */
  private countNonEmptyNeighbors(x: number, y: number): number {
    let count = 0;
    const neighbors = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];

    for (const neighbor of neighbors) {
      const val = this.grid.get(neighbor.x, neighbor.y);
      if (val !== CELL_EMPTY && val !== CELL_OUT_OF_BOUNDS) {
        count++;
      }
    }

    return count;
  }

  /**
   * Iteratively remove dead-end corridor cells.
   * A dead end is a corridor cell with <= 1 non-empty neighbor.
   */
  pruneDeadEnds(): void {
    let changed = true;

    while (changed) {
      changed = false;

      for (let y = 0; y < this.grid.height; y++) {
        for (let x = 0; x < this.grid.width; x++) {
          if (this.grid.get(x, y) === CELL_CORRIDOR) {
            const neighbors = this.countNonEmptyNeighbors(x, y);
            if (neighbors <= 1) {
              this.grid.set(x, y, CELL_EMPTY);
              changed = true;
            }
          }
        }
      }
    }
  }

  /**
   * Run the evolutionary algorithm
   */
  solve(): GridBuffer {
    // Initial placement (greedy)
    const sortedRooms = this.sortRoomsByConnectivity();
    for (const room of sortedRooms) {
      const candidate = this.findBestPlacement(room);
      if (candidate) {
        this.placeRoom(room, candidate.x, candidate.y, candidate.width, candidate.height);
      }
    }

    this.bestGrid = this.grid.clone();
    this.bestScore = this.calculateGlobalScore();

    // Evolutionary loop
    for (let iter = 0; iter < this.config.maxIterations; iter++) {
      // Create snapshot
      const snapshot = this.grid.clone();
      const snapshotRooms = new Map(this.placedRooms);

      // Mutation: remove K random rooms
      const placedRoomIds = Array.from(this.placedRooms.keys());
      const numToRemove = Math.ceil(placedRoomIds.length * this.config.mutationRate);
      const toRemove = this.rng.shuffle([...placedRoomIds]).slice(0, numToRemove);

      for (const roomId of toRemove) {
        this.removeRoom(roomId);
      }

      // Re-place removed rooms
      const unplacedRooms = this.rooms.filter(room => !this.placedRooms.has(room.id));
      for (const room of unplacedRooms) {
        const candidate = this.findBestPlacement(room);
        if (candidate) {
          this.placeRoom(room, candidate.x, candidate.y, candidate.width, candidate.height);
        }
      }

      // Evaluate
      const newScore = this.calculateGlobalScore();

      if (newScore > this.bestScore) {
        // Accept new state
        this.bestScore = newScore;
        this.bestGrid = this.grid.clone();
      } else {
        // Revert to snapshot
        this.grid = snapshot;
        this.placedRooms = snapshotRooms;
      }
    }

    // Final cleanup: remove dead-end corridors
    this.pruneDeadEnds();
    if (this.bestGrid) {
      // Also prune the best grid
      const tempGrid = this.grid;
      this.grid = this.bestGrid;
      this.pruneDeadEnds();
      this.bestGrid = this.grid;
      this.grid = tempGrid;
    }

    return this.bestGrid || this.grid;
  }

  /**
   * Get current grid state
   */
  getGrid(): GridBuffer {
    return this.grid;
  }

  /**
   * Get placed rooms
   */
  getPlacedRooms(): Map<string, PlacedRoom> {
    return new Map(this.placedRooms);
  }
}
