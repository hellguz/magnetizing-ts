import type { Meta, StoryObj } from '@storybook/html';
import { SpringSolver } from '../core/solvers/SpringSolver.js';
import { RoomState, Adjacency } from '../types.js';
import { Vec2 } from '../core/geometry/Vector2.js';
import { Polygon } from '../core/geometry/Polygon.js';

interface SpringRendererArgs {
  adjacencyForce: number;
  repulsionForce: number;
  boundaryForce: number;
  aspectRatioForce: number;
  friction: number;
  autoPlay: boolean;
}

const createRenderer = (args: SpringRendererArgs) => {
  const container = document.createElement('div');
  container.style.padding = '20px';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return container;

  canvas.width = 600;
  canvas.height = 500;
  canvas.style.border = '1px solid #ccc';

  // Define boundary
  const boundary: Vec2[] = [
    { x: 50, y: 50 },
    { x: 550, y: 50 },
    { x: 550, y: 450 },
    { x: 50, y: 450 },
  ];

  // Initial room states (pre-placed)
  const rooms: RoomState[] = [
    {
      id: 'living-room',
      x: 100,
      y: 100,
      width: 150,
      height: 120,
      vx: 0,
      vy: 0,
      minRatio: 1.0,
      maxRatio: 1.5,
    },
    {
      id: 'kitchen',
      x: 300,
      y: 100,
      width: 110,
      height: 100,
      vx: 0,
      vy: 0,
      minRatio: 0.8,
      maxRatio: 1.2,
    },
    {
      id: 'bedroom',
      x: 100,
      y: 280,
      width: 120,
      height: 110,
      vx: 0,
      vy: 0,
      minRatio: 0.9,
      maxRatio: 1.3,
    },
    {
      id: 'bathroom',
      x: 350,
      y: 300,
      width: 80,
      height: 70,
      vx: 0,
      vy: 0,
      minRatio: 0.7,
      maxRatio: 1.0,
    },
  ];

  // Adjacencies
  const adjacencies: Adjacency[] = [
    { a: 'living-room', b: 'kitchen', weight: 1.0 },
    { a: 'kitchen', b: 'bathroom', weight: 1.0 },
    { a: 'bedroom', b: 'bathroom', weight: 1.0 },
  ];

  // Create solver
  const solver = new SpringSolver(rooms, boundary, adjacencies, {
    timestep: 0.016,
    friction: args.friction,
    maxVelocity: 50.0,
    forces: {
      adjacency: args.adjacencyForce,
      repulsion: args.repulsionForce,
      boundary: args.boundaryForce,
      aspectRatio: args.aspectRatioForce,
    },
  });

  const roomColors: Record<string, string> = {
    'living-room': '#ff6b6b',
    'kitchen': '#4ecdc4',
    'bedroom': '#45b7d1',
    'bathroom': '#f7b731',
  };

  let animationId: number | null = null;
  let iteration = 0;

  const render = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw boundary
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(boundary[0].x, boundary[0].y);
    for (let i = 1; i < boundary.length; i++) {
      ctx.lineTo(boundary[i].x, boundary[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    const state = solver.getState();

    // Draw adjacency connections
    ctx.strokeStyle = '#00aa00';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);

    for (const adj of adjacencies) {
      const roomA = state.find(r => r.id === adj.a);
      const roomB = state.find(r => r.id === adj.b);

      if (roomA && roomB) {
        const centerA = { x: roomA.x + roomA.width / 2, y: roomA.y + roomA.height / 2 };
        const centerB = { x: roomB.x + roomB.width / 2, y: roomB.y + roomB.height / 2 };

        ctx.beginPath();
        ctx.moveTo(centerA.x, centerA.y);
        ctx.lineTo(centerB.x, centerB.y);
        ctx.stroke();
      }
    }

    ctx.setLineDash([]);

    // Check for overlaps and draw rooms
    for (let i = 0; i < state.length; i++) {
      const room = state[i];
      const roomPoly = Polygon.createRectangle(room.x, room.y, room.width, room.height);

      // Check overlap with other rooms
      let hasOverlap = false;
      for (let j = 0; j < state.length; j++) {
        if (i === j) continue;
        const otherRoom = state[j];
        const otherPoly = Polygon.createRectangle(
          otherRoom.x,
          otherRoom.y,
          otherRoom.width,
          otherRoom.height
        );

        const overlapArea = Polygon.intersectionArea(roomPoly, otherPoly);
        if (overlapArea > 0.01) {
          hasOverlap = true;
          break;
        }
      }

      // Draw room
      ctx.fillStyle = roomColors[room.id] || '#cccccc';
      ctx.globalAlpha = hasOverlap ? 0.6 : 0.8;
      ctx.fillRect(room.x, room.y, room.width, room.height);

      // Draw overlap indicator
      if (hasOverlap) {
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(room.x, room.y, room.width, room.height);
      } else {
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(room.x, room.y, room.width, room.height);
      }

      ctx.globalAlpha = 1.0;

      // Draw label
      ctx.fillStyle = '#000000';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        room.id,
        room.x + room.width / 2,
        room.y + room.height / 2
      );

      // Draw velocity vector (for debugging)
      const speed = Math.sqrt(room.vx * room.vx + room.vy * room.vy);
      if (speed > 0.1) {
        const centerX = room.x + room.width / 2;
        const centerY = room.y + room.height / 2;
        const scale = 2;

        ctx.strokeStyle = '#0000ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + room.vx * scale, centerY + room.vy * scale);
        ctx.stroke();

        // Arrow head
        const angle = Math.atan2(room.vy, room.vx);
        const headLength = 5;
        ctx.beginPath();
        ctx.moveTo(centerX + room.vx * scale, centerY + room.vy * scale);
        ctx.lineTo(
          centerX + room.vx * scale - headLength * Math.cos(angle - Math.PI / 6),
          centerY + room.vy * scale - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(centerX + room.vx * scale, centerY + room.vy * scale);
        ctx.lineTo(
          centerX + room.vx * scale - headLength * Math.cos(angle + Math.PI / 6),
          centerY + room.vy * scale - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
      }
    }
  };

  const step = () => {
    solver.step();
    iteration++;
    render();

    const energy = solver.getKineticEnergy();
    info.innerHTML = `
      <strong>Spring Solver (Physics Simulation)</strong><br>
      Iteration: ${iteration}<br>
      Kinetic Energy: ${energy.toFixed(2)}<br>
      Converged: ${solver.hasConverged(0.1) ? 'Yes' : 'No'}<br>
      <br>
      <strong>Forces:</strong><br>
      Adjacency: ${args.adjacencyForce}<br>
      Repulsion: ${args.repulsionForce}<br>
      Boundary: ${args.boundaryForce}<br>
      Aspect Ratio: ${args.aspectRatioForce}<br>
      Friction: ${args.friction}
    `;

    if (args.autoPlay && !solver.hasConverged(0.1)) {
      animationId = requestAnimationFrame(step);
    }
  };

  // Initial render
  render();

  // Controls
  const controls = document.createElement('div');
  controls.style.marginTop = '10px';

  const stepButton = document.createElement('button');
  stepButton.textContent = 'Step';
  stepButton.onclick = () => step();

  const playButton = document.createElement('button');
  playButton.textContent = args.autoPlay ? 'Pause' : 'Play';
  playButton.onclick = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
      playButton.textContent = 'Play';
    } else {
      playButton.textContent = 'Pause';
      step();
    }
  };

  const resetButton = document.createElement('button');
  resetButton.textContent = 'Reset';
  resetButton.onclick = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    iteration = 0;
    // Re-create solver with initial state
    const newSolver = new SpringSolver(rooms, boundary, adjacencies, {
      timestep: 0.016,
      friction: args.friction,
      maxVelocity: 50.0,
      forces: {
        adjacency: args.adjacencyForce,
        repulsion: args.repulsionForce,
        boundary: args.boundaryForce,
        aspectRatio: args.aspectRatioForce,
      },
    });
    Object.assign(solver, newSolver);
    render();
    playButton.textContent = 'Play';
  };

  controls.appendChild(stepButton);
  controls.appendChild(playButton);
  controls.appendChild(resetButton);

  // Info display
  const info = document.createElement('div');
  info.style.marginTop = '10px';
  info.style.fontFamily = 'monospace';

  container.appendChild(canvas);
  container.appendChild(controls);
  container.appendChild(info);

  // Auto-play if enabled
  if (args.autoPlay) {
    playButton.textContent = 'Pause';
    animationId = requestAnimationFrame(step);
  } else {
    info.innerHTML = `
      <strong>Spring Solver (Physics Simulation)</strong><br>
      Click "Play" or "Step" to run simulation
    `;
  }

  return container;
};

