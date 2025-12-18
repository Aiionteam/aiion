"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { preprocessTitanicData, PreprocessResponse } from "@/lib/api/titanic";

export default function TitanicTestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreprocessResponse | null>(null);

  const handlePreprocess = async () => {
    try {
      setLoading(true);
      setError(null);
      setResult(null);
      
      const response = await preprocessTitanicData();
      setResult(response);
    } catch (err: any) {
      console.error("전처리 실행 실패:", err);
      setError(err.message || "전처리 실행 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
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
            <h1 className="text-xl font-semibold text-gray-900">타이타닉 테스트 페이지</h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        <div className="space-y-6">
          {/* 전처리 버튼 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">데이터 전처리</h2>
            <button
              onClick={handlePreprocess}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  전처리 실행 중...
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5l7 7-7 7" />
                  </svg>
                  전처리 실행
                </>
              )}
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-500 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold text-red-800 mb-1">오류 발생</h3>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* 결과 표시 */}
          {result && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">전처리 결과</h2>
              
              {/* 메시지 */}
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-medium text-green-800">{result.message}</p>
              </div>

              {/* Train 데이터 */}
              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-3">Train 데이터</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">타입:</span>{" "}
                    <span className="text-gray-600">{result.data.train.type}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">컬럼 수:</span>{" "}
                    <span className="text-gray-600">{result.data.train.columns.length}개</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">컬럼 목록:</span>{" "}
                    <span className="text-gray-600">{result.data.train.columns.join(", ")}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Null 값 개수:</span>{" "}
                    <span className="text-gray-600">{result.data.train.null_count}개</span>
                  </div>
                  {result.data.train.head && result.data.train.head.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-700 text-sm">샘플 데이터 (첫 번째 행):</span>
                      <div className="mt-2 bg-white rounded p-3 overflow-x-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(result.data.train.head[0], null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test 데이터 */}
              <div>
                <h3 className="text-md font-semibold text-gray-800 mb-3">Test 데이터</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">타입:</span>{" "}
                    <span className="text-gray-600">{result.data.test.type}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">컬럼 수:</span>{" "}
                    <span className="text-gray-600">{result.data.test.columns.length}개</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">컬럼 목록:</span>{" "}
                    <span className="text-gray-600">{result.data.test.columns.join(", ")}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Null 값 개수:</span>{" "}
                    <span className="text-gray-600">{result.data.test.null_count}개</span>
                  </div>
                  {result.data.test.head && result.data.test.head.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-700 text-sm">샘플 데이터 (첫 번째 행):</span>
                      <div className="mt-2 bg-white rounded p-3 overflow-x-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(result.data.test.head[0], null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

