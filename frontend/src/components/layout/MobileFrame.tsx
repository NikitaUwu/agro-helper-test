import React from 'react';

interface MobileFrameProps {
  children: React.ReactNode;
}

/**
 * MobileFrame:
 * - On desktop screens (>=640px/768px): Centered container with max-w-md (448px),
 *   subtle borders, deep shadow, mimicking a native mobile smartphone application.
 * - On mobile screens (<640px): Occupies 100% full width and 100dvh dynamic height,
 *   flush against edges for an uncompromising native app experience.
 */
export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  return (
    <div className="w-full sm:max-w-md min-h-screen min-h-[100dvh] bg-white sm:shadow-2xl sm:border-x sm:border-slate-200/90 flex flex-col relative overflow-hidden">
      {/* Decorative top speaker bezel indicator for desktop simulation */}
      <div className="hidden sm:flex justify-center items-center pt-2 pb-1 bg-white border-b border-slate-100 select-none">
        <div className="w-16 h-1 bg-slate-300 rounded-full" aria-hidden="true" />
      </div>

      {/* Main app viewport */}
      <div className="flex-1 flex flex-col w-full h-full relative">
        {children}
      </div>
    </div>
  );
};
