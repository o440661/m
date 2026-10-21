export type ShapeType = 'sphere' | 'box' | 'cylinder';

export type PresetType = 'tower' | 'pyramid' | 'dominoes' | 'bouncy_balls' | 'mixed_chaos';

export interface PhysicsConfig {
  gravityY: number; // e.g. -9.82 m/s^2 (range -25 to +5)
  restitution: number; // bounciness (0.0 to 0.95)
  friction: number; // friction coefficient (0.0 to 1.0)
  linearDamping: number; // air resistance (0.01 to 0.3)
}

export interface BodyMetadata {
  id: string;
  shape: ShapeType;
  color: string;
  size: { x: number; y: number; z: number; radius?: number };
  mass: number;
  initialY: number;
}

export interface PhysicsStats {
  bodyCount: number;
  activeCount: number;
  fps: number;
  kineticEnergy: number;
}
