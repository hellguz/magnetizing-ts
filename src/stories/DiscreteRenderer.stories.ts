import type { Meta, StoryObj } from '@storybook/html';
import { DiscreteSolver } from '../core/solvers/DiscreteSolver.js';
import { Point } from '../core/grid/GridBuffer.js';
import { RoomRequest, Adjacency } from '../types.js';
import { CELL_EMPTY, CELL_OUT_OF_BOUNDS } from '../constants.js';

interface DiscreteRendererArgs {
  gridResolution: number;
  mutationRate: number;
  maxIterations: number;
  cellSize: number;
  showGrid: boolean;
}

const createRenderer = (args: DiscreteRendererArgs) => {
  const container = document.createElement('div');
  container.style.padding = '20px';

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return container;

  // Define boundary
  const boundary: Point[] = [
    { x: 0, y: 0 },
    { x: 50, y: 0 },
    { x: 50, y: 40 },
    { x: 0, y: 40 },
  ];

  // Define rooms
  const rooms: RoomRequest[] = [
    {
      id: 'living-room',
      targetArea: 200,
      minRatio: 1.0,
      maxRatio: 1.5,
    },
    {
      id: 'kitchen',
      targetArea: 120,
      minRatio: 0.8,
      maxRatio: 1.2,
    },
    {
      id: 'bedroom',
      targetArea: 150,
      minRatio: 0.9,
      maxRatio: 1.3,
    },
    {
      id: 'bathroom',
      targetArea: 60,
      minRatio: 0.7,
      maxRatio: 1.0,
    },
  ];

  // Define adjacencies
  const adjacencies: Adjacency[] = [
    { a: 'living-room', b: 'kitchen', weight: 2.0 },
    { a: 'kitchen', b: 'bathroom', weight: 1.5 },
    { a: 'bedroom', b: 'bathroom', weight: 1.0 },
  ];

  // Create solver
  const solver = new DiscreteSolver(
    boundary,
    rooms,
    adjacencies,
    {
      gridResolution: args.gridResolution,
      maxIterations: args.maxIterations,
      mutationRate: args.mutationRate,
      weights: {
        compactness: 2.0,
        adjacency: 3.0,
        corridor: 0.5,
      },
    },
    42 // Fixed seed for consistency
  );

  // Solve
  solver.solve();

  const grid = solver.getGrid();
  const placedRooms = solver.getPlacedRooms();

  // Set canvas size
  canvas.width = grid.width * args.cellSize;
  canvas.height = grid.height * args.cellSize;
  canvas.style.border = '1px solid #ccc';

  // Color map for rooms
  const roomColors = new Map<number, string>([
    [CELL_EMPTY, '#ffffff'],
    [CELL_OUT_OF_BOUNDS, '#000000'],
    [1, '#ff6b6b'], // Room 1
    [2, '#4ecdc4'], // Room 2
    [3, '#45b7d1'], // Room 3
    [4, '#f7b731'], // Room 4
    [5, '#5f27cd'], // Room 5
  ]);

  // Draw grid
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cellValue = grid.get(x, y);
      const color = roomColors.get(cellValue) || '#cccccc';

      ctx.fillStyle = color;
      ctx.fillRect(
        x * args.cellSize,
        y * args.cellSize,
        args.cellSize,
        args.cellSize
      );

      // Draw grid lines
      if (args.showGrid) {
        ctx.strokeStyle = '#eeeeee';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(
          x * args.cellSize,
          y * args.cellSize,
          args.cellSize,
          args.cellSize
        );
      }
    }
  }

  // Draw room labels
  ctx.fillStyle = '#000000';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  placedRooms.forEach((room) => {
    const centerX = (room.x + room.width / 2) * args.cellSize;
    const centerY = (room.y + room.height / 2) * args.cellSize;
    ctx.fillText(room.id, centerX, centerY);
  });

  // Add info text
  const info = document.createElement('div');
  info.style.marginTop = '10px';
  info.style.fontFamily = 'monospace';
  info.innerHTML = `
    <strong>Discrete Solver Result</strong><br>
    Grid: ${grid.width} × ${grid.height}<br>
    Placed: ${placedRooms.size}/${rooms.length} rooms<br>
    Resolution: ${args.gridResolution}m/cell<br>
    Iterations: ${args.maxIterations}<br>
    Mutation Rate: ${(args.mutationRate * 100).toFixed(0)}%
  `;

  container.appendChild(canvas);
  container.appendChild(info);

  return container;
};

const meta: Meta<DiscreteRendererArgs> = {
  title: 'Solvers/Discrete Renderer',
  tags: ['autodocs'],
  render: createRenderer,
  argTypes: {
    gridResolution: {
      control: { type: 'range', min: 0.5, max: 2.0, step: 0.1 },
      description: 'Grid resolution in meters per cell',
    },
    mutationRate: {
      control: { type: 'range', min: 0.1, max: 0.9, step: 0.1 },
      description: 'Mutation rate for evolutionary algorithm',
    },
    maxIterations: {
      control: { type: 'range', min: 10, max: 500, step: 10 },
      description: 'Maximum number of iterations',
    },
    cellSize: {
      control: { type: 'range', min: 5, max: 30, step: 1 },
      description: 'Visual size of each grid cell in pixels',
    },
    showGrid: {
      control: { type: 'boolean' },
      description: 'Show grid lines',
    },
  },
};

export default meta;
type Story = StoryObj<DiscreteRendererArgs>;

export const Default: Story = {
  args: {
    gridResolution: 1.0,
    mutationRate: 0.3,
    maxIterations: 100,
    cellSize: 12,
    showGrid: true,
  },
};

export const HighResolution: Story = {
  args: {
    gridResolution: 0.5,
    mutationRate: 0.3,
    maxIterations: 100,
    cellSize: 8,
    showGrid: false,
  },
};

export const LowMutation: Story = {
  args: {
    gridResolution: 1.0,
    mutationRate: 0.1,
    maxIterations: 200,
    cellSize: 12,
    showGrid: true,
  },
};

export const HighMutation: Story = {
  args: {
    gridResolution: 1.0,
    mutationRate: 0.7,
    maxIterations: 200,
    cellSize: 12,
    showGrid: true,
  },
};
