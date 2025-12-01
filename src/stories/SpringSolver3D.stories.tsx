import React, { useRef, useState, useCallback } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Canvas } from '@react-three/fiber';
import { SceneContainer } from '../visualization/SceneContainer.js';
import { SpringSystem3D } from '../visualization/SpringSystem3D.js';
import { BoundaryEditor } from '../visualization/BoundaryEditor.js';
import { SpringSolver } from '../core/solvers/SpringSolver.js';
import { RoomState, Adjacency } from '../types.js';
import { Vec2 } from '../core/geometry/Vector2.js';

type TemplateType = 'small-apartment' | 'office-suite' | 'house' | 'gallery' | 'clinic' | 'restaurant' | 'palace';

interface SpringTemplate {
  boundary: Vec2[];
  rooms: RoomState[];
  adjacencies: Adjacency[];
}

interface SpringVisualizationArgs {
  template: TemplateType;
  populationSize: number;
  mutationRate: number;
  mutationStrength: number;
  crossoverRate: number;
  selectionPressure: number;
  fitnessBalance: number;
  aspectRatioMutationRate: number;
  boundaryScale: number;
  globalTargetRatio: number | undefined;
  autoPlay: boolean;
  showAdjacencies: boolean;
  showBoundary: boolean;
  editBoundary: boolean;
}

