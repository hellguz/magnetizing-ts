# Technical Specification: magnetizing-fpg-ts (Definitive Edition)

## 1. Executive Summary

**Artifact:** `magnetizing-fpg-ts`
**Description:** A high-performance, headless TypeScript library for procedural floor plan generation using a hybrid Discrete-Continuous Evolutionary Strategy.
**Constraint Checklist:**

  * **Zero Magic Numbers:** All logic driven by `DiscreteConfig` and `SpringConfig`.
  * **Strict Typing:** No `any`. Explicit interfaces.
  * **Data-Oriented Design:** `Int32Array` for grid state; Static `Vector2` math.
  * **No Framework Deps:** Pure TypeScript core; Storybook for dev only.

-----

## 2. Architecture & File Structure

```text
src/
├── index.ts                  # Public API Export (Solvers, Types, Constants)
├── types.ts                  # Domain Interfaces
├── constants.ts              # Default Configuration Values
├── core/
│   ├── geometry/             # Stateless Math
│   │   ├── Vector2.ts        # Static vector operations
│   │   └── Polygon.ts        # Clipper adapter & AABB utils
│   ├── grid/
│   │   └── GridBuffer.ts     # Low-level Int32Array wrapper
│   └── solvers/
│       ├── DiscreteSolver.ts # Topological Optimization (The Magnetizer)
│       └── SpringSolver.ts   # Geometric Optimization (The Physics)
└── utils/
    └── Random.ts             # PCG or Mulberry32 PRNG (Deterministic)
```

-----

## 3. Core Constants & Types

**Rule:** `Int32Array` holds signed 32-bit integers. It cannot hold `-Infinity`. We use specific negative integers for non-room states.

### `src/constants.ts`

```typescript
// Grid Cell States
export const CELL_EMPTY = 0;
export const CELL_CORRIDOR = -1;
export const CELL_OUT_OF_BOUNDS = -2; // Used instead of -Infinity for Int32 compatibility

// Defaults
export const DEFAULT_GRID_RESOLUTION = 1.0; // Meters per cell
export const DEFAULT_MAX_ITERATIONS = 500;
export const DEFAULT_MUTATION_RATE = 0.3;
```

### `src/types.ts`

```typescript
export interface DiscreteConfig {
  gridResolution: number;
  maxIterations: number;
  mutationRate: number; // 0.0 to 1.0
  weights: {
    compactness: number; // Reward touching neighbors
    adjacency: number;   // Reward satisfying connectivity graph
    corridor: number;    // Reward touching corridors
  };
}

export interface SpringConfig {
  timestep: number;    // e.g., 0.016
  friction: number;    // e.g., 0.90
  maxVelocity: number; // e.g., 50.0
  forces: {
    adjacency: number;   // Spring constant k
    repulsion: number;   // Overlap penalty
    boundary: number;    // Containment force
    aspectRatio: number; // Form preservation
  };
}

export interface RoomRequest {
  id: string;
  targetArea: number;
  minRatio: number;
  maxRatio: number;
  isHall?: boolean;
}

export interface Adjacency {
  a: string;
  b: string;
  weight?: number;
}
```

-----

## 4. Implementation Details

### 4.1 `src/core/geometry/Vector2.ts`

**Requirement:** Static methods only. **No** `new Vector2()` allocation in physics loops.

```typescript
export interface Vec2 { x: number; y: number; }

export class Vector2 {
  // Mutates 'out' to avoid GC
  static add(out: Vec2, a: Vec2, b: Vec2): void { out.x = a.x + b.x; out.y = a.y + b.y; }
  static sub(out: Vec2, a: Vec2, b: Vec2): void { out.x = a.x - b.x; out.y = a.y - b.y; }
  static mult(out: Vec2, a: Vec2, s: number): void { out.x = a.x * s; out.y = a.y * s; }
  static mag(a: Vec2): number { return Math.sqrt(a.x*a.x + a.y*a.y); }
  static dist(a: Vec2, b: Vec2): number { return Math.sqrt(Math.pow(a.x-b.x, 2) + Math.pow(a.y-b.y, 2)); }
  static normalize(out: Vec2, a: Vec2): void {
    const m = Vector2.mag(a);
    if (m > 0.00001) { out.x = a.x/m; out.y = a.y/m; }
  }
}
```

