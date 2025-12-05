"use client";

import { useState, useEffect } from "react";
import { checkAllServices, type HealthCheckResult } from "@/lib/api/health";

export default function HealthCheckPage() {
  const [results, setResults] = useState<HealthCheckResult[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState<string>("");
  const [chatApiBaseUrl, setChatApiBaseUrl] = useState<string>("");

  useEffect(() => {
    // 환경변수 확인
    setApiBaseUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080");
    setChatApiBaseUrl(
      process.env.NEXT_PUBLIC_CHAT_API_URL || "http://localhost:8080"
    );

    // 페이지 로드 시 자동 체크
    handleCheck();
  }, []);

  const handleCheck = async () => {
    setIsChecking(true);
    try {
      const checkResults = await checkAllServices();
      setResults(checkResults);
    } catch (error) {
      console.error("Health check failed:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800 border-green-300";
      case "error":
        return "bg-red-100 text-red-800 border-red-300";
      case "checking":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return "✓";
      case "error":
        return "✗";
      case "checking":
        return "⟳";
      default:
        return "?";
    }
  };

  const allSuccess = results.every((r) => r.status === "success");
  const hasError = results.some((r) => r.status === "error");

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold mb-4">백엔드 연결 상태 확인</h1>
          
          <div className="mb-6 space-y-2">
            <div className="text-sm">
              <strong>API Gateway URL:</strong>{" "}
              <code className="bg-gray-100 px-2 py-1 rounded">{apiBaseUrl}</code>
            </div>
            <div className="text-sm">
              <strong>Chat API URL:</strong>{" "}
              <code className="bg-gray-100 px-2 py-1 rounded">
                {chatApiBaseUrl}
              </code>
            </div>
            <div className="text-sm">
              <strong>Frontend URL:</strong>{" "}
              <code className="bg-gray-100 px-2 py-1 rounded">
                {typeof window !== "undefined" ? window.location.origin : "N/A"}
              </code>
            </div>
          </div>

          <button
            onClick={handleCheck}
            disabled={isChecking}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isChecking ? "확인 중..." : "연결 상태 확인"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">서비스 상태</h2>
            
            <div className="mb-4 p-4 rounded-lg bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-semibold">전체 상태:</span>
                {allSuccess && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    모든 서비스 정상
                  </span>
                )}
                {hasError && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                    일부 서비스 오류
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${getStatusColor(
                    result.status
                  )}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold">
                        {getStatusIcon(result.status)}
                      </span>
                      <h3 className="font-semibold text-lg">{result.name}</h3>
                    </div>
                    {result.responseTime && (
                      <span className="text-sm opacity-70">
                        {result.responseTime}ms
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-1">{result.message}</p>
                  <div className="text-xs opacity-70 break-all mt-2">
                    <strong>URL:</strong> {result.url}
                  </div>
                  {result.error && (
                    <div className="text-xs text-red-600 mt-2">
                      <strong>오류:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {results.length === 0 && !isChecking && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-500">
            위의 버튼을 클릭하여 연결 상태를 확인하세요.
          </div>
        )}
      </div>
    </div>
  );
}