const springTemplates: Record<TemplateType, SpringTemplate> = {
  'small-apartment': {
    boundary: [
      { x: 50, y: 50 },
      { x: 550, y: 50 },
      { x: 550, y: 450 },
      { x: 50, y: 450 },
    ],
    rooms: [
      { id: 'living', x: 100, y: 100, width: 150, height: 120, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'kitchen', x: 300, y: 100, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'bedroom', x: 100, y: 280, width: 120, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bathroom', x: 350, y: 300, width: 80, height: 70, vx: 0, vy: 0, targetRatio: 1.0 },
    ],
    adjacencies: [
      { a: 'living', b: 'kitchen', weight: 2.0 },
      { a: 'kitchen', b: 'bathroom', weight: 1.5 },
      { a: 'bedroom', b: 'bathroom', weight: 1.0 },
    ],
  },
  'office-suite': {
    boundary: [
      { x: 50, y: 50 },
      { x: 650, y: 50 },
      { x: 650, y: 550 },
      { x: 50, y: 550 },
    ],
    rooms: [
      { id: 'reception', x: 100, y: 80, width: 180, height: 140, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'office-1', x: 350, y: 100, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'office-2', x: 500, y: 100, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'office-3', x: 350, y: 250, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'meeting', x: 100, y: 300, width: 200, height: 140, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'restroom', x: 500, y: 400, width: 100, height: 80, vx: 0, vy: 0, targetRatio: 1.2 },
    ],
    adjacencies: [
      { a: 'reception', b: 'office-1', weight: 1.5 },
      { a: 'reception', b: 'office-2', weight: 1.5 },
      { a: 'reception', b: 'office-3', weight: 1.5 },
      { a: 'reception', b: 'meeting', weight: 2.0 },
      { a: 'meeting', b: 'restroom', weight: 1.0 },
    ],
  },
  'house': {
    boundary: [
      { x: 30, y: 30 },
      { x: 730, y: 30 },
      { x: 730, y: 630 },
      { x: 30, y: 630 },
    ],
    rooms: [
      { id: 'entry', x: 80, y: 80, width: 100, height: 90, vx: 0, vy: 0, targetRatio: 5.0 },
      { id: 'living', x: 250, y: 100, width: 200, height: 150, vx: 0, vy: 0, targetRatio: 1.6 },
      { id: 'dining', x: 500, y: 100, width: 150, height: 120, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'kitchen', x: 500, y: 300, width: 150, height: 130, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-1', x: 100, y: 350, width: 140, height: 120, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bedroom-2', x: 300, y: 350, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'bath-1', x: 150, y: 500, width: 90, height: 80, vx: 0, vy: 0, targetRatio: 5 },
      { id: 'bath-2', x: 350, y: 500, width: 80, height: 70, vx: 0, vy: 0, targetRatio: 5 },
    ],
    adjacencies: [
      { a: 'entry', b: 'living', weight: 2.5 },
      { a: 'living', b: 'dining', weight: 2.0 },
      { a: 'dining', b: 'kitchen', weight: 2.5 },
      { a: 'entry', b: 'bedroom-1', weight: 1.0 },
      { a: 'entry', b: 'bedroom-2', weight: 1.0 },
      { a: 'bedroom-1', b: 'bath-1', weight: 2.0 },
      { a: 'bedroom-2', b: 'bath-2', weight: 2.0 },
    ],
  },
  'gallery': {
    boundary: [
      { x: 30, y: 50 },
      { x: 830, y: 50 },
      { x: 830, y: 450 },
      { x: 30, y: 450 },
    ],
    rooms: [
      { id: 'lobby', x: 100, y: 100, width: 200, height: 120, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'gallery-a', x: 350, y: 80, width: 180, height: 140, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'gallery-b', x: 550, y: 80, width: 180, height: 140, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'gallery-c', x: 450, y: 280, width: 170, height: 130, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'storage', x: 100, y: 300, width: 110, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
    ],
    adjacencies: [
      { a: 'lobby', b: 'gallery-a', weight: 2.0 },
      { a: 'lobby', b: 'gallery-b', weight: 2.0 },
      { a: 'lobby', b: 'gallery-c', weight: 2.0 },
      { a: 'gallery-a', b: 'gallery-b', weight: 1.5 },
      { a: 'gallery-b', b: 'gallery-c', weight: 1.5 },
      { a: 'lobby', b: 'storage', weight: 1.0 },
    ],
  },
  'clinic': {
    boundary: [
      { x: 50, y: 50 },
      { x: 600, y: 50 },
      { x: 600, y: 500 },
      { x: 50, y: 500 },
    ],
    rooms: [
      { id: 'waiting', x: 100, y: 80, width: 160, height: 120, vx: 0, vy: 0, targetRatio: 1.7 },
      { id: 'reception', x: 300, y: 80, width: 120, height: 90, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'exam-1', x: 450, y: 80, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'exam-2', x: 450, y: 220, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'exam-3', x: 450, y: 350, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'lab', x: 100, y: 280, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'staff', x: 280, y: 350, width: 100, height: 80, vx: 0, vy: 0, targetRatio: 1.2 },
    ],
    adjacencies: [
      { a: 'waiting', b: 'reception', weight: 2.5 },
      { a: 'reception', b: 'exam-1', weight: 1.5 },
      { a: 'reception', b: 'exam-2', weight: 1.5 },
      { a: 'reception', b: 'exam-3', weight: 1.5 },
      { a: 'reception', b: 'lab', weight: 2.0 },
      { a: 'reception', b: 'staff', weight: 1.0 },
      { a: 'lab', b: 'exam-1', weight: 1.0 },
    ],
  },
  'restaurant': {
    boundary: [
      { x: 30, y: 30 },
      { x: 680, y: 30 },
      { x: 680, y: 580 },
      { x: 30, y: 580 },
    ],
    rooms: [
      { id: 'entrance', x: 80, y: 80, width: 90, height: 80, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'dining-main', x: 250, y: 100, width: 220, height: 160, vx: 0, vy: 0, targetRatio: 1.7 },
      { id: 'dining-private', x: 500, y: 120, width: 140, height: 110, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'bar', x: 100, y: 300, width: 170, height: 100, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'kitchen', x: 350, y: 320, width: 180, height: 130, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'storage', x: 550, y: 350, width: 100, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'restrooms', x: 100, y: 450, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
    ],
    adjacencies: [
      { a: 'entrance', b: 'dining-main', weight: 2.5 },
      { a: 'entrance', b: 'bar', weight: 2.0 },
      { a: 'dining-main', b: 'dining-private', weight: 1.5 },
      { a: 'dining-main', b: 'kitchen', weight: 2.5 },
      { a: 'bar', b: 'kitchen', weight: 2.0 },
      { a: 'kitchen', b: 'storage', weight: 2.0 },
      { a: 'entrance', b: 'restrooms', weight: 1.5 },
    ],
  },
  'palace': {
    boundary: [
      { x: 50, y: 50 },
      { x: 1450, y: 50 },
      { x: 1450, y: 1050 },
      { x: 50, y: 1050 },
    ],
    rooms: [
      // Grand Public Spaces
      { id: 'grand-entrance', x: 700, y: 100, width: 180, height: 150, vx: 0, vy: 0, targetRatio: 1.6 },
      { id: 'main-throne', x: 700, y: 300, width: 220, height: 180, vx: 0, vy: 0, targetRatio: 1.8 },
      { id: 'lesser-throne', x: 950, y: 320, width: 160, height: 130, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'grand-ballroom', x: 500, y: 550, width: 280, height: 200, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'small-ballroom', x: 850, y: 600, width: 180, height: 130, vx: 0, vy: 0, targetRatio: 1.6 },

      // Royal Private Quarters
      { id: 'king-chamber', x: 200, y: 150, width: 160, height: 140, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'queen-chamber', x: 400, y: 150, width: 160, height: 140, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'prince-chamber-1', x: 200, y: 320, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'prince-chamber-2', x: 360, y: 320, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'princess-chamber', x: 280, y: 460, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },

      // Royal Studies & Libraries
      { id: 'royal-study', x: 100, y: 600, width: 140, height: 120, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'royal-library', x: 100, y: 760, width: 200, height: 160, vx: 0, vy: 0, targetRatio: 1.6 },
      { id: 'royal-archives', x: 330, y: 800, width: 140, height: 110, vx: 0, vy: 0, targetRatio: 1.4 },

      // Dining & Kitchen Areas
      { id: 'grand-dining', x: 950, y: 150, width: 220, height: 150, vx: 0, vy: 0, targetRatio: 1.7 },
      { id: 'formal-dining', x: 1200, y: 150, width: 160, height: 120, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'breakfast-room', x: 1100, y: 320, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'main-kitchen', x: 1250, y: 320, width: 170, height: 140, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'secondary-kitchen', x: 1250, y: 490, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'pantry', x: 1100, y: 450, width: 110, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'wine-cellar', x: 1240, y: 630, width: 130, height: 100, vx: 0, vy: 0, targetRatio: 1.4 },

      // Galleries & Art Spaces
      { id: 'great-gallery', x: 530, y: 800, width: 240, height: 160, vx: 0, vy: 0, targetRatio: 2.0 },
      { id: 'portrait-gallery', x: 810, y: 800, width: 200, height: 140, vx: 0, vy: 0, targetRatio: 1.7 },

      // Religious Spaces
      { id: 'chapel', x: 100, y: 150, width: 160, height: 140, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'prayer-room', x: 100, y: 320, width: 110, height: 100, vx: 0, vy: 0, targetRatio: 1.2 },

      // Administrative & Strategic
      { id: 'treasury', x: 100, y: 450, width: 130, height: 110, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'war-room', x: 520, y: 320, width: 150, height: 130, vx: 0, vy: 0, targetRatio: 1.4 },
      { id: 'council-chamber', x: 520, y: 150, width: 160, height: 130, vx: 0, vy: 0, targetRatio: 1.5 },

      // Guard Rooms & Security
      { id: 'guard-north', x: 700, y: 900, width: 110, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'guard-south', x: 700, y: 80, width: 110, height: 90, vx: 0, vy: 0, targetRatio: 1.2 },
      { id: 'guard-east', x: 1360, y: 500, width: 90, height: 110, vx: 0, vy: 0, targetRatio: 1.0 },
      { id: 'guard-west', x: 80, y: 500, width: 90, height: 110, vx: 0, vy: 0, targetRatio: 1.0 },
      { id: 'armory', x: 950, y: 480, width: 140, height: 110, vx: 0, vy: 0, targetRatio: 1.4 },

      // Guest & Servant Areas
      { id: 'guest-chamber-1', x: 1100, y: 600, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'guest-chamber-2', x: 1100, y: 730, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'guest-chamber-3', x: 1100, y: 860, width: 120, height: 100, vx: 0, vy: 0, targetRatio: 1.3 },
      { id: 'servant-hall', x: 1260, y: 760, width: 150, height: 110, vx: 0, vy: 0, targetRatio: 1.5 },
      { id: 'servant-quarters', x: 1260, y: 900, width: 140, height: 100, vx: 0, vy: 0, targetRatio: 1.4 },

      // Courtyards & Gardens
      { id: 'garden-court', x: 320, y: 600, width: 150, height: 150, vx: 0, vy: 0, targetRatio: 1.0 },
      { id: 'fountain-court', x: 1050, y: 100, width: 130, height: 130, vx: 0, vy: 0, targetRatio: 1.0 },
      { id: 'grand-terrace', x: 850, y: 100, width: 170, height: 130, vx: 0, vy: 0, targetRatio: 1.5 },
    ],
    adjacencies: [
      // Entrance connections
      { a: 'grand-entrance', b: 'main-throne', weight: 3.0 },
      { a: 'grand-entrance', b: 'council-chamber', weight: 2.0 },
      { a: 'grand-entrance', b: 'guard-south', weight: 2.5 },
      { a: 'grand-entrance', b: 'grand-terrace', weight: 2.0 },
      { a: 'grand-entrance', b: 'fountain-court', weight: 1.5 },

      // Throne room connections
      { a: 'main-throne', b: 'lesser-throne', weight: 2.5 },
      { a: 'main-throne', b: 'council-chamber', weight: 2.5 },
      { a: 'main-throne', b: 'war-room', weight: 2.0 },
      { a: 'main-throne', b: 'grand-ballroom', weight: 2.0 },

      // Ballroom connections
      { a: 'grand-ballroom', b: 'small-ballroom', weight: 2.0 },
      { a: 'grand-ballroom', b: 'great-gallery', weight: 2.5 },
      { a: 'small-ballroom', b: 'portrait-gallery', weight: 2.0 },

      // Royal quarters interconnections
      { a: 'king-chamber', b: 'queen-chamber', weight: 3.0 },
      { a: 'king-chamber', b: 'royal-study', weight: 2.5 },
      { a: 'king-chamber', b: 'chapel', weight: 2.0 },
      { a: 'queen-chamber', b: 'princess-chamber', weight: 2.0 },
      { a: 'prince-chamber-1', b: 'prince-chamber-2', weight: 2.0 },
      { a: 'prince-chamber-1', b: 'king-chamber', weight: 1.5 },

      // Study & library connections
      { a: 'royal-study', b: 'royal-library', weight: 2.5 },
      { a: 'royal-library', b: 'royal-archives', weight: 2.5 },
      { a: 'royal-study', b: 'war-room', weight: 1.5 },

      // Dining area connections
      { a: 'grand-dining', b: 'formal-dining', weight: 2.0 },
      { a: 'formal-dining', b: 'breakfast-room', weight: 2.0 },
      { a: 'breakfast-room', b: 'main-kitchen', weight: 2.5 },
      { a: 'main-kitchen', b: 'secondary-kitchen', weight: 2.5 },
      { a: 'main-kitchen', b: 'pantry', weight: 2.0 },
      { a: 'pantry', b: 'wine-cellar', weight: 2.0 },
      { a: 'grand-dining', b: 'main-throne', weight: 1.5 },

      // Gallery connections
      { a: 'great-gallery', b: 'portrait-gallery', weight: 2.5 },
      { a: 'portrait-gallery', b: 'guard-north', weight: 1.0 },

      // Religious connections
      { a: 'chapel', b: 'prayer-room', weight: 2.5 },
      { a: 'prayer-room', b: 'treasury', weight: 1.5 },

      // Administrative connections
      { a: 'council-chamber', b: 'war-room', weight: 2.5 },
      { a: 'war-room', b: 'armory', weight: 2.0 },
      { a: 'treasury', b: 'guard-west', weight: 2.0 },

      // Guard connections
      { a: 'guard-north', b: 'guard-south', weight: 1.0 },
      { a: 'guard-east', b: 'guard-west', weight: 1.0 },
      { a: 'armory', b: 'guard-east', weight: 2.0 },
      { a: 'armory', b: 'lesser-throne', weight: 1.5 },

      // Guest area connections
      { a: 'guest-chamber-1', b: 'guest-chamber-2', weight: 1.5 },
      { a: 'guest-chamber-2', b: 'guest-chamber-3', weight: 1.5 },
      { a: 'guest-chamber-1', b: 'small-ballroom', weight: 1.5 },

      // Servant area connections
      { a: 'servant-hall', b: 'servant-quarters', weight: 2.5 },
      { a: 'servant-hall', b: 'main-kitchen', weight: 2.0 },
      { a: 'servant-quarters', b: 'guest-chamber-3', weight: 1.5 },

      // Courtyard connections
      { a: 'garden-court', b: 'grand-ballroom', weight: 2.0 },
      { a: 'garden-court', b: 'princess-chamber', weight: 1.5 },
      { a: 'fountain-court', b: 'grand-dining', weight: 1.5 },
      { a: 'grand-terrace', b: 'lesser-throne', weight: 1.5 },
    ],
  },
};

// Spring Solver Story Component
const SpringSolverVisualization: React.FC<SpringVisualizationArgs> = (args) => {
  const [version, setVersion] = useState(0);
  const solverRef = useRef<SpringSolver | null>(null);
  const scaledBoundaryRef = useRef<Vec2[]>([]);
  const animationIdRef = useRef<number | null>(null);
  const templateRef = useRef<SpringTemplate | null>(null);
  const [editableBoundary, setEditableBoundary] = useState<Vec2[]>([]);
  const initialCameraTargetRef = useRef<[number, number, number]>([0, 0, 0]);

  // Helper: Calculate centroid of a polygon
  const calculateCentroid = useCallback((points: Vec2[]) => {
    let x = 0, y = 0;
    for (const p of points) {
      x += p.x;
      y += p.y;
    }
    return { x: x / points.length, y: y / points.length };
  }, []);

  // Initialize boundary when template or boundary scale changes
  React.useEffect(() => {
    const template = springTemplates[args.template];
    templateRef.current = template;
    const { boundary: templateBoundary } = template;

    // Apply boundary scaling towards centroid
    const centroid = calculateCentroid(templateBoundary);
    const boundary = templateBoundary.map(p => ({
      x: centroid.x + (p.x - centroid.x) * args.boundaryScale,
      y: centroid.y + (p.y - centroid.y) * args.boundaryScale
    }));

    scaledBoundaryRef.current = boundary;
    setEditableBoundary(boundary);

    // Set initial camera target (only when template/scale changes)
    const centerX = boundary.reduce((sum, p) => sum + p.x, 0) / boundary.length;
    const centerY = boundary.reduce((sum, p) => sum + p.y, 0) / boundary.length;
    initialCameraTargetRef.current = [centerX, centerY, 0];
  }, [args.template, args.boundaryScale, calculateCentroid]);

  // Recreate solver when solver parameters change
  React.useEffect(() => {
    const template = templateRef.current;
    if (!template) return;

    const { rooms, adjacencies } = template;
    const currentBoundary = scaledBoundaryRef.current;

    solverRef.current = new SpringSolver(rooms, currentBoundary, adjacencies, {
      populationSize: args.populationSize,
      maxGenerations: 1000,
      mutationRate: args.mutationRate,
      mutationStrength: args.mutationStrength,
      crossoverRate: args.crossoverRate,
      selectionPressure: args.selectionPressure,
      fitnessBalance: args.fitnessBalance,
      aspectRatioMutationRate: args.aspectRatioMutationRate,
    }, args.globalTargetRatio);

    setVersion((v) => v + 1);
  }, [args.populationSize, args.mutationRate, args.mutationStrength, args.crossoverRate, args.selectionPressure, args.fitnessBalance, args.aspectRatioMutationRate, args.globalTargetRatio]);

  // Handle boundary changes from editor
  const handleBoundaryChange = useCallback((newPoints: Vec2[]) => {
    setEditableBoundary(newPoints);
    scaledBoundaryRef.current = newPoints;

    const template = templateRef.current;
    if (!template) return;

    const { rooms, adjacencies } = template;

    // Recreate solver with new boundary
    solverRef.current = new SpringSolver(rooms, newPoints, adjacencies, {
      populationSize: args.populationSize,
      maxGenerations: 1000,
      mutationRate: args.mutationRate,
      mutationStrength: args.mutationStrength,
      crossoverRate: args.crossoverRate,
      selectionPressure: args.selectionPressure,
      fitnessBalance: args.fitnessBalance,
      aspectRatioMutationRate: args.aspectRatioMutationRate,
    }, args.globalTargetRatio);

    setVersion((v) => v + 1);
  }, [args.populationSize, args.mutationRate, args.mutationStrength, args.crossoverRate, args.selectionPressure, args.fitnessBalance, args.aspectRatioMutationRate, args.globalTargetRatio]);

  // Animation loop controlled by autoPlay prop
  React.useEffect(() => {
    // Cancel any existing animation
    if (animationIdRef.current !== null) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (args.autoPlay && solverRef.current) {
      const animate = () => {
        if (solverRef.current && !solverRef.current.hasConverged(0.01)) {
          solverRef.current.step();
          setVersion((v) => v + 1);
          animationIdRef.current = requestAnimationFrame(animate);
        }
      };
      animate();
    }

    return () => {
      if (animationIdRef.current !== null) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = null;
      }
    };
  }, [args.autoPlay, version]);

  const rooms = solverRef.current?.getState() || [];
  const adjacencies = springTemplates[args.template].adjacencies;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      <Canvas>
        <SceneContainer zoom={1} target={initialCameraTargetRef.current}>
          <SpringSystem3D
            rooms={rooms}
            adjacencies={adjacencies}
            boundary={scaledBoundaryRef.current}
            showAdjacencies={args.showAdjacencies}
            showBoundary={!args.editBoundary && args.showBoundary}
          />
          {args.editBoundary && (
            <BoundaryEditor
              points={editableBoundary}
              onChange={handleBoundaryChange}
              editable={true}
            />
          )}
        </SceneContainer>
      </Canvas>

      {/* Info Display */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          background: 'rgba(255, 255, 255, 0.9)',
          padding: '10px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '12px',
        }}
      >
        <strong>Spring Solver (R3F)</strong>
        <br />
        Generation: {solverRef.current?.getStats().generation || 0}
        <br />
        Best Fitness: {solverRef.current?.getStats().bestFitness.toFixed(4) || '0.0000'}
        <br />
        - FitnessG: {solverRef.current?.getStats().bestFitnessG.toFixed(2) || '0.00'}
        <br />
        - FitnessT: {solverRef.current?.getStats().bestFitnessT.toFixed(2) || '0.00'}
        <br />
        Population: {args.populationSize}
        <br />
        Converged: {solverRef.current?.hasConverged(0.01) ? 'Yes' : 'No'}
        <br />
        Auto-Play: {args.autoPlay ? 'On' : 'Off'}
        <br />
        <br />
        <em>Right-drag to pan, scroll to zoom</em>
      </div>
    </div>
  );
};

