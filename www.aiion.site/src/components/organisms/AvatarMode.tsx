import React, { memo } from 'react';

interface AvatarModeProps {
  isListening: boolean;
}

export const AvatarMode: React.FC<AvatarModeProps> = memo(({ isListening }) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-50 to-pink-100 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, rgba(59, 130, 246, 0.3) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }}
        ></div>
      </div>

      {/* 3D Robot Avatar */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Robot Head */}
        <div className="relative mb-4">
          {/* Yellow Beanie */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-32 h-20 bg-yellow-400 rounded-t-full border-4 border-yellow-500">
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
              <div
                className="w-2 h-2 bg-gray-800 rounded-full animate-spin"
                style={{ animationDuration: '2s' }}
              ></div>
            </div>
          </div>

          {/* Head */}
          <div className="w-40 h-40 bg-white rounded-full border-4 border-[#d4cdc0] shadow-2xl relative">
            {/* Ears */}
            <div className="absolute -left-8 top-8 w-16 h-16 bg-[#f5f1e8] rounded-full border-4 border-[#d4cdc0]"></div>
            <div className="absolute -right-8 top-8 w-16 h-16 bg-[#f5f1e8] rounded-full border-4 border-[#d4cdc0]"></div>

            {/* Face Screen */}
            <div className="absolute inset-4 bg-black rounded-full flex items-center justify-center">
              <div className="text-[#8B7355] text-4xl">{isListening ? '😊' : '😃'}</div>
            </div>
          </div>
        </div>

        {/* Robot Body */}
        <div className="relative">
          {/* Chest with A Logo */}
          <div className="w-48 h-32 bg-white rounded-2xl border-4 border-[#d4cdc0] shadow-xl flex items-center justify-center relative">
            <div className="text-6xl font-bold text-[#8B7355]">A</div>
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-32 h-32 border-4 border-[#8B7355] rounded-full animate-ping"></div>
              </div>
            )}
          </div>

          {/* Arms */}
          <div className="absolute -left-12 top-4 w-8 h-20 bg-white rounded-full border-2 border-[#d4cdc0]"></div>
          <div className="absolute -right-12 top-4 w-8 h-20 bg-white rounded-full border-2 border-[#d4cdc0]">
            {/* Cube in hand */}
            <div className="absolute -right-4 top-12 w-6 h-6 bg-[#8B7355] rounded shadow-lg animate-pulse"></div>
          </div>

          {/* Backpack */}
          <div className="absolute -right-16 top-8 w-12 h-16 bg-green-600 rounded-lg border-2 border-green-700">
            <div className="absolute inset-2 bg-green-500 rounded opacity-50"></div>
          </div>

          {/* Treads */}
          <div className="absolute -bottom-8 left-4 w-40 h-12 bg-gray-600 rounded-full border-2 border-gray-700 flex items-center">
            <div className="w-full h-2 bg-gray-500 rounded-full mx-2"></div>
          </div>
        </div>

        {/* Listening Indicator */}
        {isListening && (
          <div className="mt-8 text-center">
            <p className="text-[#8B7355] font-semibold text-lg animate-pulse">듣고 있습니다...</p>
          </div>
        )}
      </div>
    </div>
  );
});

