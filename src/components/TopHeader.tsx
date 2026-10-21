import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Camera,
  Keyboard,
  X,
  Activity,
  Layers,
  HelpCircle,
  Flame
} from 'lucide-react';
import { PhysicsStats } from '../physics/types.ts';

interface TopHeaderProps {
  stats: PhysicsStats;
  isMuted: boolean;
  onToggleMute: () => void;
  onResetCamera: () => void;
  onApplyShockwave: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  stats,
  isMuted,
  onToggleMute,
  onResetCamera,
  onApplyShockwave
}) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <>
      <header className="fixed top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left Title & Live Stats Badge */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl px-3.5 py-2 shadow-xl shadow-black/60 backdrop-blur-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-cyan-400 shrink-0" />
            <h1 className="text-xs sm:text-sm font-bold text-white tracking-tight whitespace-nowrap">Physics Playground</h1>
          </div>

          <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

          {/* Live Physics Metrics */}
          <div className="flex items-center gap-2.5 text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-1" title="Total Bodies">
              <Layers size={13} className="text-cyan-400" />
              <span>{stats.bodyCount}</span>
            </span>

            <span className="flex items-center gap-1 hidden md:flex" title="Active Dynamic Bodies">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{stats.activeCount} active</span>
            </span>

            <span className="flex items-center gap-1 hidden sm:flex text-slate-400" title="Simulation Framerate">
              <span>{stats.fps} FPS</span>
            </span>
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-900/90 border border-slate-700/80 rounded-2xl p-1.5 shadow-xl shadow-black/60">
          <button
            onClick={onApplyShockwave}
            aria-label="Blast shockwave (Spacebar)"
            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Shockwave Blast (Space)"
          >
            <Flame size={16} />
          </button>

          <button
            onClick={onResetCamera}
            aria-label="Reset 3D camera view"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Reset Camera View"
          >
            <Camera size={16} />
          </button>

          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute collision sounds' : 'Mute collision sounds'}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>

          <button
            onClick={() => setShowHelp(true)}
            aria-label="Open interaction instructions and keyboard shortcuts"
            className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Help & Shortcuts"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </header>

      {/* Help & Shortcuts Modal */}
      {showHelp && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="help-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
        >
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Keyboard size={18} className="text-cyan-400" />
                <h2 id="help-title" className="text-base font-bold text-white">
                  Controls & Interactions
                </h2>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                aria-label="Close dialog"
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-semibold text-cyan-300">🖱️ 3D Mouse Gestures</div>
                <ul className="space-y-1 text-slate-300">
                  <li>• <strong className="text-white">Left-click & drag any body</strong> to pick up, swing, fling, or throw shapes!</li>
                  <li>• <strong className="text-white">Left-click & drag empty space</strong> to orbit & rotate camera.</li>
                  <li>• <strong className="text-white">Right-click & drag</strong> to pan the view.</li>
                  <li>• <strong className="text-white">Scroll wheel</strong> to zoom in and out.</li>
                </ul>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-semibold text-amber-300">⌨️ Keyboard Shortcuts</div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono">
                  <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded">
                    <span>Spawn Sphere</span>
                    <kbd className="bg-slate-800 px-1.5 rounded text-white font-bold">1</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded">
                    <span>Spawn Box</span>
                    <kbd className="bg-slate-800 px-1.5 rounded text-white font-bold">2</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded">
                    <span>Spawn Cylinder</span>
                    <kbd className="bg-slate-800 px-1.5 rounded text-white font-bold">3</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded">
                    <span>Shockwave</span>
                    <kbd className="bg-slate-800 px-1.5 rounded text-white font-bold">Space</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded">
                    <span>Pause / Resume</span>
                    <kbd className="bg-slate-800 px-1.5 rounded text-white font-bold">P</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded">
                    <span>Clear World</span>
                    <kbd className="bg-slate-800 px-1.5 rounded text-white font-bold">C</kbd>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900 px-2 py-1 rounded col-span-2">
                    <span>Toggle Bottom Dock</span>
                    <kbd className="bg-slate-800 px-1.5 rounded text-white font-bold">H</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowHelp(false)}
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
