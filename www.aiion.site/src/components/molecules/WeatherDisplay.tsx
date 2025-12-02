import React, { useEffect, useState } from 'react';
import { useWeatherForecast } from '../../app/hooks/useAIGateway';

interface WeatherDisplayProps {
  darkMode?: boolean;
}

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ darkMode = false }) => {
  const { getShortForecast, loading } = useWeatherForecast();
  const [weatherInfo, setWeatherInfo] = useState<{
    temperature?: string;
    sky?: string;
    pty?: string;
  } | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // 서울 좌표 (nx: 60, ny: 127)
        const data = await getShortForecast(60, 127);
        
        if (data?.response?.body?.items) {
          let items: any[] = [];
          
          // items 구조에 따라 파싱
          if (data.response.body.items.item) {
            items = Array.isArray(data.response.body.items.item)
              ? data.response.body.items.item
              : [data.response.body.items.item];
          } else if (Array.isArray(data.response.body.items)) {
            items = data.response.body.items;
          }
          
          if (items.length > 0) {
            // 현재 시간에 가장 가까운 예보 찾기
            const now = new Date();
            const currentHour = now.getHours();
            
            // 같은 날짜이고 현재 시간 이후의 첫 번째 예보 찾기
            const todayStr = now.toISOString().split('T')[0].replace(/-/g, '');
            const relevantItems = items.filter((item: any) => {
              const itemDate = item.fcstDate;
              const itemTime = item.fcstTime ? parseInt(item.fcstTime.substring(0, 2)) : 0;
              return itemDate === todayStr && itemTime >= currentHour;
            });
            
            const targetItems = relevantItems.length > 0 ? relevantItems : items;
            
            // 온도 찾기
            const tempItem = targetItems.find((item: any) => item.category === 'TMP');
            const temp = tempItem?.fcstValue ? `${tempItem.fcstValue}°C` : undefined;
            
            // 하늘 상태
            const skyItem = targetItems.find((item: any) => item.category === 'SKY');
            const skyMap: Record<string, string> = {
              '1': '맑음',
              '3': '구름많음',
              '4': '흐림'
            };
            const sky = skyItem?.fcstValue ? skyMap[skyItem.fcstValue] || skyItem.fcstValue : undefined;
            
            // 강수 형태
            const ptyItem = targetItems.find((item: any) => item.category === 'PTY');
            const ptyMap: Record<string, string> = {
              '0': '',
              '1': '🌧️',
              '2': '🌨️',
              '3': '❄️',
              '4': '🌦️'
            };
            const pty = ptyItem?.fcstValue && ptyItem.fcstValue !== '0' 
              ? ptyMap[ptyItem.fcstValue] || '' 
              : '';
            
            setWeatherInfo({
              temperature: temp,
              sky,
              pty
            });
          }
        }
      } catch (error) {
        console.error('[WeatherDisplay] 날씨 정보 조회 실패:', error);
        // 에러 발생 시 null로 설정하여 표시하지 않음
        setWeatherInfo(null);
      }
    };

    fetchWeather();
    // 10분마다 갱신
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [getShortForecast]);

  if (loading && !weatherInfo) {
    return (
      <span className={`text-xs animate-pulse ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        ⏳
      </span>
    );
  }

  if (!weatherInfo || (!weatherInfo.temperature && !weatherInfo.sky)) {
    return null;
  }

  return (
    <span className={`text-xs font-medium flex items-center gap-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
      {weatherInfo.pty && <span>{weatherInfo.pty}</span>}
      {weatherInfo.sky && <span>{weatherInfo.sky}</span>}
      {weatherInfo.temperature && <span className="font-semibold">{weatherInfo.temperature}</span>}
    </span>
  );
};

