import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* eslint-disable-line */
  
  // 워크스페이스 루트 명시 (lockfile 경고 해결)
  outputFileTracingRoot: path.join(__dirname),
  
  // Lambda 최적화: 압축 및 성능 최적화
  compress: true, // gzip 압축 활성화
  
  // ESLint 빌드 시 오류 무시 (Vercel 배포 시 호환성 문제 해결)
  eslint: {
    ignoreDuringBuilds: true, // 빌드 시 ESLint 검사 건너뛰기 (Vercel 호환성)
  },
  
  // TypeScript 빌드 시 오류 무시하지 않음
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // JSON 응답 최적화
  experimental: {
    // 서버 컴포넌트 최적화
    optimizePackageImports: ['@/lib'],
  },
  
  // 헤더 최적화
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/json; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
