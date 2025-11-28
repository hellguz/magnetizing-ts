# Storybook Visualization Guide

## Running Storybook

```bash
# Install dependencies (if not already done)
yarn install

# Start Storybook dev server
yarn storybook
```

Storybook will open at `http://localhost:6006`

## Available Stories

### 1. Introduction
Welcome page with project overview and algorithm explanation.

### 2. Discrete Renderer
Interactive visualization of the grid-based discrete solver.

**Controls:**
- **Grid Resolution** (0.5-2.0): Meters per grid cell - lower = finer grid
- **Mutation Rate** (0.1-0.9): Percentage of rooms to mutate each iteration
- **Max Iterations** (10-500): Number of evolutionary optimization cycles
- **Cell Size** (5-30): Visual pixel size of grid cells
- **Show Grid** (on/off): Toggle grid lines

**Stories:**
- `Default`: Standard configuration
- `High Resolution`: Fine grid (0.5m/cell) for precise placement
- `Low Mutation`: Conservative evolution (10% mutation)
- `High Mutation`: Aggressive exploration (70% mutation)

### 3. Spring Renderer
Interactive physics simulation of the continuous spring solver.

**Controls:**
- **Adjacency Force** (0-50): Spring attraction between connected rooms
- **Repulsion Force** (0-500): Strength of overlap resolution
- **Boundary Force** (0-100): Force keeping rooms inside boundary
- **Aspect Ratio Force** (0-50): Strength of room shape preservation
- **Friction** (0.5-0.99): Velocity damping coefficient
- **Auto Play** (on/off): Automatically run simulation on load

**Interactive Buttons:**
- **Step**: Advance simulation by one physics tick
- **Play/Pause**: Toggle continuous simulation
- **Reset**: Reset to initial state

**Visual Feedback:**
- Green dashed lines: Adjacency connections
- Red outlines: Rooms with overlaps
- Blue arrows: Velocity vectors (when moving)
- Energy display: Kinetic energy and convergence status

**Stories:**
- `Default`: Balanced forces for general use
- `High Repulsion`: Strong overlap resolution (400 repulsion)
- `Strong Adjacency`: Tight room clustering (30 adjacency)
- `Auto Play`: Runs simulation automatically

## Tips

1. **Compare Configurations**: Open multiple stories side-by-side to see parameter effects
2. **Watch Evolution**: In Discrete solver, try different mutation rates to see exploration vs exploitation
3. **Physics Debugging**: In Spring solver, use Step mode to watch force calculations frame-by-frame
4. **Convergence**: Monitor kinetic energy - simulation converges when energy approaches zero
5. **Overlap Resolution**: Red outlines indicate overlaps - increase repulsion force to resolve faster

## Building Static Site

```bash
# Build static Storybook site
yarn build-storybook
```

Output will be in `storybook-static/` directory.

## Troubleshooting

**Storybook won't start:**
- Run `yarn install` to ensure all dependencies are installed
- Check that port 6006 is not already in use

**Stories not updating:**
- Storybook auto-reloads on file changes
- If stuck, restart Storybook with `Ctrl+C` then `yarn storybook`

**TypeScript errors:**
- Run `yarn build` first to ensure the library compiles
- Check that `tsconfig.json` is valid