### 4.2 `src/core/grid/GridBuffer.ts`

**Requirement:** Flattened 1D array access.

  * **Properties:** `width`, `height`, `cells` (`Int32Array`).
  * **Method:** `index(x: number, y: number): number` returns `y * width + x`.
  * **Method:** `rasterizePolygon(polygon: Point[])`:
      * Calculate Bounding Box of polygon.
      * Iterate every cell `(x, y)`.
      * Perform "Point in Polygon" check (Ray Casting algorithm).
      * If outside, set `cells[i] = CELL_OUT_OF_BOUNDS`.

-----

### 4.3 `src/core/solvers/DiscreteSolver.ts` (The Algorithm)

**State:**

  * `grid`: `GridBuffer`.
  * `roomIndexMap`: Map `RoomID` string to integer `1..N`.

**Step 1: Initialization**

1.  Initialize `GridBuffer`.
2.  Rasterize Boundary (`CELL_OUT_OF_BOUNDS`).
3.  Sort rooms by "Connectivity Degree" (most connected rooms first).

**Step 2: Evolutionary Loop (`solve()`)**
Repeat `maxIterations` times:

1.  **Clone/Snapshot:** Create a copy of the grid (or use an Undo stack for performance).
2.  **Mutation:**
      * Identify placed rooms.
      * Select $K$ rooms to remove ($K = \text{totalRooms} \times \text{mutationRate}$).
      * Set their grid cells to `CELL_EMPTY`.
3.  **Placement Scan:**
    For each unplaced room:
      * Calculate target dimensions: $W = \sqrt{\text{Area} / \text{Ratio}}$, $H = \text{Area} / W$. (Randomize Ratio between min/max).
      * **Iterate** all grid cells `(x, y)`:
          * **Validity Check:** Check if rectangle `(x, y, w, h)` contains ONLY `CELL_EMPTY`.
          * **Adjacency Check:** Check if the perimeter touches any `CELL_CORRIDOR` or `> 0` (Existing Room).
          * **Score:**
              * `Compactness`: Count number of edges touching non-empty cells.
              * `Adjacency`: Distance to required neighbor centroids (Dijkstra or Euclidean).
              * `TotalScore = (Compactness * weights.compactness) - (Dist * weights.adjacency)`.
      * Place room at the position with the highest `TotalScore`.
4.  **Evaluation:**
      * Calculate global score of the new grid state.
      * If `NewGlobalScore > BestGlobalScore`, keep new grid. Else, revert to snapshot.

-----

### 4.4 `src/core/solvers/SpringSolver.ts` (The Physics)

**Input:** `LayoutState` (Rectangles from Discrete Phase).

**Step 1: Setup**

  * Initialize `velocity` vectors for all rooms to `{0,0}`.

**Step 2: Physics Tick (`step()`)**

1.  **Force Accumulation:**

      * **Adjacency (Attraction):**
          * Iterate `adjacencies`. Let $A, B$ be centers of rooms.
          * Vector $\vec{d} = B - A$.
          * Force $F = \text{normalize}(\vec{d}) \times (|\vec{d}| - 0) \times \text{forces.adjacency}$.
          * $F_{total} += F$.
      * **Repulsion (Overlap):**
          * Iterate all pairs $(R_1, R_2)$.
          * **AABB Check:** If `!intersect(bounds1, bounds2)` continue.
          * **Precise:** Use `Clipper.intersect(poly1, poly2)`. Area $O$.
          * If $O > 0$:
              * Direction $\vec{r} = R_1.\text{center} - R_2.\text{center}$.
              * Force $F = \text{normalize}(\vec{r}) \times O \times \text{forces.repulsion}$.
              * Apply $+F$ to $R_1$, $-F$ to $R_2$.
      * **Boundary (Confinement):**
          * Check if `Polygon.contains(Boundary, Room)`.
          * If false, vector $\vec{c} = \text{Boundary.centroid} - \text{Room.center}$.
          * Force $F = \text{normalize}(\vec{c}) \times \text{forces.boundary}$.
      * **Aspect Ratio (Internal):**
          * Current Ratio $R = w / h$.
          * If $R < \text{minRatio}$: Force expands Width, shrinks Height.
          * If $R > \text{maxRatio}$: Force shrinks Width, expands Height.

