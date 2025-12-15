/**
 * 립싱크 (Lip-sync) 유틸리티
 * TTS 음성과 아바타 비디오를 동기화
 */

export interface LipSyncOptions {
  videoElement: HTMLVideoElement;
  audioElement?: HTMLAudioElement;
  ttsDuration?: number; // TTS 재생 시간 (ms)
}

/**
 * 비디오 재생 속도를 TTS 음성에 맞춰 조정
 */
export const syncVideoWithAudio = (
  options: LipSyncOptions
): { cleanup: () => void } => {
  const { videoElement, audioElement, ttsDuration } = options;

  // 비디오 재생 속도 조정 (TTS 시간에 맞춤)
  if (ttsDuration && videoElement.duration) {
    const videoDuration = videoElement.duration * 1000; // ms로 변환
    const speedRatio = videoDuration / ttsDuration;
    
    // 비디오 재생 속도 조정 (0.5 ~ 2.0 범위)
    const playbackRate = Math.max(0.5, Math.min(2.0, speedRatio));
    videoElement.playbackRate = playbackRate;
  }

  // 오디오와 비디오 동기화
  if (audioElement) {
    const syncAudio = () => {
      if (audioElement.currentTime !== videoElement.currentTime) {
        videoElement.currentTime = audioElement.currentTime;
      }
    };

    const interval = setInterval(syncAudio, 100);

    return {
      cleanup: () => {
        clearInterval(interval);
        videoElement.playbackRate = 1.0; // 원래 속도로 복원
      },
    };
  }

  return {
    cleanup: () => {
      videoElement.playbackRate = 1.0;
    },
  };
};

/**
 * TTS 재생 시간 계산 (대략적)
 */
export const estimateTTSDuration = (text: string, wordsPerMinute: number = 150): number => {
  const words = text.split(/\s+/).length;
  const minutes = words / wordsPerMinute;
  return minutes * 60 * 1000; // ms로 반환
};

/**
 * 비디오를 TTS 재생 시간에 맞춰 반복 재생
 */
export const playVideoWithTTSTiming = (
  videoElement: HTMLVideoElement,
  ttsDuration: number
): Promise<void> => {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const videoDuration = videoElement.duration * 1000; // ms

    // 비디오 재생
    videoElement.play();

    const checkProgress = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed >= ttsDuration) {
        // TTS가 끝나면 비디오도 정지
        videoElement.pause();
        resolve();
      } else {
        // 비디오가 끝나면 다시 시작
        if (videoElement.ended) {
          videoElement.currentTime = 0;
          videoElement.play();
        }
        requestAnimationFrame(checkProgress);
      }
    };

    checkProgress();
  });
};

