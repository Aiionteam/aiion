import React, { useState, useEffect } from 'react';
import { fetchJSONFromGateway, getAccessToken } from '../../lib';

interface AlarmNotification {
  id: number;
  transactionDate: string;
  transactionTime?: string;
  type: string;
  amount: number;
  category?: string;
  description?: string;
  memo?: string;
  alarmDate: string;
  alarmTime: string;
}

interface AccountAlarmNotificationProps {
  darkMode?: boolean;
}

export const AccountAlarmNotification: React.FC<AccountAlarmNotificationProps> = ({ darkMode = false }) => {
  const [alarms, setAlarms] = useState<AlarmNotification[]>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [currentAlarm, setCurrentAlarm] = useState<AlarmNotification | null>(null);

  // 알람 확인 함수
  const checkAlarms = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetchJSONFromGateway<{ code: number; message: string; data: any[] }>(
        '/account/alerts/active',
        {},
        { method: 'GET' }
      );

      if (response.data && response.data.code === 200 && response.data.data) {
        const activeAlarms = response.data.data as AlarmNotification[];
        
        if (activeAlarms.length === 0) {
          // 알람이 없으면 알림 숨기기
          if (showNotification) {
            setShowNotification(false);
            setCurrentAlarm(null);
          }
          return;
        }
        
        // 현재 시간과 비교하여 알람 시간이 된 것들만 필터링
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:mm

        const triggeredAlarms = activeAlarms.filter(alarm => {
          if (!alarm.alarmDate || !alarm.alarmTime) return false;
          
          // 알람 날짜와 시간을 Date 객체로 변환
          const alarmDateTimeStr = `${alarm.alarmDate}T${alarm.alarmTime}:00`;
          const alarmDateTime = new Date(alarmDateTimeStr);
          
          // 날짜가 유효한지 확인
          if (isNaN(alarmDateTime.getTime())) {
            console.error('[AccountAlarmNotification] 잘못된 날짜 형식:', alarmDateTimeStr);
            return false;
          }
          
          const timeDiff = alarmDateTime.getTime() - now.getTime();
          
          // 알람 시간이 지났고, 1시간 이내인 경우만 표시 (중복 알림 방지)
          const isWithinHour = timeDiff <= 0 && timeDiff >= -60 * 60 * 1000; // 1시간 이내
          
          console.log('[AccountAlarmNotification] 알람 확인:', {
            alarmId: alarm.id,
            alarmDateTime: alarmDateTimeStr,
            now: now.toISOString(),
            timeDiff: timeDiff,
            isWithinHour: isWithinHour
          });
          
          return isWithinHour;
        });

        if (triggeredAlarms.length > 0) {
          // 가장 최근 알람부터 표시
          const sortedAlarms = triggeredAlarms.sort((a, b) => {
            const aTime = new Date(`${a.alarmDate}T${a.alarmTime}:00`).getTime();
            const bTime = new Date(`${b.alarmDate}T${b.alarmTime}:00`).getTime();
            return bTime - aTime; // 최신순
          });
          
          const newAlarm = sortedAlarms[0];
          // 이미 표시 중인 알람이 아니면 새로 표시
          if (!currentAlarm || currentAlarm.id !== newAlarm.id) {
            console.log('[AccountAlarmNotification] 새 알람 표시:', newAlarm);
            setCurrentAlarm(newAlarm);
            setShowNotification(true);
          }
        } else if (showNotification) {
          // 알람 시간이 지났으면 알림 숨기기
          setShowNotification(false);
          setCurrentAlarm(null);
        }
      }
    } catch (error) {
      console.error('[AccountAlarmNotification] 알람 확인 실패:', error);
    }
  };

  // 주기적으로 알람 확인 (30초마다)
  useEffect(() => {
    checkAlarms();
    const interval = setInterval(checkAlarms, 30 * 1000); // 30초마다 확인
    
    return () => clearInterval(interval);
  }, [showNotification, currentAlarm]);

  // 알람 닫기
  const handleClose = () => {
    setShowNotification(false);
    setCurrentAlarm(null);
  };

  if (!showNotification || !currentAlarm) {
    return null;
  }

  const styles = {
    bg: darkMode ? 'bg-[#1a1a1a]' : 'bg-white',
    border: darkMode ? 'border-[#2a2a2a]' : 'border-[#8B7355]',
    title: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-gray-400' : 'text-gray-500',
    button: darkMode ? 'bg-[#2a2a2a] hover:bg-[#333333]' : 'bg-[#f5f1e8] hover:bg-[#e8e2d5]',
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      <div className={`rounded-lg border-2 shadow-lg p-4 ${styles.bg} ${styles.border} animate-slide-down`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔔</span>
              <h3 className={`text-lg font-bold ${styles.title}`}>가계부 알람</h3>
            </div>
            <div className={`text-sm ${styles.textMuted} mb-2`}>
              <p className="font-medium">{currentAlarm.alarmDate} {currentAlarm.alarmTime}</p>
            </div>
            <div className={`text-sm ${styles.title} mb-1`}>
              <p>
                {currentAlarm.type === 'INCOME' ? '💰 수입' : '💸 지출'}: {currentAlarm.amount?.toLocaleString()}원
              </p>
              {currentAlarm.category && (
                <p className={styles.textMuted}>카테고리: {currentAlarm.category}</p>
              )}
              {currentAlarm.description && (
                <p className={styles.textMuted}>내용: {currentAlarm.description}</p>
              )}
              {currentAlarm.memo && (
                <p className={styles.textMuted}>메모: {currentAlarm.memo}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleClose}
            className={`ml-4 px-3 py-1 rounded ${styles.button} ${styles.title} text-sm`}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

