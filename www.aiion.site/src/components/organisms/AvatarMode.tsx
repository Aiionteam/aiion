import React, { memo, useRef, useEffect } from 'react';
import { syncVideoWithAudio, estimateTTSDuration, playVideoWithTTSTiming } from '../../lib/utils/lipsync';

interface AvatarModeProps {
  isListening: boolean;
  aiResponse?: string; // AI 응답이 있을 때 비디오 재생
  isSpeaking?: boolean; // TTS 재생 중인지 여부
}

export const AvatarMode: React.FC<AvatarModeProps> = memo(({ isListening, aiResponse, isSpeaking }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const syncCleanupRef = useRef<(() => void) | null>(null);

  // AI 응답이 있거나 리스닝 중일 때 비디오 재생
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isListening) {
      // 리스닝 중: 비디오 반복 재생
      video.loop = true;
      video.play().catch((error) => {
        console.error('비디오 재생 실패:', error);
      });
    } else if (aiResponse && isSpeaking) {
      // TTS 재생 중: 비디오를 TTS 시간에 맞춰 재생
      const ttsDuration = estimateTTSDuration(aiResponse);
      playVideoWithTTSTiming(video, ttsDuration).catch((error) => {
        console.error('비디오 동기화 실패:', error);
      });
    } else if (aiResponse) {
      // 응답이 있지만 TTS가 끝난 경우: 비디오 정지
      video.pause();
      video.currentTime = 0;
    }
  }, [isListening, aiResponse, isSpeaking]);

  // 정리 함수
  useEffect(() => {
    return () => {
      if (syncCleanupRef.current) {
        syncCleanupRef.current();
      }
    };
  }, []);

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

      {/* Kling Avatar Video */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-full max-w-2xl aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            src="/kling_20251207_Build_Avatar_The_charac_3925_0.mp4"
            className="w-full h-full object-contain rounded-lg shadow-2xl"
            loop
            muted={false}
            playsInline
            onEnded={() => {
              // 비디오가 끝나면 다시 재생 (리스닝 중이거나 응답이 있을 때)
              if (isListening || aiResponse) {
                const video = videoRef.current;
                if (video) {
                  video.currentTime = 0;
                  video.play().catch((error) => {
                    console.error('비디오 재생 실패:', error);
                  });
                }
              }
            }}
          />
          
          {/* Listening Indicator Overlay */}
          {isListening && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full">
              <p className="text-sm font-semibold animate-pulse">듣고 있습니다...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

