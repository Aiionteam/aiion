import React, { useState, useEffect } from 'react';
import { fetchJSONFromGateway, getAccessToken } from '../../lib';

interface AlarmItem {
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
  alarmEnabled?: boolean;
}

interface AccountAlarmListProps {
  darkMode?: boolean;
}

export const AccountAlarmList: React.FC<AccountAlarmListProps> = ({ darkMode = false }) => {
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [loading, setLoading] = useState(false);

  const styles = {
    bg: darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]',
    title: darkMode ? 'text-white' : 'text-gray-900',
    textMuted: darkMode ? 'text-gray-400' : 'text-gray-500',
    border: darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]',
    cardBg: darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f1e8]',
  };

  // 알람 목록 조회
  const fetchAlarms = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        setAlarms([]);
        return;
      }

      const response = await fetchJSONFromGateway<{ code: number; message: string; data: any[] }>(
        '/account/alerts/active',
        {},
        { method: 'GET' }
      );

      if (response.data && response.data.code === 200 && response.data.data) {
        const activeAlarms = response.data.data as AlarmItem[];
        // 알람 날짜/시간 순으로 정렬
        const sortedAlarms = activeAlarms.sort((a, b) => {
          const aTime = new Date(`${a.alarmDate}T${a.alarmTime}:00`).getTime();
          const bTime = new Date(`${b.alarmDate}T${b.alarmTime}:00`).getTime();
          return aTime - bTime; // 오름차순 (가까운 알람부터)
        });
        setAlarms(sortedAlarms);
      } else {
        setAlarms([]);
      }
    } catch (error) {
      console.error('[AccountAlarmList] 알람 조회 실패:', error);
      setAlarms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlarms();
    // 30초마다 갱신
    const interval = setInterval(fetchAlarms, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.bg} ${styles.border}`}>
      <div className={`mb-4 pb-3 border-b-2 ${styles.border}`}>
        <h2 className={`text-xl font-bold ${styles.title} flex items-center gap-2`}>
          <span>🔔</span>
          알람 목록
        </h2>
      </div>
      
      {loading ? (
        <p className={`text-sm ${styles.textMuted} text-center py-4`}>로딩 중...</p>
      ) : alarms.length === 0 ? (
        <div className="text-center py-4">
          <p className={`text-sm ${styles.textMuted}`}>설정된 알람이 없습니다.</p>
          <p className={`text-xs ${styles.textMuted} mt-1`}>
            거래 내역에서 알람을 설정하세요.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alarms.map((alarm) => {
            const alarmDateTime = new Date(`${alarm.alarmDate}T${alarm.alarmTime}:00`);
            const now = new Date();
            const isPast = alarmDateTime.getTime() < now.getTime();
            const isToday = alarmDateTime.toDateString() === now.toDateString();
            const timeDiff = alarmDateTime.getTime() - now.getTime();
            const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutesUntil = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            // 알람 상태 결정
            let alarmStatus = '';
            let statusColor = '';
            if (isPast) {
              const hoursAgo = Math.abs(hoursUntil);
              if (hoursAgo < 1) {
                alarmStatus = '방금 울림';
                statusColor = 'text-red-500';
              } else if (hoursAgo < 24) {
                alarmStatus = `${hoursAgo}시간 전 울림`;
                statusColor = 'text-orange-500';
              } else {
                alarmStatus = '지남';
                statusColor = 'text-gray-500';
              }
            } else {
              if (hoursUntil < 1) {
                alarmStatus = `${minutesUntil}분 후 울림`;
                statusColor = 'text-red-500 font-semibold';
              } else if (hoursUntil < 24) {
                alarmStatus = `${hoursUntil}시간 후 울림`;
                statusColor = 'text-orange-500';
              } else {
                const daysUntil = Math.floor(hoursUntil / 24);
                alarmStatus = `${daysUntil}일 후 울림`;
                statusColor = 'text-blue-500';
              }
            }
            
            return (
              <div
                key={alarm.id}
                className={`p-3 rounded-lg border ${styles.border} ${styles.cardBg} ${
                  isPast ? 'opacity-70' : ''
                } ${timeDiff > 0 && timeDiff < 60 * 60 * 1000 ? 'ring-2 ring-red-500' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-semibold ${
                        alarm.type === 'INCOME' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {alarm.type === 'INCOME' ? '💰' : '💸'}
                      </span>
                      <span className={`text-sm font-medium ${styles.title}`}>
                        {alarm.amount?.toLocaleString() || 0}원
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-xs ${styles.textMuted}`}>
                        📅 {alarm.alarmDate} {alarm.alarmTime}
                        {isToday && <span className="ml-1 text-orange-500">(오늘)</span>}
                      </p>
                    </div>
                    <p className={`text-xs ${statusColor} font-medium mb-1`}>
                      🔔 {alarmStatus}
                    </p>
                    {alarm.category && (
                      <p className={`text-xs ${styles.textMuted}`}>
                        🏷️ {alarm.category}
                      </p>
                    )}
                    {alarm.memo && (
                      <p className={`text-xs ${styles.textMuted} mt-1`}>
                        📌 {alarm.memo}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