const meta: Meta<SpringRendererArgs> = {
  title: 'Solvers/Spring Renderer',
  tags: ['autodocs'],
  render: createRenderer,
  argTypes: {
    adjacencyForce: {
      control: { type: 'range', min: 0, max: 50, step: 1 },
      description: 'Spring force between adjacent rooms',
    },
    repulsionForce: {
      control: { type: 'range', min: 0, max: 500, step: 10 },
      description: 'Repulsion force for overlapping rooms',
    },
    boundaryForce: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
      description: 'Force pushing rooms inside boundary',
    },
    aspectRatioForce: {
      control: { type: 'range', min: 0, max: 50, step: 5 },
      description: 'Force preserving room aspect ratios',
    },
    friction: {
      control: { type: 'range', min: 0.5, max: 0.99, step: 0.01 },
      description: 'Friction coefficient (higher = slower)',
    },
    autoPlay: {
      control: { type: 'boolean' },
      description: 'Auto-play simulation on load',
    },
  },
};

export default meta;
type Story = StoryObj<SpringRendererArgs>;

export const Default: Story = {
  args: {
    adjacencyForce: 10,
    repulsionForce: 200,
    boundaryForce: 50,
    aspectRatioForce: 20,
    friction: 0.9,
    autoPlay: false,
  },
};

export const HighRepulsion: Story = {
  args: {
    adjacencyForce: 10,
    repulsionForce: 400,
    boundaryForce: 50,
    aspectRatioForce: 20,
    friction: 0.9,
    autoPlay: false,
  },
};

export const StrongAdjacency: Story = {
  args: {
    adjacencyForce: 30,
    repulsionForce: 200,
    boundaryForce: 50,
    aspectRatioForce: 20,
    friction: 0.9,
    autoPlay: false,
  },
};

export const AutoPlay: Story = {
  args: {
    adjacencyForce: 10,
    repulsionForce: 200,
    boundaryForce: 50,
    aspectRatioForce: 20,
    friction: 0.9,
    autoPlay: true,
  },
};
