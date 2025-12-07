"use client";

import React, { useState, useEffect } from "react";
import {
  getMidForecast,
  getShortForecast,
  getTodayDate,
  getLatestBaseTime,
  getMidForecastTime,
  REGION_CODES,
  WeatherResponse,
} from "@/lib/api/weather";

interface WeatherForecastProps {
  position: "left" | "right";
}

// 중기예보 시간 포맷팅 (YYYYMMDDHHmm -> YYYY-MM-DD HH:mm)
const formatMidForecastTime = (tmFc: string): string => {
  if (!tmFc || tmFc.length < 12) return tmFc;
  const year = tmFc.substring(0, 4);
  const month = tmFc.substring(4, 6);
  const day = tmFc.substring(6, 8);
  const hour = tmFc.substring(8, 10);
  const minute = tmFc.substring(10, 12);
  return `${year}-${month}-${day} ${hour}:${minute}`;
};

// 단기예보 시간 포맷팅 (HHmm -> HH:mm)
const formatShortForecastTime = (fcstTime: string): string => {
  if (!fcstTime || fcstTime.length < 4) return fcstTime;
  const hour = fcstTime.substring(0, 2);
  const minute = fcstTime.substring(2, 4);
  return `${hour}:${minute}`;
};

export const WeatherForecast: React.FC<WeatherForecastProps> = ({ position }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>("");

  // 서울 지역 사용 (기본값)
  const region = REGION_CODES.SEOUL;

  // 현재 시간 실시간 업데이트 (단기예보용)
  useEffect(() => {
    const updateCurrentTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };

    // 즉시 업데이트
    updateCurrentTime();

    // 1분마다 업데이트
    const interval = setInterval(updateCurrentTime, 60000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchWeather = async () => {
      setLoading(true);
      setError(null);

      try {
        if (position === "left") {
          // 중기예보 (3일~10일)
          // regionName 사용 (권장) 및 tmFc 생략 (자동 계산)
          console.log(`[Weather] 중기예보 요청:`, { regionName: "서울", tmFc: "(자동 계산)" });
          const response = await getMidForecast({
            regionName: "서울", // regionName 사용 (권장)
            // tmFc 생략 - 백엔드에서 현재 시간 기준으로 자동 계산
            dataType: "JSON",
          });
          console.log(`[Weather] 중기예보 응답:`, response);
          setForecastData(response);
        } else {
          // 단기예보 (현재~3일)
          // base_date와 base_time 생략 - 백엔드에서 자동 계산
          console.log(`[Weather] 단기예보 요청:`, { nx: region.nx, ny: region.ny, base_date: "(자동 계산)", base_time: "(자동 계산)" });
          const response = await getShortForecast({
            // base_date와 base_time 생략 - 백엔드에서 현재 시간 기준으로 자동 계산
            nx: region.nx,
            ny: region.ny,
            dataType: "JSON",
          });
          console.log(`[Weather] 단기예보 응답:`, response);
          setForecastData(response);
        }
      } catch (err: any) {
        console.error("Weather fetch error:", err);
        
        // 에러 메시지 처리
        let errorMessage = "날씨 정보를 불러올 수 없습니다.";
        
        if (err.response?.data?.detail) {
          const detail = err.response.data.detail;
          
          // 401 Unauthorized 에러 (API 키 문제)
          if (typeof detail === 'string' && detail.includes('401') && detail.includes('Unauthorized')) {
            errorMessage = "기상청 API 인증 오류";
          }
          // 기타 API 에러
          else if (typeof detail === 'string' && detail.includes('API')) {
            errorMessage = "기상청 API 오류";
          }
          // 일반 에러 메시지가 너무 길면 간단하게
          else if (typeof detail === 'string' && detail.length > 100) {
            errorMessage = "날씨 정보 조회 실패";
          }
          else if (typeof detail === 'string') {
            errorMessage = detail;
          }
        } else if (err.message) {
          // 에러 메시지가 너무 길면 간단하게
          if (err.message.length > 100) {
            errorMessage = "날씨 정보 조회 실패";
          } else {
            errorMessage = err.message;
          }
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    
    // 10분마다 업데이트
    const interval = setInterval(fetchWeather, 600000);
    return () => clearInterval(interval);
  }, [position, region]);

  // 중기예보 데이터 파싱
  const parseMidForecast = (data: WeatherResponse) => {
    console.log("[Weather] 중기예보 파싱 시작:", data);
    
    // 응답 구조 확인
    if (!data?.response) {
      console.warn("[Weather] 중기예보: response 객체가 없습니다.");
      return null;
    }

    // 응답 헤더 확인
    const resultCode = data.response.header?.resultCode;
    if (resultCode !== "00") {
      console.warn(`[Weather] 중기예보: resultCode가 "00"이 아닙니다. (${resultCode})`, data.response.header);
      return null;
    }

    // items.item 또는 items 구조에서 데이터 추출
    // 문서: body.items (배열) - FRONTEND_API_DOCS.md 기준
    // 실제: body.items.item (배열 또는 단일 객체) - 백엔드 실제 응답
    let items: any = data?.response?.body?.items;
    
    // items.item이 있으면 그것을 사용, 없으면 items 자체를 사용
    if (items?.item !== undefined) {
      items = items.item;
    }
    
    // items가 배열이 아닌 경우 배열로 변환
    let itemsArray: any[] = [];
    if (Array.isArray(items)) {
      itemsArray = items;
    } else if (items && typeof items === 'object') {
      // 단일 객체인 경우 배열로 변환
      itemsArray = [items];
    } else {
      itemsArray = [];
    }

    if (itemsArray.length === 0) {
      console.warn("[Weather] 중기예보: items 배열이 비어있습니다.");
      return null;
    }

    // 첫 번째 항목에서 날씨 정보 추출
    const firstItem = itemsArray[0];
    console.log("[Weather] 중기예보 첫 번째 항목:", firstItem);
    return {
      wfSv: firstItem.wfSv || "정보 없음", // 날씨 예보
      taMin: firstItem.taMin || null, // 최저기온
      taMax: firstItem.taMax || null, // 최고기온
      tmFc: firstItem.tmFc || null, // 발표시각
    };
  };

  // 단기예보 데이터 파싱
  const parseShortForecast = (data: WeatherResponse) => {
    console.log("[Weather] 단기예보 파싱 시작:", data);
    
    // 응답 구조 확인
    if (!data?.response) {
      console.warn("[Weather] 단기예보: response 객체가 없습니다.");
      return null;
    }

    // 응답 헤더 확인
    const resultCode = data.response.header?.resultCode;
    if (resultCode !== "00") {
      console.warn(`[Weather] 단기예보: resultCode가 "00"이 아닙니다. (${resultCode})`, data.response.header);
      return null;
    }

    // items.item 또는 items 구조에서 데이터 추출
    // 문서: body.items (배열) - FRONTEND_API_DOCS.md 기준
    // 실제: body.items.item (배열 또는 단일 객체) - 백엔드 실제 응답
    let items: any = data?.response?.body?.items;
    
    // items.item이 있으면 그것을 사용, 없으면 items 자체를 사용
    if (items?.item !== undefined) {
      items = items.item;
    }
    
    // items가 배열이 아닌 경우 배열로 변환
    let itemsArray: any[] = [];
    if (Array.isArray(items)) {
      itemsArray = items;
    } else if (items && typeof items === 'object') {
      // 단일 객체인 경우 배열로 변환
      itemsArray = [items];
    } else {
      itemsArray = [];
    }

    if (itemsArray.length === 0) {
      console.warn("[Weather] 단기예보: items 배열이 비어있습니다.");
      return null;
    }
    
    // 현재 시간 기준으로 가장 가까운 예보 찾기
    const now = new Date();
    const currentHour = now.getHours();
    const currentDate = getTodayDate();
    
    // TMP (기온), SKY (하늘상태) 카테고리 찾기
    const tempItem = itemsArray.find((item: any) => item?.category === "TMP");
    const skyItem = itemsArray.find((item: any) => item?.category === "SKY");
    
    // 현재 시간 이후의 가장 가까운 예보 찾기
    // 먼저 오늘 날짜의 예보를 찾고, 시간이 현재 시간 이후인 것 중 가장 가까운 것 선택
    const todayItems = itemsArray.filter((item: any) => item?.fcstDate === currentDate);
    
    if (todayItems.length === 0) {
      // 오늘 날짜의 예보가 없으면 첫 번째 항목 사용
      if (tempItem && skyItem) {
        const temp = tempItem.fcstValue;
        const sky = skyItem.fcstValue || "1";
        
        const skyStatus: { [key: string]: string } = {
          "1": "맑음",
          "3": "구름많음",
          "4": "흐림",
        };

        return {
          temp: temp ? `${temp}°C` : "정보 없음",
          sky: skyStatus[sky] || "정보 없음",
          time: tempItem.fcstTime ? `${tempItem.fcstTime.substring(0, 2)}:${tempItem.fcstTime.substring(2, 4)}` : "",
        };
      }
      return null;
    }

    // 현재 시간 이후의 가장 가까운 예보 찾기
    let closestItem = todayItems[0];
    for (const item of todayItems) {
      const fcstHour = parseInt(item.fcstTime?.substring(0, 2) || "0");
      if (fcstHour >= currentHour) {
        closestItem = item;
        break;
      }
    }

    // 같은 시간대의 기온과 하늘 상태 찾기
    const fcstTime = closestItem.fcstTime;
    const temp = itemsArray.find(
      (item: any) => item?.category === "TMP" && item?.fcstDate === currentDate && item?.fcstTime === fcstTime
    )?.fcstValue;
    
    const sky = itemsArray.find(
      (item: any) => item?.category === "SKY" && item?.fcstDate === currentDate && item?.fcstTime === fcstTime
    )?.fcstValue || "1";
    
    // 하늘 상태 코드 변환
    const skyStatus: { [key: string]: string } = {
      "1": "맑음",
      "3": "구름많음",
      "4": "흐림",
    };

    return {
      temp: temp ? `${temp}°C` : "정보 없음",
      sky: skyStatus[sky] || "정보 없음",
      time: fcstTime ? formatShortForecastTime(fcstTime) : "",
    };
  };

  const midForecast = position === "left" && forecastData ? parseMidForecast(forecastData) : null;
  const shortForecast = position === "right" && forecastData ? parseShortForecast(forecastData) : null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 min-w-[200px]">
      <div className="flex items-center gap-2 mb-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-blue-500"
        >
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
        </svg>
        <h3 className="text-sm font-semibold text-gray-700">
          {position === "left" ? "중기예보" : "단기예보"}
        </h3>
      </div>

      {loading && (
        <div className="text-xs text-gray-500">로딩 중...</div>
      )}

      {error && (
        <div className="text-xs text-red-500 break-words">{error}</div>
      )}

      {!loading && !error && (
        <>
          {position === "left" && midForecast && (
            <div className="space-y-1">
              <div className="text-xs text-gray-600">
                <span className="font-medium">날씨:</span> {midForecast.wfSv}
              </div>
              {(midForecast.taMin || midForecast.taMax) && (
                <div className="text-xs text-gray-600">
                  <span className="font-medium">기온:</span>{" "}
                  {midForecast.taMin && midForecast.taMax
                    ? `${midForecast.taMin}°C / ${midForecast.taMax}°C`
                    : midForecast.taMin
                    ? `최저 ${midForecast.taMin}°C`
                    : midForecast.taMax
                    ? `최고 ${midForecast.taMax}°C`
                    : "정보 없음"}
                </div>
              )}
              {midForecast.tmFc && (
                <div className="text-xs text-gray-400 mt-1">
                  발표: {formatMidForecastTime(midForecast.tmFc)}
                </div>
              )}
            </div>
          )}

          {position === "right" && shortForecast && (
            <div className="space-y-1">
              <div className="text-xs text-gray-600">
                <span className="font-medium">기온:</span> {shortForecast.temp}
              </div>
              <div className="text-xs text-gray-600">
                <span className="font-medium">하늘:</span> {shortForecast.sky}
              </div>
              {currentTime && (
                <div className="text-xs text-gray-400 mt-1">
                  현재: {currentTime}
                </div>
              )}
            </div>
          )}

          {!midForecast && !shortForecast && (
            <div className="text-xs text-gray-500">날씨 정보가 없습니다.</div>
          )}
        </>
      )}
    </div>
  );
};

