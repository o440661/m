import React, { useState } from 'react';
import {
  Boxes,
  Circle,
  Cylinder as CylinderIcon,
  Sparkles,
  Zap,
  RotateCcw,
  Trash2,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Layers,
  Sliders,
  Flame,
  StepForward
} from 'lucide-react';
import { PresetType, ShapeType } from '../physics/types.ts';

interface ToolbarDockProps {
  onSpawnShape: (shape: ShapeType) => void;
  onSpawnCascade: () => void;
  onLoadPreset: (preset: PresetType) => void;
  onClearWorld: () => void;
  onApplyShockwave: () => void;
  onTogglePause: () => boolean;
  onStepFrame: () => void;
  isPaused: boolean;
  gravityY: number;
  onGravityChange: (g: number) => void;
  restitution: number;
  onRestitutionChange: (r: number) => void;
  friction: number;
  onFrictionChange: (f: number) => void;
  timeScale: number;
  onTimeScaleChange: (scale: number) => void;
  isDockCollapsed: boolean;
  onToggleDock: () => void;
}

export const ToolbarDock: React.FC<ToolbarDockProps> = ({
  onSpawnShape,
  onSpawnCascade,
  onLoadPreset,
  onClearWorld,
  onApplyShockwave,
  onTogglePause,
  onStepFrame,
  isPaused,
  gravityY,
  onGravityChange,
  restitution,
  onRestitutionChange,
  friction,
  onFrictionChange,
  timeScale,
  onTimeScaleChange,
  isDockCollapsed,
  onToggleDock
}) => {
  const [activeTab, setActiveTab] = useState<'spawn' | 'physics' | 'presets'>('spawn');

  const gravityPresets = [
    { label: 'Zero-G', val: 0 },
    { label: 'Moon', val: -1.62 },
    { label: 'Earth', val: -9.82 },
    { label: 'Jupiter', val: -24.8 },
    { label: 'Anti-G', val: 5.0 }
  ];

  const restitutionPresets = [
    { label: 'Dead (0.05)', val: 0.05 },
    { label: 'Wood (0.4)', val: 0.4 },
    { label: 'Rubber (0.75)', val: 0.75 },
    { label: 'Super-Ball (0.94)', val: 0.94 }
  ];

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 ease-out flex flex-col items-center ${
        isDockCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
      }`}
      style={{ width: 'min(920px, 95vw)' }}
    >
      {/* Collapse / Expand Tab Button */}
      <button
        onClick={onToggleDock}
        aria-label={isDockCollapsed ? 'Expand physics control dock' : 'Collapse physics control dock'}
        className="px-4 py-1 mb-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-black/40 transition-colors cursor-pointer"
      >
        {isDockCollapsed ? (
          <>
            <ChevronUp size={14} className="text-cyan-400" />
            <span>Show Physics Dock (H)</span>
          </>
        ) : (
          <>
            <ChevronDown size={14} className="text-cyan-400" />
            <span>Hide Controls (H)</span>
          </>
        )}
      </button>

      {/* Main Dock Container */}
      <div className="w-full bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 p-3 sm:p-4 text-slate-200 max-h-[62vh] sm:max-h-none overflow-y-auto overscroll-contain">
        {/* Dock Navigation Tabs & Quick Status */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('spawn')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'spawn'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Boxes size={14} />
              <span>Spawn Tools</span>
            </button>
            <button
              onClick={() => setActiveTab('physics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'physics'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders size={14} />
              <span>Physics & Restitution</span>
            </button>
            <button
              onClick={() => setActiveTab('presets')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeTab === 'presets'
                  ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers size={14} />
              <span>Presets & Stacks</span>
            </button>
          </div>

          {/* Quick Simulation Actions */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onTogglePause}
              aria-label={isPaused ? 'Resume physics simulation' : 'Pause physics simulation'}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                isPaused
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isPaused ? <Play size={13} /> : <Pause size={13} />}
              <span>{isPaused ? 'Resume' : 'Pause'}</span>
            </button>

            {isPaused && (
              <button
                onClick={onStepFrame}
                aria-label="Advance simulation by 1 frame"
                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 cursor-pointer"
                title="Step 1 Frame"
              >
                <StepForward size={13} />
                <span className="hidden sm:inline">Step</span>
              </button>
            )}

            <button
              onClick={onApplyShockwave}
              aria-label="Trigger shockwave impulse blast"
              className="px-3 py-1.5 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-400 hover:to-amber-400 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-md shadow-rose-950/40 cursor-pointer"
              title="Spacebar shortcut"
            >
              <Flame size={14} />
              <span>Shockwave</span>
            </button>

            <button
              onClick={onClearWorld}
              aria-label="Clear all objects from the playground"
              className="px-2.5 py-1.5 bg-slate-800/90 hover:bg-red-950/60 hover:text-red-400 text-slate-400 hover:border-red-800 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="C key shortcut"
            >
              <Trash2 size={13} />
              <span className="hidden sm:inline">Clear</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Spawn Shapes */}
        {activeTab === 'spawn' && (
          <div className="pt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mr-1">
                Drop Shape:
              </span>

              <button
                onClick={() => onSpawnShape('sphere')}
                aria-label="Spawn a bouncing sphere"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-400 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-500/50" />
                <span>Sphere (1)</span>
              </button>

              <button
                onClick={() => onSpawnShape('box')}
                aria-label="Spawn a solid box"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-400 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="w-3.5 h-3.5 rounded-sm bg-amber-400 shadow-sm shadow-amber-500/50" />
                <span>Box (2)</span>
              </button>

              <button
                onClick={() => onSpawnShape('cylinder')}
                aria-label="Spawn a rolling cylinder"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-pink-400 text-white rounded-xl text-xs font-medium flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <div className="w-3.5 h-3.5 rounded-sm bg-pink-400 shadow-sm shadow-pink-500/50" />
                <span>Cylinder (3)</span>
              </button>

              <button
                onClick={onSpawnCascade}
                aria-label="Drop 5 mixed shapes in rapid cascade"
                className="px-3 py-2 bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/80 hover:border-cyan-400 text-cyan-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Sparkles size={14} className="text-cyan-400" />
                <span>Cascade Drop (x5)</span>
              </button>
            </div>

            <div className="text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
              <span>Click & drag any body to throw or topple!</span>
            </div>
          </div>
        )}

        {/* Tab 2: Physics & Restitution */}
        {activeTab === 'physics' && (
          <div className="pt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Gravity Slider & Presets */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Gravity</span>
                <span className="font-mono text-cyan-400 font-bold">{gravityY.toFixed(1)} m/s²</span>
              </div>
              <input
                type="range"
                min="-26"
                max="6"
                step="0.5"
                value={gravityY}
                onChange={e => onGravityChange(parseFloat(e.target.value))}
                aria-label="Adjust gravity force"
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex items-center gap-1 flex-wrap pt-1">
                {gravityPresets.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => onGravityChange(preset.val)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      Math.abs(gravityY - preset.val) < 0.3
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Restitution (Bounciness) Slider & Presets */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Restitution (Bounciness)</span>
                <span className="font-mono text-amber-400 font-bold">{(restitution * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.95"
                step="0.02"
                value={restitution}
                onChange={e => onRestitutionChange(parseFloat(e.target.value))}
                aria-label="Adjust restitution elasticity"
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex items-center gap-1 flex-wrap pt-1">
                {restitutionPresets.map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => onRestitutionChange(preset.val)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      Math.abs(restitution - preset.val) < 0.05
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                        : 'bg-slate-800/80 text-slate-400 hover:text-white'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Friction & Simulation Speed */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">Surface Friction</span>
                <span className="font-mono text-emerald-400 font-bold">{friction.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={friction}
                onChange={e => onFrictionChange(parseFloat(e.target.value))}
                aria-label="Adjust surface friction"
                className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">Time Speed:</span>
                <div className="flex items-center gap-1">
                  {[0.3, 1.0, 2.0].map(scale => (
                    <button
                      key={scale}
                      onClick={() => onTimeScaleChange(scale)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        timeScale === scale
                          ? 'bg-purple-500/30 text-purple-300 border border-purple-500/60'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {scale === 0.3 ? 'Slow (0.3x)' : scale === 1.0 ? 'Normal (1x)' : 'Turbo (2x)'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Presets & Stacks */}
        {activeTab === 'presets' && (
          <div className="pt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400 mr-2">
              Load Preset Scene:
            </span>

            <button
              onClick={() => onLoadPreset('tower')}
              aria-label="Load Jenga Tower structure"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
              <span>Jenga Tower (24 blocks)</span>
            </button>

            <button
              onClick={() => onLoadPreset('dominoes')}
              aria-label="Load Domino Chain"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-2.5 h-2.5 rounded-sm bg-sky-400" />
              <span>Domino Run (14 chain)</span>
            </button>

            <button
              onClick={() => onLoadPreset('pyramid')}
              aria-label="Load Pyramid stack"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-2.5 h-2.5 rounded-sm bg-emerald-400" />
              <span>Pyramid (10 boxes)</span>
            </button>

            <button
              onClick={() => onLoadPreset('bouncy_balls')}
              aria-label="Load Bouncy Ball avalanche"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Ball Avalanche (18 spheres)</span>
            </button>

            <button
              onClick={() => onLoadPreset('mixed_chaos')}
              aria-label="Load Mixed Shapes Playground"
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-400 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <div className="w-2.5 h-2.5 rounded-sm bg-purple-400" />
              <span>Mixed Chaos (22 bodies)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
