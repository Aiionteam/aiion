"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  name: string;
  size: number;
}

export default function YoloPage() {
  const router = useRouter();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // 파일 처리 함수
  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const validFiles = Array.from(files).filter((file) => {
      // 이미지 파일만 허용
      const isImage = file.type.startsWith("image/");
      // 10MB 이하만 허용
      const isValidSize = file.size <= 10 * 1024 * 1024;
      return isImage && isValidSize;
    });

    const newFiles: UploadedFile[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    }));

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  }, []);

  // 파일 크기 포맷팅 (Bytes, KB, MB, GB 지원)
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = Math.round(bytes / Math.pow(k, i) * 100) / 100;
    return size + " " + sizes[i];
  };

  // 날짜 포맷팅 (한국어 형식)
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const ampm = hours >= 12 ? "오후" : "오전";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    
    return `${year}. ${month}. ${day}. ${ampm} ${displayHours}:${minutes}:${seconds}`;
  };

  // 파일 정보를 alert로 표시하는 함수
  const showFileInfoAlert = useCallback((files: FileList) => {
    if (files.length === 0) return;

    let alertMessage = "📁 드롭된 파일 정보\n\n";
    alertMessage += `총 파일 개수: ${files.length}개\n\n`;

    Array.from(files).forEach((file, index) => {
      const lastModified = new Date(file.lastModified);
      
      alertMessage += `[파일 ${index + 1}]\n`;
      alertMessage += `이름: ${file.name}\n`;
      alertMessage += `크기: ${formatFileSize(file.size)}\n`;
      alertMessage += `타입: ${file.type || "알 수 없음"}\n`;
      alertMessage += `수정일: ${formatDate(lastModified)}\n`;
      
      if (index < files.length - 1) {
        alertMessage += "\n";
      }
    });

    alert(alertMessage);
  }, []);

  // 드래그 앤 드롭 핸들러
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      
      // 드롭된 파일 정보를 alert로 표시
      if (files.length > 0) {
        showFileInfoAlert(files);
      }
      
      // 이후 기존처럼 파일 처리 및 업로드
      processFiles(files);
    },
    [processFiles, showFileInfoAlert]
  );

  // 파일 선택 핸들러
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
    },
    [processFiles]
  );

  // 파일 삭제 핸들러
  const handleRemoveFile = useCallback((id: string) => {
    setUploadedFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  // 모든 파일 삭제
  const handleRemoveAll = useCallback(() => {
    uploadedFiles.forEach((file) => {
      URL.revokeObjectURL(file.preview);
    });
    setUploadedFiles([]);
  }, [uploadedFiles]);

  // 포트폴리오에 추가 (YOLO 분석)
  const handleAddToPortfolio = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      alert("업로드할 파일이 없습니다.");
      return;
    }

    try {
      // FormData 생성
      const formData = new FormData();
      uploadedFiles.forEach((uploadedFile) => {
        formData.append("files", uploadedFile.file);
      });

      // FastAPI 업로드 URL
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const uploadUrl = `${apiBaseUrl}/api/upload`;

      console.log(`[YOLO Upload] FastAPI로 업로드 중: ${uploadUrl}`);

      // FastAPI로 직접 전송
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        alert(`✅ ${result.message}\n저장 위치: ${result.upload_dir}\n\n업로드된 파일:\n${result.files.map((f: any) => `- ${f.saved_name}`).join('\n')}`);
        
        // 업로드된 파일 목록 초기화
        uploadedFiles.forEach((file) => {
          URL.revokeObjectURL(file.preview);
        });
        setUploadedFiles([]);
        
        // 성공 후 포트폴리오 페이지로 이동
        router.push("/portfolio");
      } else {
        alert(`❌ 오류: ${result.detail || "파일 업로드에 실패했습니다."}`);
      }
    } catch (error: any) {
      console.error("포트폴리오 추가 오류:", error);
      alert(`❌ 오류: ${error.message || "FastAPI 서버에 연결할 수 없습니다.\nFastAPI가 실행 중인지 확인하세요."}`);
    }
  }, [uploadedFiles, router]);

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
            포트폴리오 업로드
          </h1>
          <button
            onClick={() => router.push("/yolo-results")}
            className="flex items-center gap-2 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white font-medium rounded-lg transition-colors shadow-lg"
          >
            <span>📁</span>
            <span>저장된 파일 보기</span>
          </button>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 text-center">
          <p className="text-gray-600">
            드래그 앤 드롭으로 파일을 업로드하거나 클릭하여 파일을 선택하세요
          </p>
        </div>

        {/* 드래그 앤 드롭 영역 */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-4 border-dashed rounded-3xl p-12 text-center transition-all
            ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 bg-white hover:border-gray-400"
            }
          `}
        >
          {/* 폴더 아이콘 */}
          <div className="flex justify-center mb-6">
            <div className="text-8xl">📁</div>
          </div>

          {/* 안내 텍스트 */}
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            파일을 여기에 드래그하세요
          </h2>
          <p className="text-gray-500 mb-6">또는 클릭하여 파일을 선택하세요</p>

          {/* 파일 선택 버튼 */}
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-colors shadow-lg">
              파일 선택
            </div>
          </label>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 지원 형식 안내 */}
          <p className="mt-6 text-sm text-gray-500">
            지원 형식: JPG, PNG, GIF, WebP, PDF, TXT (최대 10MB)
          </p>
        </div>

        {/* 업로드된 파일 목록 */}
        {uploadedFiles.length > 0 && (
          <div className="mt-8">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                업로드된 파일 ({uploadedFiles.length})
              </h3>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {/* 이미지 미리보기 */}
                    <div className="relative w-16 h-16 flex-shrink-0 bg-white rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={file.preview}
                        alt={file.name}
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* 파일 정보 */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {file.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>

                    {/* 삭제 버튼 */}
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="flex-shrink-0 text-red-500 hover:text-red-700 transition-colors"
                      title="삭제"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={handleRemoveAll}
            className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
            disabled={uploadedFiles.length === 0}
          >
            모든 파일 삭제
          </button>
          <button
            onClick={handleAddToPortfolio}
            className={`
              px-8 py-3 font-bold rounded-lg transition-colors
              ${
                uploadedFiles.length > 0
                  ? "bg-green-500 hover:bg-green-600 text-white shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }
            `}
            disabled={uploadedFiles.length === 0}
          >
            포트폴리오에 추가 ({uploadedFiles.length})
          </button>
        </div>
      </main>
    </div>
  );
}
