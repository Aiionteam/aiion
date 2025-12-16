"use client";

import { useState } from "react";

interface RAGResponse {
  question: string;
  answer: string;
  retrieved_documents: Array<{
    content: string;
    metadata: Record<string, unknown>;
  }>;
  retrieved_count: number;
}

const SUGGESTED_PROMPTS = [
  "LangChain이 뭐야?",
  "RAG가 무엇인가요?",
  "pgvector의 역할은?",
  "OpenAI GPT 모델 설명",
  "벡터 데이터베이스란?",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<RAGResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      console.log("Sending request:", { question: query, k: 3 });

      const res = await fetch("http://localhost:8000/rag", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: query,
          k: 3,
        }),
      });

      console.log("Response status:", res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Unknown error" }));
        console.error("Error response:", errorData);
        throw new Error(`HTTP error! status: ${res.status} - ${errorData.detail || ""}`);
      }

      const data: RAGResponse = await res.json();
      console.log("Success response:", data);
      setResponse(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(errorMessage);
      console.error("Error details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setQuery(prompt);
  };

  return (
    <div className="flex min-h-screen flex-col bg-black font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-medium text-white">헬로! 😊</h2>
        </div>
        <button className="rounded-full bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 transition-colors">
          헬로
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Greeting Section - only show when no response */}
        {!response && !loading && (
          <div className="mb-12 text-center">
            <h1 className="mb-2 text-2xl font-medium text-white">
              반가워요. 무엇을 도와드릴까요?
            </h1>
            <div className="mt-2">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className="mx-auto text-gray-600"
              >
                <path
                  d="M4 8h16M4 16h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        )}

        {/* RAG Response Display */}
        {response && (
          <div className="mb-8 w-full max-w-3xl rounded-2xl bg-gray-900/50 border border-gray-700 p-6">
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-medium text-white">질문:</h3>
              <p className="text-gray-300">{response.question}</p>
            </div>
            <div className="mb-4">
              <h3 className="mb-2 text-lg font-medium text-white">답변:</h3>
              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                {response.answer}
              </p>
            </div>
            {response.retrieved_documents.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-400">
                  참고 문서 ({response.retrieved_count}개):
                </h3>
                <div className="space-y-2">
                  {response.retrieved_documents.map((doc, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-gray-800/50 p-3 text-sm text-gray-300"
                    >
                      {doc.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 w-full max-w-3xl rounded-2xl bg-red-900/20 border border-red-700 p-4">
            <p className="text-red-300">오류: {error}</p>
          </div>
        )}

        {/* Suggested Prompts */}
        {!response && !loading && (
          <div className="mb-8 w-full max-w-3xl">
            <p className="mb-3 text-center text-sm text-gray-400">
              추천 프롬프트:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedPrompt(prompt)}
                  className="rounded-full bg-gray-800 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Input Container - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-black px-6 py-6">
          <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl">
            <div className="relative w-full rounded-2xl bg-white/5 border border-white/10 p-4">
              {/* Placeholder Text */}
              <div className="mb-3">
                <span className="text-sm text-gray-400">무엇이든 물어보세요</span>
              </div>

              {/* Action Buttons */}
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/20"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-white/60"
                  >
                    <path
                      d="M8 2v12M2 8h12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  첨부
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/20"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-white/60"
                  >
                    <circle
                      cx="7"
                      cy="7"
                      r="3"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M10 10l-2-2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  검색
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/20"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-white/60"
                  >
                    <path
                      d="M2 4h12M2 8h12M2 12h8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  학습하기
                </button>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/20"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="text-white/60"
                  >
                    <rect
                      x="2"
                      y="2"
                      width="12"
                      height="12"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                  </svg>
                  이미지 그리기
                </button>
              </div>

              {/* Input Field */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="무엇이든 물어보세요"
                  disabled={loading}
                  className="flex-1 bg-transparent text-white placeholder:text-gray-500 focus:outline-none text-lg disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={loading || !query.trim()}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <svg
                      className="animate-spin h-5 w-5 text-white/60"
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
                  ) : (
                    <>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 20 20"
                        fill="none"
                        className="text-white/60"
                      >
                        <circle
                          cx="10"
                          cy="10"
                          r="7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M10 6v4l2 2"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span>음성</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
