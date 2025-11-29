# Storybook

Run: `npm run storybook`

## Stories

**Solvers/Discrete Solver** - Grid-based evolutionary solver with corridor connectivity
**Solvers/Spring Solver** - Physics-based continuous solver

## Interactive Controls

### Navigation
- **Pan**: Click and drag on the canvas
- **Zoom**: Mouse wheel to zoom in/out

### Solver Parameters
- **Template**: 6 room configs (small-apartment, office-suite, house, gallery, clinic, restaurant)
- **Grid Resolution**: Meters per cell (Discrete only)
- **Mutation Rate**: Evolutionary mutation rate (Discrete only)
- **Max Iterations**: Maximum solver iterations (Discrete only)
- **Force Parameters**: Adjacency, repulsion, boundary, aspect ratio (Spring only)
- **Friction**: Simulation friction coefficient (Spring only)

### Visualization Options
- **Show Boundary**: Red dashed line showing apartment boundary
- **Show Adjacencies**: Red dashed lines between rooms (thickness = weight)
- **Show Start Point**: Red circle marking entrance (Discrete only)
- **Show Velocity**: Blue arrows showing room velocities (Spring only)
- **Show Grid**: Grid lines overlay (Discrete only)

### Simulation Controls (Spring only)
- **Play/Pause**: Start/stop the physics simulation
- **Step**: Advance simulation by one frame
- **Reset**: Reset to initial state
- **Auto Play**: Automatically start simulation on load

## Visual Legend

**Discrete Solver**
- Gray = corridors
- Colors = rooms
- Black = out of bounds
- Red dashed line = boundary
- Red circle = entrance point

**Spring Solver**
- Red outline = overlapping rooms
- Blue arrows = velocity vectors
- Red dashed line = boundary
- Red dashed connections = adjacency preferences
