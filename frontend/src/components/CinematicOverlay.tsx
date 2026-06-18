import React, { useState, useEffect } from 'react';

const CinematicOverlay: React.FC = () => {
  const [overlayState, setOverlayState] = useState<'hidden' | 'intro' | 'outro'>('hidden');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shift + I -> Intro (KeyI works regardless of keyboard language)
      if (e.shiftKey && e.code === 'KeyI') {
        setOverlayState('intro');
      }
      // Shift + O -> Outro
      if (e.shiftKey && e.code === 'KeyO') {
        setOverlayState('outro');
      }
      // Escape or Enter -> Dismiss
      if (e.key === 'Escape' || e.key === 'Enter') {
        setOverlayState('hidden');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center cinematic-overlay-bg transition-opacity duration-1000 ease-in-out ${
        overlayState === 'hidden' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="absolute inset-0 cinematic-grid" />
      <div className="absolute inset-0 cinematic-radar" />

      {overlayState === 'intro' && (
        <div className="relative z-10 flex flex-col items-center animate-cinematic-up">
          <h1 className="text-8xl md:text-[120px] font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-500 cinematic-title-glow mb-6">
            SADAR
          </h1>
          <p className="text-xl md:text-2xl text-cyan-400 font-light tracking-widest uppercase text-center max-w-3xl">
            AI-Powered Spectrum Anomaly Detection
            <br />
            <span className="text-sm md:text-lg text-emerald-400 mt-2 block">& Response Platform</span>
          </p>
          <div className="mt-16 w-64 h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent cinematic-line" />
          <p className="mt-4 text-xs tracking-widest text-gray-500 uppercase animate-pulse">
            System Initializing...
          </p>
        </div>
      )}

      {overlayState === 'outro' && (
        <div className="relative z-10 flex flex-col items-center animate-cinematic-up">
          <h2 className="text-5xl font-bold text-white tracking-wider mb-8 cinematic-title-glow">
            SADAR
          </h2>
          <p className="text-xl text-gray-400 tracking-widest uppercase font-light text-center max-w-2xl leading-relaxed">
            Transforming RF Spectrum Monitoring <br />
            <span className="text-cyan-400 font-medium">Into Actionable Intelligence</span>
          </p>
        </div>
      )}
    </div>
  );
};

export default CinematicOverlay;
