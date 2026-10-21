import React, { useEffect, useRef, useState, useCallback } from 'react';
import { PhysicsEngine, DragState } from './physics/PhysicsEngine.ts';
import { PhysicsStats, PresetType, ShapeType } from './physics/types.ts';
import { physicsAudio } from './physics/audio.ts';
import { TopHeader } from './components/TopHeader.tsx';
import { ToolbarDock } from './components/ToolbarDock.tsx';

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);

  const [stats, setStats] = useState<PhysicsStats>({
    bodyCount: 0,
    activeCount: 0,
    fps: 60,
    kineticEnergy: 0
  });

  const [isPaused, setIsPaused] = useState(false);
  const [gravityY, setGravityY] = useState(-9.82);
  const [restitution, setRestitution] = useState(0.55);
  const [friction, setFriction] = useState(0.35);
  const [timeScale, setTimeScale] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    hoveredBodyId: null,
    draggedBodyId: null
  });

  // Initialize Physics Engine once
  useEffect(() => {
    if (!mountRef.current) return;

    const engine = new PhysicsEngine(mountRef.current);
    engineRef.current = engine;

    engine.setStatsCallback(newStats => {
      setStats(newStats);
    });

    engine.setDragChangeCallback(newDragState => {
      setDragState(newDragState);
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Handlers
  const handleSpawnShape = useCallback((shape: ShapeType) => {
    engineRef.current?.spawnShape(shape);
  }, []);

  const handleSpawnCascade = useCallback(() => {
    if (!engineRef.current) return;
    const shapes: ShapeType[] = ['sphere', 'box', 'cylinder', 'sphere', 'box'];
    shapes.forEach((s, idx) => {
      setTimeout(() => {
        engineRef.current?.spawnShape(s);
      }, idx * 100);
    });
  }, []);

  const handleLoadPreset = useCallback((preset: PresetType) => {
    engineRef.current?.loadPreset(preset);
  }, []);

  const handleClearWorld = useCallback(() => {
    engineRef.current?.clearWorld();
  }, []);

  const handleApplyShockwave = useCallback(() => {
    engineRef.current?.applyShockwave();
  }, []);

  const handleTogglePause = useCallback(() => {
    if (!engineRef.current) return false;
    const paused = engineRef.current.togglePause();
    setIsPaused(paused);
    return paused;
  }, []);

  const handleStepFrame = useCallback(() => {
    engineRef.current?.stepSingleFrame();
  }, []);

  const handleGravityChange = useCallback((g: number) => {
    setGravityY(g);
    engineRef.current?.setGravity(g);
  }, []);

  const handleRestitutionChange = useCallback((r: number) => {
    setRestitution(r);
    engineRef.current?.setRestitution(r);
  }, []);

  const handleFrictionChange = useCallback((f: number) => {
    setFriction(f);
    engineRef.current?.setFriction(f);
  }, []);

  const handleTimeScaleChange = useCallback((scale: number) => {
    setTimeScale(scale);
    engineRef.current?.setTimeScale(scale);
  }, []);

  const handleToggleMute = useCallback(() => {
    const nextMuted = physicsAudio.toggleMute();
    setIsMuted(nextMuted);
  }, []);

  const handleResetCamera = useCallback(() => {
    engineRef.current?.resetCamera();
  }, []);

  const handleToggleDock = useCallback(() => {
    setIsDockCollapsed(prev => !prev);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === '1') {
        handleSpawnShape('sphere');
      } else if (e.key === '2') {
        handleSpawnShape('box');
      } else if (e.key === '3') {
        handleSpawnShape('cylinder');
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleApplyShockwave();
      } else if (e.key === 'p' || e.key === 'P') {
        handleTogglePause();
      } else if (e.key === 'c' || e.key === 'C') {
        handleClearWorld();
      } else if (e.key === 'h' || e.key === 'H') {
        handleToggleDock();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleSpawnShape,
    handleApplyShockwave,
    handleTogglePause,
    handleClearWorld,
    handleToggleDock
  ]);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        data-testid="physics-canvas"
        className="w-full h-full cursor-grab active:cursor-grabbing outline-none touch-none"
      />

      {/* Top Header & Metrics */}
      <TopHeader
        stats={stats}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        onResetCamera={handleResetCamera}
        onApplyShockwave={handleApplyShockwave}
      />

      {/* Dragging Feedback Badge */}
      {dragState.isDragging && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none bg-cyan-950/90 border border-cyan-500/60 text-cyan-200 px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg shadow-black/50 flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400" />
          <span>Dragging body — release to throw!</span>
        </div>
      )}

      {/* Ergonomic Collapsible Bottom Control Dock */}
      <ToolbarDock
        onSpawnShape={handleSpawnShape}
        onSpawnCascade={handleSpawnCascade}
        onLoadPreset={handleLoadPreset}
        onClearWorld={handleClearWorld}
        onApplyShockwave={handleApplyShockwave}
        onTogglePause={handleTogglePause}
        onStepFrame={handleStepFrame}
        isPaused={isPaused}
        gravityY={gravityY}
        onGravityChange={handleGravityChange}
        restitution={restitution}
        onRestitutionChange={handleRestitutionChange}
        friction={friction}
        onFrictionChange={handleFrictionChange}
        timeScale={timeScale}
        onTimeScaleChange={handleTimeScaleChange}
        isDockCollapsed={isDockCollapsed}
        onToggleDock={handleToggleDock}
      />
    </main>
  );
}
