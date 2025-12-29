"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { diffusionApiClient, type GenerateRequest, type Img2ImgRequest } from "@/lib/api/diffusionClient";

export default function GeneratePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"txt2img" | "img2img">("txt2img");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [samplingMethod, setSamplingMethod] = useState("Euler a");
  const [samplingSteps, setSamplingSteps] = useState(20);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [cfgScale, setCfgScale] = useState(7);
  const [seed, setSeed] = useState(-1);
  const [denoisingStrength, setDenoisingStrength] = useState(0.75); // img2img 전용
  const [inputImage, setInputImage] = useState<string | null>(null); // img2img 전용
  const [inputImageFile, setInputImageFile] = useState<File | null>(null); // img2img 전용
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0); // 진행도 (0-100)
  const [imageId, setImageId] = useState<string | null>(null); // 생성된 이미지 ID (파일명)
  const [selectedStyle, setSelectedStyle] = useState<string>("none"); // 선택된 스타일

  const samplingMethods = [
    "Euler a",
    "Euler",
    "LMS",
    "Heun",
    "DPM2",
    "DPM2 a",
    "DPM++ 2S a",
    "DPM++ 2M",
    "DPM++ SDE",
    "DPM fast",
    "DPM adaptive",
    "DDIM",
    "PLMS",
  ];

  // 스타일 정의
  const styles = [
    {
      id: "none",
      name: "없음",
      keywords: "",
    },
    {
      id: "anime",
      name: "Anime Style",
      keywords: "anime, cel shading, vibrant colors, big eyes",
    },
    {
      id: "realistic",
      name: "Realistic",
      keywords: "photorealistic, natural lighting, skin texture",
    },
    {
      id: "oil_painting",
      name: "Oil Painting",
      keywords: "oil painting, brush strokes, canvas texture",
    },
    {
      id: "cyberpunk",
      name: "Cyberpunk",
      keywords: "neon lights, futuristic city, dystopian vibe",
    },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드 가능합니다.");
        return;
      }
      setInputImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setInputImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("프롬프트를 입력해주세요.");
      return;
    }

    if (activeTab === "img2img" && !inputImage) {
      setError("이미지를 업로드해주세요.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setProgress(0);
    setImageId(null);

    try {
      // 선택된 스타일의 키워드를 프롬프트에 추가
      const selectedStyleObj = styles.find((s) => s.id === selectedStyle);
      const styleKeywords = selectedStyleObj?.keywords || "";
      const finalPrompt = styleKeywords
        ? `${prompt}, ${styleKeywords}`
        : prompt;

      if (activeTab === "txt2img") {
        // 텍스트 투 이미지 생성
        const request: GenerateRequest = {
          prompt: finalPrompt,
          negative_prompt: negativePrompt || null,
          width: width,
          height: height,
          steps: samplingSteps,
          guidance_scale: cfgScale,
          seed: seed === -1 ? null : seed,
        };

        // 진행도 시뮬레이션 (실제 API 호출 전)
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) return prev; // 90%에서 멈춤
            return prev + Math.random() * 5; // 랜덤 증가
          });
        }, 500);

        const response = await diffusionApiClient.generateImage(request);
        
        clearInterval(progressInterval);
        setProgress(100); // 완료
        
        // 생성된 이미지 URL 가져오기
        const imageUrl = diffusionApiClient.getImageUrl(response.image_url);
        setGeneratedImage(imageUrl);
        setImageId(response.id); // 이미지 ID 저장 (파일명)
        
        // 시드 저장 (재사용용)
        if (response.meta.seed !== null) {
          setSeed(response.meta.seed);
        }
      } else {
        // 이미지 투 이미지 생성
        if (!inputImageFile) {
          setError("이미지를 업로드해주세요.");
          return;
        }

        // 진행도 시뮬레이션
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) return prev;
            return prev + Math.random() * 5;
          });
        }, 500);

        const request: Img2ImgRequest = {
          prompt: finalPrompt,
          negative_prompt: negativePrompt || null,
          strength: denoisingStrength,
          width: width,
          height: height,
          steps: samplingSteps,
          guidance_scale: cfgScale,
          seed: seed === -1 ? null : seed,
          image: inputImageFile,
        };

        const response = await diffusionApiClient.generateImg2Img(request);
        
        clearInterval(progressInterval);
        setProgress(100);
        
        // 생성된 이미지 URL 가져오기
        const imageUrl = diffusionApiClient.getImageUrl(response.image_url);
        setGeneratedImage(imageUrl);
        setImageId(response.id);
        
        // 시드 저장 (재사용용)
        if (response.meta.seed !== null) {
          setSeed(response.meta.seed);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지 생성 중 오류가 발생했습니다.");
      setProgress(0);
    } finally {
      setIsGenerating(false);
      // 완료 후 잠시 100% 유지 후 초기화
      setTimeout(() => {
        if (!error) {
          setProgress(0);
        }
      }, 1000);
    }
  };

  const handleRandomSeed = () => {
    setSeed(-1);
  };

  const handleReuseSeed = () => {
    // 재사용 로직 (현재는 동일하게 유지)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← 뒤로가기
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              이미지 생성
            </h1>
            <div className="w-24"></div>
          </div>
          {/* 탭 메뉴 */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("txt2img")}
              className={`px-6 py-2 font-medium transition-colors ${
                activeTab === "txt2img"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              텍스트 투 이미지
            </button>
            <button
              onClick={() => setActiveTab("img2img")}
              className={`px-6 py-2 font-medium transition-colors ${
                activeTab === "img2img"
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              이미지 투 이미지
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 왼쪽 패널 - 입력 및 설정 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 모델 선택 (향후 구현) */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stable Diffusion 체크포인트
              </label>
              <div className="flex items-center gap-2">
                <select className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option>SDXL 모델 (로딩 중...)</option>
                </select>
                <button className="p-2 text-gray-500 hover:text-gray-700">
                  🔄
                </button>
              </div>
            </div>

            {/* img2img 전용: 이미지 업로드 */}
            {activeTab === "img2img" && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  입력 이미지
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  {inputImage ? (
                    <div className="space-y-4">
                      <div className="relative aspect-square max-w-md mx-auto">
                        <Image
                          src={inputImage}
                          alt="Input"
                          fill
                          className="object-contain rounded-lg"
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md cursor-pointer transition-colors">
                          이미지 변경
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => {
                            setInputImage(null);
                            setInputImageFile(null);
                          }}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
                        >
                          제거
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                      <div className="text-4xl mb-2">📷</div>
                      <p className="text-sm text-gray-600 mb-2">
                        이미지를 클릭하거나 드래그하여 업로드
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* 프롬프트 입력 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프롬프트 (Ctrl+Enter 또는 Alt+Enter로 생성)
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.altKey) && e.key === "Enter") {
                    handleGenerate();
                  }
                }}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="생성하고 싶은 이미지를 설명해주세요..."
              />
            </div>

            {/* 네거티브 프롬프트 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                네거티브 프롬프트 (Ctrl+Enter 또는 Alt+Enter로 생성)
              </label>
              <textarea
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.altKey) && e.key === "Enter") {
                    handleGenerate();
                  }
                }}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="제외하고 싶은 요소를 입력해주세요..."
              />
            </div>

            {/* 샘플링 설정 */}
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  샘플링 방법
                </label>
                <select
                  value={samplingMethod}
                  onChange={(e) => setSamplingMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled
                >
                  <option value="DPM++ 2M Karras">DPM++ 2M Karras (백엔드 고정)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  현재 백엔드에서 DPM++ 2M Karras를 사용합니다
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  샘플링 스텝: {samplingSteps}
                </label>
                <input
                  type="range"
                  min="1"
                  max="150"
                  value={samplingSteps}
                  onChange={(e) => setSamplingSteps(Number(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  min="1"
                  max="150"
                  value={samplingSteps}
                  onChange={(e) => setSamplingSteps(Number(e.target.value))}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  이미지 생성 반복 횟수. 높을수록 품질이 좋아지지만 시간이 오래 걸립니다 (권장: 20-30)
                </p>
              </div>
            </div>


            {/* 해상도 및 CFG Scale */}
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    너비: {width}
                  </label>
                  <input
                    type="range"
                    min="256"
                    max="1024"
                    step="64"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min="256"
                    max="1024"
                    step="64"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    8GB VRAM에서는 1024 이하 권장
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    높이: {height}
                  </label>
                  <input
                    type="range"
                    min="256"
                    max="1024"
                    step="64"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min="256"
                    max="1024"
                    step="64"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    8GB VRAM에서는 1024 이하 권장
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  창의성 (CFG Scale): {cfgScale}
                </label>
                <input
                  type="range"
                  min="1"
                  max="30"
                  step="0.5"
                  value={cfgScale}
                  onChange={(e) => setCfgScale(Number(e.target.value))}
                  className="w-full"
                />
                <input
                  type="number"
                  min="1"
                  max="30"
                  step="0.5"
                  value={cfgScale}
                  onChange={(e) => setCfgScale(Number(e.target.value))}
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  낮을수록 창의적이고 자유롭게, 높을수록 프롬프트를 정확히 따릅니다 (권장: 5-9)
                </p>
              </div>

              {/* img2img 전용: Denoising Strength */}
              {activeTab === "img2img" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    노이즈 제거 강도: {denoisingStrength.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={denoisingStrength}
                    onChange={(e) => setDenoisingStrength(Number(e.target.value))}
                    className="w-full"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={denoisingStrength}
                    onChange={(e) => setDenoisingStrength(Number(e.target.value))}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    0에 가까울수록 원본 이미지와 유사, 1에 가까울수록 프롬프트에 더 충실
                  </p>
                </div>
              )}
            </div>

            {/* 시드 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시드
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={seed === -1 ? "" : seed}
                  onChange={(e) =>
                    setSeed(e.target.value === "" ? -1 : Number(e.target.value))
                  }
                  placeholder="-1 (랜덤)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={handleRandomSeed}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  🎲 랜덤
                </button>
                <button
                  onClick={handleReuseSeed}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  ♻️ 재사용
                </button>
              </div>
            </div>
          </div>

          {/* 오른쪽 패널 - 생성 버튼 및 결과 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
                  isGenerating
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 shadow-lg hover:shadow-xl"
                }`}
              >
                {isGenerating ? "생성 중..." : "생성"}
              </button>
              
              {/* 진행도 표시 */}
              {isGenerating && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>진행 중...</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-pink-600 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 스타일 선택 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                스타일
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {styles.map((style) => (
                    <option key={style.id} value={style.id}>
                      {style.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => setSelectedStyle("none")}
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                  title="스타일 초기화"
                >
                  🔄
                </button>
              </div>
              {selectedStyle !== "none" && (
                <p className="mt-2 text-xs text-gray-500">
                  추가 키워드: {styles.find((s) => s.id === selectedStyle)?.keywords}
                </p>
              )}
            </div>

            {/* 이미지 출력 영역 */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden relative">
                {isGenerating ? (
                  <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2 animate-spin">⏳</div>
                    <p className="text-sm">이미지 생성 중...</p>
                    <p className="text-xs text-gray-400 mt-1">잠시만 기다려주세요</p>
                  </div>
                ) : generatedImage ? (
                  <Image
                    src={generatedImage}
                    alt="Generated"
                    fill
                    className="object-contain"
                    unoptimized // 외부 이미지는 최적화 비활성화
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <div className="text-4xl mb-2">🖼️</div>
                    <p className="text-sm">생성된 이미지가 여기에 표시됩니다</p>
                  </div>
                )}
              </div>

              {/* 액션 버튼들 */}
              {generatedImage && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      // 이미지를 새 탭에서 열기 (저장 위치: outputs/images/)
                      window.open(generatedImage, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm text-center"
                    title="이미지를 새 탭에서 열기 (저장 위치: cv.aiion.site/app/diffusers/outputs/images/)"
                  >
                    📁 열기
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        // 이미지 다운로드 (로컬에 저장)
                        const response = await fetch(generatedImage);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        // 이미지 ID를 파일명으로 사용
                        const filename = imageId ? `${imageId}.png` : `generated-${Date.now()}.png`;
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        setError("이미지 다운로드 중 오류가 발생했습니다.");
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm"
                    title="이미지를 다운로드 폴더에 저장"
                  >
                    💾 저장
                  </button>
                  <button
                    onClick={() => {
                      setGeneratedImage(null);
                      setError(null);
                      setProgress(0);
                      setImageId(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors text-sm"
                  >
                    🔄 새로 생성
                  </button>
                </div>
              )}
            </div>

            {/* 오류 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