// Storybook Meta for Spring Solver
const meta: Meta<SpringVisualizationArgs> = {
  title: 'Spring Solver',
  component: SpringSolverVisualization,
  argTypes: {
    template: {
      control: { type: 'select' },
      options: ['small-apartment', 'office-suite', 'house', 'gallery', 'clinic', 'restaurant', 'palace'],
      description: 'Room configuration template',
    },
    populationSize: {
      control: { type: 'range', min: 5, max: 50, step: 5 },
      description: 'Number of candidate solutions (genes)',
    },
    mutationRate: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Probability of mutation per gene',
    },
    mutationStrength: {
      control: { type: 'range', min: 1, max: 50, step: 1 },
      description: 'Magnitude of position/dimension changes',
    },
    crossoverRate: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Rate of offspring generation',
    },
    selectionPressure: {
      control: { type: 'range', min: 0.1, max: 0.5, step: 0.05 },
      description: 'Percentage of population to cull',
    },
    fitnessBalance: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Balance: 0=Geometric only, 1=Topological only',
    },
    aspectRatioMutationRate: {
      control: { type: 'range', min: 0.0, max: 1.0, step: 0.05 },
      description: 'Probability of aspect ratio mutation (room shape exploration)',
    },
    boundaryScale: {
      control: { type: 'range', min: 0.1, max: 1.0, step: 0.05 },
      description: 'Scale boundary towards centroid',
    },
    globalTargetRatio: {
      control: { type: 'range', min: 1.0, max: 5.0, step: 0.1 },
      description: 'Global aspect ratio override for all rooms (undefined = use individual ratios)',
    },
    autoPlay: {
      control: { type: 'boolean' },
      description: 'Automatically run the solver animation',
    },
    showAdjacencies: {
      control: { type: 'boolean' },
      description: 'Show adjacency connections between rooms',
    },
    showBoundary: {
      control: { type: 'boolean' },
      description: 'Show boundary (red dashed line)',
    },
    editBoundary: {
      control: { type: 'boolean' },
      description: 'Enable interactive boundary editing (drag vertices, click midpoints to add)',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<SpringVisualizationArgs>;

export const Default: Story = {
  args: {
    template: 'house',
    populationSize: 50,
    mutationRate: 0.5,
    mutationStrength: 40,
    crossoverRate: 0.5,
    selectionPressure: 0.9,
    fitnessBalance: 0.6,
    aspectRatioMutationRate: 0.3,
    boundaryScale: 1.0,
    globalTargetRatio: 2,
    autoPlay: true,
    showAdjacencies: true,
    showBoundary: true,
    editBoundary: true,
  },
};
