import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateExplosionImpulse,
  computeContactProperties,
  generateJengaTower,
  generatePyramid,
  generateDominoRun,
  generateBouncyBalls,
  generateMixedChaos
} from './math.ts';

test('calculateExplosionImpulse: impulse is zero beyond explosion radius', () => {
  const origin = { x: 0, y: 0, z: 0 };
  const target = { x: 10, y: 0, z: 0 };
  const impulse = calculateExplosionImpulse(target, origin, 50, 5);

  assert.equal(impulse.x, 0);
  assert.equal(impulse.y, 0);
  assert.equal(impulse.z, 0);
});

test('calculateExplosionImpulse: scales with distance and adds upward bias', () => {
  const origin = { x: 0, y: 0, z: 0 };
  const target = { x: 2, y: 0, z: 0 };
  const impulse = calculateExplosionImpulse(target, origin, 100, 10);

  // Distance is 2, radius 10, falloff is 0.8 => magnitude around 80
  assert.ok(impulse.x > 0, 'Should push away in positive X');
  assert.ok(impulse.y > 0, 'Should have positive upward lift');
  assert.equal(impulse.z, 0);
});

test('computeContactProperties: clamps values within safe physical range', () => {
  const overElastic = computeContactProperties(1.5, -0.5);
  assert.equal(overElastic.restitution, 0.98);
  assert.equal(overElastic.friction, 0.0);

  const normal = computeContactProperties(0.7, 0.4);
  assert.equal(normal.restitution, 0.7);
  assert.equal(normal.friction, 0.4);
});

test('generateJengaTower: creates 3 blocks per layer with alternating orientation', () => {
  const layers = 6;
  const blocks = generateJengaTower(layers);
  assert.equal(blocks.length, layers * 3);

  // Check first layer (layer 0: even => along Z) and second layer (layer 1: odd => along X)
  assert.equal(blocks[0].size.z, 3.6);
  assert.equal(blocks[3].size.x, 3.6);
});

test('generatePyramid: generates triangle row counts', () => {
  const rows = 4;
  const blocks = generatePyramid(rows);
  // Row 0: 4, Row 1: 3, Row 2: 2, Row 3: 1 => Total 10
  assert.equal(blocks.length, 10);
  assert.ok(blocks.every(b => b.shape === 'box'));
});

test('generateDominoRun: generates specified dominoes with upright aspect ratio', () => {
  const dominoes = generateDominoRun(10);
  assert.equal(dominoes.length, 10);
  assert.ok(dominoes[0].size.y > dominoes[0].size.x);
});

test('generateBouncyBalls and MixedChaos generate valid configurations', () => {
  const balls = generateBouncyBalls(8);
  assert.equal(balls.length, 8);
  assert.ok(balls.every(b => b.shape === 'sphere'));

  const chaos = generateMixedChaos(15);
  assert.equal(chaos.length, 15);
});