2.  **Integration (Symplectic Euler):**

      * $v_{new} = v_{old} + (F_{total} / \text{mass}) \times dt$
      * **Clamp Velocity:** If $|v_{new}| > \text{maxVelocity}$, scale it down.
      * $v_{new} *= \text{friction}$
      * $pos_{new} = pos_{old} + v_{new} \times dt$

-----

## 5. Storybook Stories

### 5.1 Discrete Visualization

  * **File:** `src/stories/Discrete.stories.ts`
  * **Renderer:** `Canvas 2D`.
  * **Logic:**
      * Draw grid cells as `fillRect(x*scale, y*scale, scale, scale)`.
      * Color `CELL_OUT_OF_BOUNDS` as Black.
      * Color `CELL_CORRIDOR` as Light Grey.
      * Color `>0` with distinct color per ID.
  * **Controls (Leva):**
      * `Resolution` (slider 0.5 to 2.0).
      * `Mutation Rate` (0.1 to 0.9).
      * `Step`: Runs one generation.
      * `Auto Run`: Loops generation.

### 5.2 Continuous Visualization

  * **File:** `src/stories/Continuous.stories.ts`
  * **Renderer:** `Canvas 2D` (Vector style).
  * **Logic:**
      * Draw filled polygons for rooms.
      * Draw Red Overlay if `intersect(A, B)`.
      * Draw Green Lines for adjacency connections.
  * **Controls (Leva):**
      * `Repulsion Force` (10 to 500).
      * `Adjacency Force` (1 to 50).
      * `Toggle Physics`: Starts/Stops `requestAnimationFrame` loop calling `solver.step()`.

-----

## 6. Development Guide for Agent

1.  **Repo Initialization:**

    ```bash
    yarn create vite magnetizing-fpg-ts --template vanilla-ts
    cd magnetizing-fpg-ts
    yarn add -D typescript vite vitest storybook @storybook/html @storybook/addon-essentials
    yarn add leva clipper-lib eventemitter3
    # Configure Vite for library mode (entry: src/index.ts)
    ```

2.  **Implementation Order (Strict):**

    1.  Create `src/constants.ts` and `src/types.ts`.
    2.  Implement `Vector2.ts`. **TEST:** Write unit test for `add`/`sub`.
    3.  Implement `GridBuffer.ts`. **TEST:** Write unit test for `rasterizePolygon`. Ensure `-2` is set correctly.
    4.  Implement `DiscreteSolver.ts`. Use the constants. **Verify:** No `new Array` in loops.
    5.  Implement `SpringSolver.ts`. **Verify:** `Polygon` collision logic uses AABB shortcut.
    6.  Implement Storybook stories to visually verify behavior.

3.  **Clipper WASM Handling:**

      * `clipper-lib` returns a Promise.
      * Create a singleton `GeometryInit` that must be awaited before Solvers can run.
      * Storybook must show "Loading..." until WASM is ready.

-----

## 7. Example API Usage

```typescript
import { DiscreteSolver, SpringSolver } from 'magnetizing-fpg-ts';
import { DiscreteConfig, SpringConfig } from 'magnetizing-fpg-ts/types';

// 1. Config (No Magic Numbers)
const dConfig: DiscreteConfig = {
    gridResolution: 1,
    maxIterations: 100,
    mutationRate: 0.2,
    weights: { compactness: 2.0, adjacency: 3.0, corridor: 0.5 }
};

// 2. Initialize
const discrete = new DiscreteSolver(boundaryPoly, rooms, adjacencies, dConfig);
await discrete.init(); // Wait for Clipper WASM

// 3. Solve Topology
const layoutState = discrete.solve();

// 4. Solve Geometry
const spring = new SpringSolver(layoutState, {
    timestep: 0.016,
    forces: { repulsion: 200, adjacency: 10, boundary: 50, aspectRatio: 20 }
} as SpringConfig);

// 5. Loop
function tick() {
    spring.step();
    render(spring.getState());
}
```
