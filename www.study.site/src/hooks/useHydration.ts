/**
 * Hydration 처리 훅
 * 클라이언트 사이드 hydration 완료를 관리
 */

import { useEffect, useState } from "react";

export const useHydration = (): boolean => {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // 클라이언트에서만 실행 (hydration 후)
    setIsHydrated(true);
  }, []);

  return isHydrated;
};

