import type { Meta, StoryObj } from '@storybook/html';

const createIntro = () => {
  const container = document.createElement('div');
  container.style.padding = '40px';
  container.style.fontFamily = 'sans-serif';
  container.style.maxWidth = '800px';

  container.innerHTML = `
    <h1>magnetizing-fpg-ts</h1>
    <p style="font-size: 18px; color: #666;">
      High-performance headless TypeScript library for procedural floor plan generation
      using a hybrid Discrete-Continuous Evolutionary Strategy.
    </p>

    <h2>Interactive Demos</h2>
    <p>This Storybook contains interactive visualizations of both solvers:</p>

    <h3>📐 Discrete Solver</h3>
    <p>
      Grid-based evolutionary placement algorithm that optimizes room positions on a discrete grid.
      Watch as rooms are placed, mutated, and optimized over iterations.
    </p>
    <ul>
      <li><strong>Grid Resolution:</strong> Adjust the size of grid cells</li>
      <li><strong>Mutation Rate:</strong> Control how many rooms are removed and replaced each iteration</li>
      <li><strong>Iterations:</strong> Set maximum optimization iterations</li>
      <li><strong>Visual Controls:</strong> Toggle grid lines, adjust cell size</li>
    </ul>

    <h3>⚛️ Spring Solver</h3>
    <p>
      Physics-based geometric refinement using forces and Symplectic Euler integration.
      Watch rooms move, resolve overlaps, and satisfy adjacency constraints in real-time.
    </p>
    <ul>
      <li><strong>Adjacency Force:</strong> Spring attraction between connected rooms</li>
      <li><strong>Repulsion Force:</strong> Push overlapping rooms apart</li>
      <li><strong>Boundary Force:</strong> Keep rooms inside the boundary</li>
      <li><strong>Aspect Ratio Force:</strong> Maintain room proportions</li>
      <li><strong>Friction:</strong> Damping coefficient</li>
      <li><strong>Interactive Controls:</strong> Step, play/pause, reset simulation</li>
    </ul>

    <h2>Features</h2>
    <ul>
      <li>✅ <strong>Zero Magic Numbers</strong> - All behavior controlled by explicit configuration</li>
      <li>✅ <strong>Strict TypeScript</strong> - No <code>any</code>, full type safety</li>
      <li>✅ <strong>Data-Oriented Design</strong> - Int32Array grids, static vector math</li>
      <li>✅ <strong>Deterministic</strong> - Seeded PRNG for reproducible results</li>
      <li>✅ <strong>Physics-Based</strong> - Spring solver with Symplectic Euler integration</li>
      <li>✅ <strong>Clipper Integration</strong> - Precise polygon operations</li>
    </ul>

    <h2>Quick Start</h2>
    <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px;"><code>yarn install
yarn build
yarn test
yarn storybook</code></pre>

    <h2>Documentation</h2>
    <ul>
      <li><a href="https://github.com/yourusername/magnetizing-fpg-ts" target="_blank">GitHub Repository</a></li>
      <li>See <code>docs/SPEC.md</code> for complete technical specification</li>
      <li>See <code>examples/basic-usage.ts</code> for usage examples</li>
    </ul>

    <h2>Algorithm Overview</h2>
    <p><strong>Phase 1: Discrete Solver</strong></p>
    <ol>
      <li>Initialize grid from boundary polygon</li>
      <li>Sort rooms by connectivity (most connected first)</li>
      <li>Greedy initial placement</li>
      <li>Evolutionary loop:
        <ul>
          <li>Mutate: Remove K random rooms</li>
          <li>Re-place removed rooms at best-scoring positions</li>
          <li>Evaluate global score</li>
          <li>Accept if improved, otherwise revert</li>
        </ul>
      </li>
    </ol>

    <p><strong>Phase 2: Spring Solver</strong></p>
    <ol>
      <li>Convert discrete grid rooms to continuous coordinates</li>
      <li>Physics simulation loop:
        <ul>
          <li>Calculate forces (adjacency, repulsion, boundary, aspect ratio)</li>
          <li>Update velocities with friction and clamping</li>
          <li>Update positions using Symplectic Euler</li>
          <li>Repeat until convergence</li>
        </ul>
      </li>
    </ol>

    <hr style="margin: 40px 0; border: none; border-top: 2px solid #eee;">

    <p style="color: #999; font-size: 14px;">
      <strong>Note:</strong> Use the sidebar to navigate between stories and experiment with different configurations!
    </p>
  `;

  return container;
};

const meta: Meta = {
  title: 'Introduction',
  render: createIntro,
};

export default meta;
type Story = StoryObj;

export const Welcome: Story = {};
