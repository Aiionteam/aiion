"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface PortfolioFile {
  name: string;
  path: string;
  size?: number;
  lastModified?: string;
}

export default function PortfolioPage() {
  const router = useRouter();
  const [files, setFiles] = useState<PortfolioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 포트폴리오 파일 목록 가져오기
  useEffect(() => {
    fetchPortfolioFiles();
  }, []);

  const fetchPortfolioFiles = async () => {
    try {
      setLoading(true);
      setError(null);

      // FastAPI에서 파일 목록 조회
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const listUrl = `${apiBaseUrl}/api/files`;

      const response = await fetch(listUrl);
      const result = await response.json();

      if (response.ok) {
        setFiles(result.files || []);
      } else {
        setError(result.detail || "파일 목록을 불러올 수 없습니다.");
      }
    } catch (err: any) {
      console.error("포트폴리오 파일 목록 로드 오류:", err);
      setError(err.message || "FastAPI 서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 파일 삭제
  const handleDeleteFile = async (fileName: string) => {
    if (!confirm(`"${fileName}" 파일을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      // FastAPI로 삭제 요청
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const deleteUrl = `${apiBaseUrl}/api/files/${fileName}`;

      const response = await fetch(deleteUrl, {
        method: "DELETE",
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}`);
        fetchPortfolioFiles(); // 목록 새로고침
      } else {
        alert(`❌ 오류: ${result.detail || "파일 삭제에 실패했습니다."}`);
      }
    } catch (err: any) {
      console.error("파일 삭제 오류:", err);
      alert(`❌ 오류: ${err.message || "파일 삭제 중 오류가 발생했습니다."}`);
    }
  };

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = Math.round(bytes / Math.pow(k, i) * 100) / 100;
    return size + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50">
      {/* 헤더 */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <button
            onClick={() => router.push("/home")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">이전 페이지로</span>
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            포트폴리오
          </h1>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/yolo")}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
            >
              파일 업로드
            </button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="mt-4 text-gray-600">파일 목록을 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchPortfolioFiles}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              다시 시도
            </button>
          </div>
        ) : files.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">📁</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">포트폴리오가 비어있습니다</h2>
            <p className="text-gray-600 mb-6">파일을 업로드하여 포트폴리오를 채워보세요.</p>
            <button
              onClick={() => router.push("/yolo")}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg transition-colors shadow-lg"
            >
              파일 업로드하기
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">
                저장된 파일 ({files.length}개)
              </h2>
              <button
                onClick={fetchPortfolioFiles}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
              >
                새로고침
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file, index) => {
                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(file.name);
                const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
                const imagePath = `${apiBaseUrl}/api/files/${file.name}`;

                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow"
                  >
                    {/* 이미지 미리보기 */}
                    {isImage ? (
                      <div className="relative w-full h-48 bg-gray-100">
                        <Image
                          src={imagePath}
                          alt={file.name}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            // 이미지 로드 실패 시 대체 UI
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      </div>
                    ) : (
                      <div className="w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div className="text-6xl">📄</div>
                      </div>
                    )}

                    {/* 파일 정보 */}
                    <div className="p-4">
                      <h3 className="font-bold text-gray-800 truncate mb-2" title={file.name}>
                        {file.name}
                      </h3>
                      <div className="text-sm text-gray-500 space-y-1">
                        {file.size && <p>크기: {formatFileSize(file.size)}</p>}
                        {file.lastModified && <p>수정일: {file.lastModified}</p>}
                      </div>

                      {/* 삭제 버튼 */}
                      <button
                        onClick={() => handleDeleteFile(file.name)}
                        className="mt-4 w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

