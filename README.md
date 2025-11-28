# magnetizing-fpg-ts

High-performance headless TypeScript library for procedural floor plan generation using a hybrid Discrete-Continuous Evolutionary Strategy.

## Features

✅ **Zero Magic Numbers** - All behavior controlled by explicit configuration
✅ **Strict TypeScript** - No `any`, full type safety
✅ **Data-Oriented Design** - Int32Array grids, static vector math
✅ **Deterministic** - Seeded PRNG for reproducible results
✅ **Physics-Based** - Spring solver with Symplectic Euler integration
✅ **Clipper Integration** - Precise polygon operations

## Project Status

**Core Complete** ✓
- [x] Discrete Solver (grid-based topological optimization)
- [x] Spring Solver (physics-based geometric refinement)
- [x] Comprehensive test suite (100+ tests)

See [TODO.md](TODO.md) for visualization roadmap.

## Quick Start

```bash
# Install dependencies
yarn install

# Build the library
yarn build

# Run tests
yarn test

# Development mode (watch)
yarn dev

# Run example
yarn example
```

## Usage

```typescript
import { DiscreteSolver, SpringSolver } from 'magnetizing-fpg-ts';

// 1. Define boundary
const boundary = [
  { x: 0, y: 0 },
  { x: 50, y: 0 },
  { x: 50, y: 40 },
  { x: 0, y: 40 },
];

// 2. Define rooms
const rooms = [
  { id: 'living-room', targetArea: 200, minRatio: 1.0, maxRatio: 1.5 },
  { id: 'kitchen', targetArea: 120, minRatio: 0.8, maxRatio: 1.2 },
];

// 3. Define adjacencies
const adjacencies = [
  { a: 'living-room', b: 'kitchen', weight: 2.0 }
];

// 4. Run discrete solver
const discrete = new DiscreteSolver(boundary, rooms, adjacencies);
discrete.solve();

// 5. Run spring solver
const roomStates = /* convert discrete result */;
const spring = new SpringSolver(roomStates, boundary, adjacencies);
spring.simulate(500);

const finalLayout = spring.getState();
```

See [examples/basic-usage.ts](examples/basic-usage.ts) for complete workflow.

## Documentation

- [SPEC.md](SPEC.md) - Complete technical specification
- [TODO.md](TODO.md) - Implementation roadmap

## Architecture

```
src/
├── index.ts          # Public API
├── types.ts          # Type definitions
├── constants.ts      # Configuration constants
├── core/
│   ├── geometry/     # Vector math & polygon utilities
│   ├── grid/         # Grid buffer (Int32Array)
│   └── solvers/      # Discrete & Spring solvers
└── utils/            # PRNG & helpers
```

## License

MIT
