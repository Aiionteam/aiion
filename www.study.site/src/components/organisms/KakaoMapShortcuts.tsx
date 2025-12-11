"use client";

import React, { useState } from "react";
import { Button } from "@/components/atoms/Button";

interface ShortcutFormData {
  // 지도 바로가기
  mapLat?: string;
  mapLng?: string;
  mapName?: string;
  mapPlaceId?: string;
  
  // 길찾기
  fromName?: string;
  fromLat?: string;
  fromLng?: string;
  fromPlaceId?: string;
  toName?: string;
  toLat?: string;
  toLng?: string;
  toPlaceId?: string;
  viaName?: string;
  viaLat?: string;
  viaLng?: string;
  transportMode?: "car" | "traffic" | "walk" | "bicycle";
  
  // 지하철
  subwayRegion?: "seoul" | "busan" | "daegu" | "gwangju" | "daejeon";
  fromStation?: string;
  toStation?: string;
  
  // 로드뷰
  roadviewLat?: string;
  roadviewLng?: string;
  roadviewPlaceId?: string;
  
  // 검색
  searchKeyword?: string;
}

export const KakaoMapShortcuts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"map" | "route" | "roadview" | "search">("map");
  const [formData, setFormData] = useState<ShortcutFormData>({});
  const [generatedUrl, setGeneratedUrl] = useState<string>("");

  // 지도 바로가기 URL 생성
  const generateMapUrl = () => {
    let url = "https://map.kakao.com/link/map/";
    
    if (formData.mapPlaceId) {
      url += formData.mapPlaceId;
    } else if (formData.mapName && formData.mapLat && formData.mapLng) {
      url += `${formData.mapName},${formData.mapLat},${formData.mapLng}`;
    } else if (formData.mapLat && formData.mapLng) {
      url += `${formData.mapLat},${formData.mapLng}`;
    } else {
      alert("좌표 또는 장소ID를 입력해주세요.");
      return;
    }
    
    setGeneratedUrl(url);
    window.open(url, "_blank");
  };

  // 길찾기 URL 생성
  const generateRouteUrl = () => {
    let url = "https://map.kakao.com/link/";
    
    // 지하철 노선도 길찾기
    if (formData.transportMode === "traffic" && formData.subwayRegion && formData.fromStation && formData.toStation) {
      url += `by/subway/${formData.subwayRegion}/${formData.fromStation}/${formData.toStation}`;
      setGeneratedUrl(url);
      window.open(url, "_blank");
      return;
    }
    
    // 이동수단별 길찾기
    if (formData.transportMode) {
      url += `by/${formData.transportMode}/`;
    } else {
      url += "to/";
    }
    
    // 출발지 설정
    if (formData.fromName && formData.fromLat && formData.fromLng) {
      if (formData.transportMode) {
        url += `${formData.fromName},${formData.fromLat},${formData.fromLng}/`;
      } else {
        url += `from/${formData.fromName},${formData.fromLat},${formData.fromLng}/to/`;
      }
    } else if (formData.fromPlaceId) {
      if (formData.transportMode) {
        url += `${formData.fromPlaceId}/`;
      } else {
        url += `from/${formData.fromPlaceId}/to/`;
      }
    }
    
    // 경유지 설정
    if (formData.viaName && formData.viaLat && formData.viaLng) {
      url += `${formData.viaName},${formData.viaLat},${formData.viaLng}/`;
    }
    
    // 목적지 설정
    if (formData.toPlaceId) {
      url += formData.toPlaceId;
    } else if (formData.toName && formData.toLat && formData.toLng) {
      url += `${formData.toName},${formData.toLat},${formData.toLng}`;
    } else {
      alert("목적지를 입력해주세요.");
      return;
    }
    
    setGeneratedUrl(url);
    window.open(url, "_blank");
  };

  // 로드뷰 URL 생성
  const generateRoadviewUrl = () => {
    let url = "https://map.kakao.com/link/roadview/";
    
    if (formData.roadviewPlaceId) {
      url += formData.roadviewPlaceId;
    } else if (formData.roadviewLat && formData.roadviewLng) {
      url += `${formData.roadviewLat},${formData.roadviewLng}`;
    } else {
      alert("좌표 또는 장소ID를 입력해주세요.");
      return;
    }
    
    setGeneratedUrl(url);
    window.open(url, "_blank");
  };

  // 검색 URL 생성
  const generateSearchUrl = () => {
    if (!formData.searchKeyword) {
      alert("검색어를 입력해주세요.");
      return;
    }
    
    const url = `https://map.kakao.com/link/search/${encodeURIComponent(formData.searchKeyword)}`;
    setGeneratedUrl(url);
    window.open(url, "_blank");
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold mb-4">카카오 지도 바로가기</h2>
      
      {/* 탭 메뉴 */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("map")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "map"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          지도 바로가기
        </button>
        <button
          onClick={() => setActiveTab("route")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "route"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          길찾기
        </button>
        <button
          onClick={() => setActiveTab("roadview")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "roadview"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          로드뷰
        </button>
        <button
          onClick={() => setActiveTab("search")}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === "search"
              ? "border-b-2 border-blue-500 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          검색
        </button>
      </div>

      {/* 지도 바로가기 */}
      {activeTab === "map" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              장소ID (선택)
            </label>
            <input
              type="text"
              placeholder="18577297"
              value={formData.mapPlaceId || ""}
              onChange={(e) => setFormData({ ...formData, mapPlaceId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-500 mb-4">또는</div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              장소명 (선택)
            </label>
            <input
              type="text"
              placeholder="카카오판교아지트"
              value={formData.mapName || ""}
              onChange={(e) => setFormData({ ...formData, mapName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                위도 *
              </label>
              <input
                type="text"
                placeholder="37.3952969470752"
                value={formData.mapLat || ""}
                onChange={(e) => setFormData({ ...formData, mapLat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                경도 *
              </label>
              <input
                type="text"
                placeholder="127.110449292622"
                value={formData.mapLng || ""}
                onChange={(e) => setFormData({ ...formData, mapLng: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <Button onClick={generateMapUrl} variant="primary">
            지도 열기
          </Button>
        </div>
      )}

      {/* 길찾기 */}
      {activeTab === "route" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이동수단
            </label>
            <select
              value={formData.transportMode || ""}
              onChange={(e) => setFormData({ ...formData, transportMode: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">기본</option>
              <option value="car">자동차</option>
              <option value="traffic">대중교통</option>
              <option value="walk">도보</option>
              <option value="bicycle">자전거</option>
            </select>
          </div>

          {/* 지하철 노선도 길찾기 */}
          {formData.transportMode === "traffic" && (
            <div className="bg-blue-50 p-4 rounded-lg space-y-4">
              <h3 className="font-semibold text-blue-900">지하철 노선도 길찾기</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  지역
                </label>
                <select
                  value={formData.subwayRegion || ""}
                  onChange={(e) => setFormData({ ...formData, subwayRegion: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">선택</option>
                  <option value="seoul">서울</option>
                  <option value="busan">부산</option>
                  <option value="daegu">대구</option>
                  <option value="gwangju">광주</option>
                  <option value="daejeon">대전</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    출발역
                  </label>
                  <input
                    type="text"
                    placeholder="판교역"
                    value={formData.fromStation || ""}
                    onChange={(e) => setFormData({ ...formData, fromStation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    도착역
                  </label>
                  <input
                    type="text"
                    placeholder="강남역"
                    value={formData.toStation || ""}
                    onChange={(e) => setFormData({ ...formData, toStation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 일반 길찾기 */}
          {formData.transportMode !== "traffic" && (
            <>
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">출발지 (선택)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      장소ID
                    </label>
                    <input
                      type="text"
                      placeholder="18577297"
                      value={formData.fromPlaceId || ""}
                      onChange={(e) => setFormData({ ...formData, fromPlaceId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      장소명
                    </label>
                    <input
                      type="text"
                      placeholder="에이치스퀘어"
                      value={formData.fromName || ""}
                      onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        위도
                      </label>
                      <input
                        type="text"
                        placeholder="37.402056"
                        value={formData.fromLat || ""}
                        onChange={(e) => setFormData({ ...formData, fromLat: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        경도
                      </label>
                      <input
                        type="text"
                        placeholder="127.108212"
                        value={formData.fromLng || ""}
                        onChange={(e) => setFormData({ ...formData, fromLng: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">경유지 (선택, 최대 5개)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      장소명
                    </label>
                    <input
                      type="text"
                      placeholder="알파돔타워"
                      value={formData.viaName || ""}
                      onChange={(e) => setFormData({ ...formData, viaName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        위도
                      </label>
                      <input
                        type="text"
                        placeholder="37.394245407468"
                        value={formData.viaLat || ""}
                        onChange={(e) => setFormData({ ...formData, viaLat: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        경도
                      </label>
                      <input
                        type="text"
                        placeholder="127.110306812433"
                        value={formData.viaLng || ""}
                        onChange={(e) => setFormData({ ...formData, viaLng: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">목적지 *</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      장소ID
                    </label>
                    <input
                      type="text"
                      placeholder="18577297"
                      value={formData.toPlaceId || ""}
                      onChange={(e) => setFormData({ ...formData, toPlaceId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      장소명
                    </label>
                    <input
                      type="text"
                      placeholder="카카오판교아지트"
                      value={formData.toName || ""}
                      onChange={(e) => setFormData({ ...formData, toName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        위도
                      </label>
                      <input
                        type="text"
                        placeholder="37.3952969470752"
                        value={formData.toLat || ""}
                        onChange={(e) => setFormData({ ...formData, toLat: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        경도
                      </label>
                      <input
                        type="text"
                        placeholder="127.110449292622"
                        value={formData.toLng || ""}
                        onChange={(e) => setFormData({ ...formData, toLng: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <Button onClick={generateRouteUrl} variant="primary">
            길찾기 열기
          </Button>
        </div>
      )}

      {/* 로드뷰 */}
      {activeTab === "roadview" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              장소ID (선택)
            </label>
            <input
              type="text"
              placeholder="18577297"
              value={formData.roadviewPlaceId || ""}
              onChange={(e) => setFormData({ ...formData, roadviewPlaceId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-sm text-gray-500 mb-4">또는</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                위도 *
              </label>
              <input
                type="text"
                placeholder="37.3952969470752"
                value={formData.roadviewLat || ""}
                onChange={(e) => setFormData({ ...formData, roadviewLat: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                경도 *
              </label>
              <input
                type="text"
                placeholder="127.110449292622"
                value={formData.roadviewLng || ""}
                onChange={(e) => setFormData({ ...formData, roadviewLng: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <Button onClick={generateRoadviewUrl} variant="primary">
            로드뷰 열기
          </Button>
        </div>
      )}

      {/* 검색 */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              검색어 *
            </label>
            <input
              type="text"
              placeholder="카카오"
              value={formData.searchKeyword || ""}
              onChange={(e) => setFormData({ ...formData, searchKeyword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button onClick={generateSearchUrl} variant="primary">
            검색 결과 열기
          </Button>
        </div>
      )}

      {/* 생성된 URL 표시 */}
      {generatedUrl && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            생성된 URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={generatedUrl}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(generatedUrl);
                alert("URL이 클립보드에 복사되었습니다.");
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              복사
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

