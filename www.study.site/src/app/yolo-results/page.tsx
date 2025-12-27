"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface ResultFile {
  name: string;
  size: number;
  created_at: number;
  path: string;
}

interface CategoryResults {
  files: ResultFile[];
  count: number;
  category: string;
}

const CATEGORIES = [
  { id: "detected", name: "Detection", icon: "🔍", color: "bg-blue-500" },
  { id: "class", name: "Classification", icon: "📊", color: "bg-yellow-500" },
  { id: "pose", name: "Pose", icon: "🧍", color: "bg-purple-500" },
  { id: "segment", name: "Segmentation", icon: "✂️", color: "bg-green-500" },
];

export default function YoloResultsPage() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("detected");
  const [results, setResults] = useState<CategoryResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    fetchResults(activeCategory);
  }, [activeCategory]);

  const fetchResults = async (category: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`[DEBUG] Fetching results for category: ${category}`);
      console.log(`[DEBUG] API URL: ${apiBaseUrl}/api/results/${category}`);

      const response = await fetch(`${apiBaseUrl}/api/results/${category}`);
      
      console.log(`[DEBUG] Response status: ${response.status}`);
      console.log(`[DEBUG] Response ok: ${response.ok}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DEBUG] Error response: ${errorText}`);
        try {
          const errorData = JSON.parse(errorText);
          setError(errorData.detail || `서버 오류 (${response.status})`);
        } catch {
          setError(`서버 오류 (${response.status}): ${errorText}`);
        }
        setResults(null);
        return;
      }

      const data = await response.json();
      console.log(`[DEBUG] Response data:`, data);
      
      setResults(data);
    } catch (err: any) {
      console.error("파일 목록 로드 오류:", err);
      setError(err.message || "FastAPI 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString("ko-KR");
  };

  const isImageFile = (filename: string): boolean => {
    const ext = filename.toLowerCase().split(".").pop();
    return ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext || "");
  };

  const getFileUrl = (file: ResultFile): string => {
    return `${apiBaseUrl}${file.path}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="뒤로가기"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">저장된 파일 보기</h1>
          </div>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors whitespace-nowrap ${
                  activeCategory === category.id
                    ? `${category.color} text-white`
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
                {results && activeCategory === category.id && (
                  <span className="text-xs opacity-75">({results.count})</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && results && (
          <>
            {results.count === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <div className="text-gray-400 text-4xl mb-4">
                  {CATEGORIES.find((c) => c.id === activeCategory)?.icon}
                </div>
                <p className="text-gray-500">저장된 파일이 없습니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.files.map((file) => (
                  <div
                    key={file.name}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {isImageFile(file.name) ? (
                      <div className="relative aspect-square bg-gray-100">
                        <Image
                          src={getFileUrl(file)}
                          alt={file.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📄</div>
                          <div className="text-xs text-gray-500 px-2 break-all">
                            {file.name}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 truncate mb-1">
                        {file.name}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.created_at)}</span>
                      </div>
                      <a
                        href={getFileUrl(file)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block w-full text-center text-xs py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        다운로드
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

