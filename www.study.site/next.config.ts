import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Docker를 위한 standalone 출력 활성화
  output: "standalone",
  
  // 외부 이미지 호스트 설정 (FastAPI 서버)
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/api/files/**",
      },
    ],
  },
};

export default nextConfig;
