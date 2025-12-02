import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  /* eslint-disable-line */
  
  // Lambda 최적화: 압축 및 성능 최적화
  compress: true, // gzip 압축 활성화
  
  // ESLint 빌드 시 오류 무시 (개발 중에는 경고로 표시)
  eslint: {
    ignoreDuringBuilds: false, // 빌드 시 ESLint 검사 수행
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
