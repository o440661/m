/**
 * Pure math and configuration calculations for the 3D physics playground.
 * Fully decoupled from Three.js and Cannon-es DOM/WebGL instances for direct unit testing.
 */

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculates radial impulse vector from an explosion/shockwave origin point.
 * Follows inverse-linear or inverse-square falloff within radius.
 */
export function calculateExplosionImpulse(
  targetPos: Vec3Like,
  originPos: Vec3Like,
  maxStrength: number,
  radius: number
): Vec3Like {
  const dx = targetPos.x - originPos.x;
  const dy = targetPos.y - originPos.y;
  const dz = targetPos.z - originPos.z;
  const distanceSq = dx * dx + dy * dy + dz * dz;

  if (distanceSq >= radius * radius || distanceSq < 0.0001) {
    return { x: 0, y: 0, z: 0 };
  }

  const distance = Math.sqrt(distanceSq);
  // Normalize direction, add a slight upward lift so stacked bodies pop upward
  const nx = dx / distance;
  const ny = Math.max((dy / distance) + 0.35, 0.2); // upward bias
  const nz = dz / distance;

  // Falloff factor from 1.0 (at center) to 0.0 (at radius boundary)
  const falloff = 1.0 - (distance / radius);
  const strength = maxStrength * falloff;

  return {
    x: nx * strength,
    y: ny * strength,
    z: nz * strength
  };
}

/**
 * Computes safe material contact physics parameters.
 * Clamps restitution between 0.0 (completely inelastic) and 0.98 (near-elastic).
 */
export function computeContactProperties(restitution: number, friction: number) {
  const safeRestitution = Math.max(0.0, Math.min(0.98, restitution));
  const safeFriction = Math.max(0.0, Math.min(1.5, friction));

  // High restitution benefits from slightly higher contact equation stiffness
  const contactEquationStiffness = safeRestitution > 0.8 ? 1e8 : 1e7;
  const contactEquationRelaxation = safeRestitution > 0.8 ? 2 : 3;

  return {
    restitution: safeRestitution,
    friction: safeFriction,
    contactEquationStiffness,
    contactEquationRelaxation
  };
}

export interface PresetBlockConfig {
  shape: 'sphere' | 'box' | 'cylinder';
  position: Vec3Like;
  size: { x: number; y: number; z: number; radius?: number };
  color: string;
  rotation?: Vec3Like;
}

/**
 * Generates blocks for a classic Jenga-style interlocking tower.
 */
export function generateJengaTower(layers = 8): PresetBlockConfig[] {
  const blocks: PresetBlockConfig[] = [];
  const blockLength = 3.6;
  const blockWidth = 1.1;
  const blockHeight = 0.7;
  const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  for (let layer = 0; layer < layers; layer++) {
    const y = (layer + 0.5) * blockHeight;
    const isOdd = layer % 2 === 1;
    const color = colors[layer % colors.length];

    for (let i = -1; i <= 1; i++) {
      const offset = i * (blockWidth + 0.1);
      if (isOdd) {
        // Aligned along X axis
        blocks.push({
          shape: 'box',
          position: { x: 0, y, z: offset },
          size: { x: blockLength, y: blockHeight, z: blockWidth },
          color,
          rotation: { x: 0, y: 0, z: 0 }
        });
      } else {
        // Aligned along Z axis
        blocks.push({
          shape: 'box',
          position: { x: offset, y, z: 0 },
          size: { x: blockWidth, y: blockHeight, z: blockLength },
          color,
          rotation: { x: 0, y: 0, z: 0 }
        });
      }
    }
  }

  return blocks;
}

/**
 * Generates blocks for a pyramid structure.
 */
export function generatePyramid(rows = 5): PresetBlockConfig[] {
  const blocks: PresetBlockConfig[] = [];
  const boxSize = 1.0;
  const spacing = 1.05;
  const colors = ['#e11d48', '#d97706', '#059669', '#2563eb', '#7c3aed'];

  for (let row = 0; row < rows; row++) {
    const countInRow = rows - row;
    const y = (row + 0.5) * boxSize;
    const startX = -((countInRow - 1) * spacing) / 2;
    const color = colors[row % colors.length];

    for (let col = 0; col < countInRow; col++) {
      const x = startX + col * spacing;
      blocks.push({
        shape: 'box',
        position: { x, y, z: 0 },
        size: { x: boxSize, y: boxSize, z: boxSize },
        color
      });
    }
  }

  return blocks;
}

/**
 * Generates a row of upright dominoes that can be toppled.
 */
export function generateDominoRun(count = 14): PresetBlockConfig[] {
  const blocks: PresetBlockConfig[] = [];
  const w = 0.3;
  const h = 2.0;
  const d = 1.2;
  const spacing = 0.95;
  const startX = -((count - 1) * spacing) / 2;
  const palette = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185'];

  for (let i = 0; i < count; i++) {
    const x = startX + i * spacing;
    blocks.push({
      shape: 'box',
      position: { x, y: h / 2, z: 0 },
      size: { x: w, y: h, z: d },
      color: palette[i % palette.length]
    });
  }

  return blocks;
}

/**
 * Generates an array of bouncy spheres suspended to cascade down.
 */
export function generateBouncyBalls(count = 18): PresetBlockConfig[] {
  const blocks: PresetBlockConfig[] = [];
  const palette = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#eab308'];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const radius = 1.5 + (i % 3) * 1.2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const y = 3.0 + i * 0.7;
    const ballRadius = 0.55 + (i % 3) * 0.15;

    blocks.push({
      shape: 'sphere',
      position: { x, y, z },
      size: { x: ballRadius * 2, y: ballRadius * 2, z: ballRadius * 2, radius: ballRadius },
      color: palette[i % palette.length]
    });
  }

  return blocks;
}

/**
 * Generates a mixed chaos of spheres, boxes, and rolling cylinders.
 */
export function generateMixedChaos(count = 20): PresetBlockConfig[] {
  const blocks: PresetBlockConfig[] = [];
  const shapes: Array<'sphere' | 'box' | 'cylinder'> = ['sphere', 'box', 'cylinder'];
  const palette = ['#06b6d4', '#3b82f6', '#ec4899', '#f97316', '#10b981', '#a855f7'];

  for (let i = 0; i < count; i++) {
    const shape = shapes[i % shapes.length];
    const x = (Math.random() - 0.5) * 6;
    const z = (Math.random() - 0.5) * 6;
    const y = 2.5 + i * 0.8;
    const size = shape === 'cylinder'
      ? { x: 1.2, y: 1.6, z: 1.2, radius: 0.6 }
      : shape === 'sphere'
        ? { x: 1.2, y: 1.2, z: 1.2, radius: 0.6 }
        : { x: 1.1, y: 1.1, z: 1.1 };

    blocks.push({
      shape,
      position: { x, y, z },
      size,
      color: palette[i % palette.length],
      rotation: shape === 'cylinder' ? { x: Math.random() * 0.5, y: Math.random() * 3, z: Math.random() * 0.5 } : undefined
    });
  }

  return blocks;
}
