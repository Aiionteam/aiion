import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '../atoms';
import { AccountView as AccountViewType, Transaction } from '../types';
import { getLocalDateStr, fetchJSONFromGateway, getAccessToken } from '../../lib';
import { AccountAlarmList } from '../molecules/AccountAlarmList';

interface AccountViewProps {
  accountView: AccountViewType;
  setAccountView: (view: AccountViewType) => void;
  darkMode?: boolean;
}

const getCommonStyles = (darkMode: boolean) => ({
  bg: darkMode ? 'bg-[#0a0a0a]' : 'bg-[#e8e2d5]',
  bgSecondary: darkMode ? 'bg-[#121212]' : 'bg-[#f5f1e8]',
  header: darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#d4c4a8]',
  card: darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]',
  cardGradient: darkMode ? 'bg-gradient-to-br from-[#1a1a1a] to-[#121212] border-[#2a2a2a]' : 'bg-gradient-to-br from-white to-[#f5f0e8] border-[#8B7355]',
  title: darkMode ? 'text-white' : 'text-gray-900',
  textMuted: darkMode ? 'text-gray-400' : 'text-gray-500',
  textSecondary: darkMode ? 'text-gray-300' : 'text-gray-700',
  border: darkMode ? 'border-[#2a2a2a]' : 'border-[#d4c4a8]',
  button: darkMode ? 'bg-gradient-to-br from-[#1a1a1a] to-[#121212] border-[#2a2a2a]' : 'bg-gradient-to-br from-white to-[#f5f0e8] border-[#8B7355]',
  buttonHover: darkMode ? 'text-gray-300 hover:text-white hover:bg-[#1a1a1a]' : 'text-gray-600 hover:text-gray-900 hover:bg-[#f5f1e8]',
  cardBg: darkMode ? 'bg-[#1a1a1a]' : 'bg-[#f5f1e8]',
});

export const AccountView: React.FC<AccountViewProps> = ({
  accountView,
  setAccountView,
  darkMode = false,
}) => {
  console.log('[AccountView] 렌더링됨, accountView:', accountView);
  
  // 샘플 데이터 (백엔드 연동 전까지 사용)
  const sampleTransactions: Transaction[] = useMemo(() => [
    { id: '1', title: '점심 식사', date: '2024-01-15', totalAmount: 12000, category: '식비' },
    { id: '2', title: '지하철 요금', date: '2024-01-15', totalAmount: 1400, category: '교통비' },
    { id: '3', title: '커피', date: '2024-01-15', totalAmount: 4500, category: '식비' },
    { id: '4', title: '영화 관람', date: '2024-01-14', totalAmount: 14000, category: '문화생활' },
    { id: '5', title: '택시비', date: '2024-01-14', totalAmount: 8500, category: '교통비' },
    { id: '6', title: '저녁 식사', date: '2024-01-14', totalAmount: 25000, category: '식비' },
    { id: '7', title: '마트 장보기', date: '2024-01-13', totalAmount: 45000, category: '생활비' },
    { id: '8', title: '책 구매', date: '2024-01-13', totalAmount: 18000, category: '문화생활' },
  ], []);
  
  const [transactions] = useState<Transaction[]>(sampleTransactions);
  const [dailySelectedDate, setDailySelectedDate] = useState(new Date());
  const [monthlySelectedMonth, setMonthlySelectedMonth] = useState(new Date());
  
  // Monthly 뷰용 상태 (항상 선언되어야 함 - Hooks 규칙)
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [dailyAccounts, setDailyAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMemo, setEditingMemo] = useState<{ [key: string]: string }>({});
  const [editingAlarm, setEditingAlarm] = useState<{ [key: string]: boolean }>({});
  const [alarmSettings, setAlarmSettings] = useState<{ [key: string]: { date: string; time: string; enabled: boolean } }>({});
  
  const styles = getCommonStyles(darkMode);

  // 샘플 월별 데이터 생성 함수
  const generateSampleMonthlyData = useCallback(() => {
    const year = monthlySelectedMonth.getFullYear();
    const month = monthlySelectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const sampleDailyAccounts: { [key: string]: any[] } = {};
    const sampleDailyTotals: { [key: string]: { income: number; expense: number } } = {};
    let totalIncome = 0;
    let totalExpense = 0;
    
    // 샘플 거래 데이터를 날짜별로 분배
    sampleTransactions.forEach((transaction, index) => {
      const day = Math.min(15 + (index % 10), daysInMonth); // 15일부터 시작하여 분산
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      if (!sampleDailyAccounts[dateStr]) {
        sampleDailyAccounts[dateStr] = [];
      }
      
      const accountData = {
        id: transaction.id,
        transactionDate: dateStr,
        transactionTime: `${String(10 + (index % 12)).padStart(2, '0')}:${String((index * 5) % 60).padStart(2, '0')}`,
        type: 'EXPENSE',
        amount: transaction.totalAmount,
        paymentMethod: index % 3 === 0 ? '카드' : index % 3 === 1 ? '현금' : '계좌이체',
        location: transaction.category === '식비' ? '식당' : transaction.category === '교통비' ? '지하철' : '기타',
        category: transaction.category,
        description: transaction.title,
        memo: '',
        alarmEnabled: false,
      };
      
      sampleDailyAccounts[dateStr].push(accountData);
      
      if (!sampleDailyTotals[dateStr]) {
        sampleDailyTotals[dateStr] = { income: 0, expense: 0 };
      }
      sampleDailyTotals[dateStr].expense += transaction.totalAmount;
      totalExpense += transaction.totalAmount;
    });
    
    return {
      dailyAccounts: sampleDailyAccounts,
      dailyTotals: sampleDailyTotals,
      monthlyTotal: { income: totalIncome, expense: totalExpense },
      totalCount: sampleTransactions.length,
    };
  }, [monthlySelectedMonth, sampleTransactions]);

  // 월별 데이터 조회 함수 (컴포넌트 레벨에서 정의)
  const fetchMonthlyData = useCallback(async () => {
    if (accountView !== 'monthly') return;
    
    setLoading(true);
    try {
      const year = monthlySelectedMonth.getFullYear();
      const month = monthlySelectedMonth.getMonth();
      const monthNum = month + 1; // 1-12로 변환
      
      console.log('[AccountView] API 호출 파라미터:', { year, month: monthNum });
      
      // 게이트웨이 라우팅: /account/** → account-service
      const endpoint = `/account/accounts/user/month?year=${year}&month=${monthNum}`;
      console.log('[AccountView] API 엔드포인트:', endpoint);
      
      const response = await fetchJSONFromGateway<{ code: number; message: string; data: any }>(
        endpoint,
        {},
        { method: 'GET' }
      );

      console.log('[AccountView] API 응답 상태:', response.status);
      console.log('[AccountView] API 응답:', response);
      
      // 에러 처리
      if (response.error) {
        console.error('[AccountView] API 에러:', response.error);
        // 백엔드 연동 실패 시 샘플 데이터 사용
        console.log('[AccountView] 백엔드 연동 실패, 샘플 데이터 사용');
        const sampleData = generateSampleMonthlyData();
        setMonthlyData(sampleData);
        const accountsArray = Object.entries(sampleData.dailyAccounts).map(([date, accounts]) => ({
          date,
          accounts: Array.isArray(accounts) ? accounts : []
        }));
        setDailyAccounts(accountsArray);
        setLoading(false);
        return;
      }

      // 응답 데이터 확인
      console.log('[AccountView] ========== 응답 분석 시작 ==========');
      console.log('[AccountView] response 객체:', response);
      console.log('[AccountView] response.data 존재:', !!response.data);
      console.log('[AccountView] response.data 타입:', typeof response.data);
      
      if (response.data) {
        // code는 소문자로 직렬화됨
        const responseCode = (response.data as any).code;
        console.log('[AccountView] 응답 코드:', responseCode);
        console.log('[AccountView] 응답 메시지:', (response.data as any).message);
        console.log('[AccountView] response.data.data 존재:', !!(response.data as any).data);
        console.log('[AccountView] response.data.data 타입:', typeof (response.data as any).data);
        console.log('[AccountView] 전체 응답 데이터:', JSON.stringify(response.data, null, 2));
        
        if (responseCode === 200) {
          const data = response.data.data;
          console.log('[AccountView] 월별 데이터:', data);
          console.log('[AccountView] 월별 데이터 타입:', typeof data);
          console.log('[AccountView] 월별 데이터 키들:', data ? Object.keys(data) : 'null');
          
          if (data) {
            console.log('[AccountView] 월별 데이터 구조:', {
              dailyAccounts: data.dailyAccounts,
              dailyTotals: data.dailyTotals,
              monthlyTotal: data.monthlyTotal,
              totalCount: data.totalCount
            });
            
            setMonthlyData(data);
            
            // dailyAccounts는 Map<String, List<AccountModel>> 형태
            // 프론트엔드에서는 객체로 접근 가능
            if (data.dailyAccounts) {
              // 객체를 배열로 변환 (디버깅 및 검색용)
              const accountsArray = Object.entries(data.dailyAccounts).map(([date, accounts]: [string, any]) => {
                const accountList = Array.isArray(accounts) ? accounts : (accounts ? Object.values(accounts).flat() : []);
                console.log(`[AccountView] 날짜 ${date}의 계정 ${accountList.length}개`);
                if (accountList.length > 0) {
                  console.log(`[AccountView] 첫 번째 계정 샘플:`, accountList[0]);
                }
                return {
                  date,
                  accounts: accountList
                };
              });
              console.log('[AccountView] 날짜별 계정 배열:', accountsArray.length, '개 날짜');
              console.log('[AccountView] dailyAccounts 객체 키들:', Object.keys(data.dailyAccounts));
              setDailyAccounts(accountsArray);
            } else {
              console.error('[AccountView] ⚠️ dailyAccounts가 없음');
              setDailyAccounts([]);
            }
          } else {
            console.error('[AccountView] ⚠️ 데이터가 null, 샘플 데이터 사용');
            // 데이터가 null이면 샘플 데이터 사용
            const sampleData = generateSampleMonthlyData();
            setMonthlyData(sampleData);
            const accountsArray = Object.entries(sampleData.dailyAccounts).map(([date, accounts]) => ({
              date,
              accounts: Array.isArray(accounts) ? accounts : []
            }));
            setDailyAccounts(accountsArray);
          }
        } else {
          console.error('[AccountView] ⚠️ 월별 데이터 조회 실패 (code:', responseCode, '), 샘플 데이터 사용');
          // 에러 발생 시 샘플 데이터 사용
          const sampleData = generateSampleMonthlyData();
          setMonthlyData(sampleData);
          const accountsArray = Object.entries(sampleData.dailyAccounts).map(([date, accounts]) => ({
            date,
            accounts: Array.isArray(accounts) ? accounts : []
          }));
          setDailyAccounts(accountsArray);
        }
      } else {
        console.error('[AccountView] ⚠️ 응답 데이터가 없음, 샘플 데이터 사용');
        // 응답 데이터가 없으면 샘플 데이터 사용
        const sampleData = generateSampleMonthlyData();
        setMonthlyData(sampleData);
        const accountsArray = Object.entries(sampleData.dailyAccounts).map(([date, accounts]) => ({
          date,
          accounts: Array.isArray(accounts) ? accounts : []
        }));
        setDailyAccounts(accountsArray);
      }
    } catch (error) {
      console.error('[AccountView] 월별 데이터 조회 실패:', error, ', 샘플 데이터 사용');
      // 에러 발생 시 샘플 데이터 사용
      const sampleData = generateSampleMonthlyData();
      setMonthlyData(sampleData);
      const accountsArray = Object.entries(sampleData.dailyAccounts).map(([date, accounts]) => ({
        date,
        accounts: Array.isArray(accounts) ? accounts : []
      }));
      setDailyAccounts(accountsArray);
    } finally {
      setLoading(false);
    }
  }, [accountView, monthlySelectedMonth, generateSampleMonthlyData]);

  // 월별 데이터 조회 (useEffect는 항상 최상위에서 호출)
  useEffect(() => {
    if (accountView === 'monthly') {
      // 월이 변경되면 선택된 날짜를 해당 월의 첫 날로 초기화
      const year = monthlySelectedMonth.getFullYear();
      const month = monthlySelectedMonth.getMonth();
      const firstDayOfMonth = new Date(year, month, 1);
      
      // selectedDate가 현재 월에 속하지 않으면 첫 날로 초기화
      if (selectedDate.getFullYear() !== year || selectedDate.getMonth() !== month) {
        setSelectedDate(firstDayOfMonth);
      }
      
      fetchMonthlyData();
    }
  }, [accountView, monthlySelectedMonth, fetchMonthlyData, selectedDate]);

  // Home 뷰
  if (accountView === 'home') {
    return (
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 ${styles.bg}`} style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center py-4">
            <h1 className={`text-3xl font-bold ${styles.title}`}>가계부</h1>
          </div>

          <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
            <h2 className={`text-2xl font-bold mb-4 text-center border-b-2 pb-3 ${styles.title} ${styles.border}`}>
              📊 종합 지출 분석
            </h2>
            <div className={`leading-relaxed text-sm ${styles.title}`}>
              <p className={`text-center py-4 ${styles.textMuted}`}>
                {transactions.length === 0 
                  ? '아직 기록된 지출 내역이 없습니다. 첫 지출을 기록해보세요!'
                  : `총 ${transactions.length}개의 거래 내역이 기록되었습니다.`}
              </p>
            </div>
          </div>

          <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.cardGradient}`}>
            <h1 className={`text-2xl font-bold mb-6 ${styles.title}`}>💰 안녕하세요, Aiion님</h1>
            <div className="grid grid-cols-2 gap-6">
              <Button
                onClick={() => setAccountView('data')}
                className={`rounded-2xl border-2 p-8 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📊</span>
                  <p className={`text-xl font-bold ${styles.title}`}>데이터 관리</p>
                </div>
              </Button>
              <Button
                onClick={() => setAccountView('daily')}
                className={`rounded-2xl border-2 p-8 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📂</span>
                  <p className={`text-xl font-bold ${styles.title}`}>항목별 지출</p>
                </div>
              </Button>
              <Button
                onClick={() => setAccountView('monthly')}
                className={`rounded-2xl border-2 p-8 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">📈</span>
                  <p className={`text-xl font-bold ${styles.title}`}>월별 지출</p>
                </div>
              </Button>
              <Button
                onClick={() => setAccountView('income')}
                className={`rounded-2xl border-2 p-8 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
              >
                <div className="flex flex-col items-center space-y-3">
                  <span className="text-4xl">💵</span>
                  <p className={`text-xl font-bold ${styles.title}`}>수익 관리</p>
                </div>
              </Button>
            </div>
            <Button
              onClick={() => setAccountView('tax')}
              className={`w-full mt-6 rounded-2xl border-2 p-6 hover:shadow-lg hover:scale-105 transition-all ${styles.button}`}
            >
              <div className="flex flex-col items-center space-y-2">
                <span className="text-3xl">📋</span>
                <p className={`text-lg font-bold ${styles.title}`}>세금 관리</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Data 뷰
  if (accountView === 'data') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setAccountView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>데이터 관리</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              {transactions.length === 0 ? (
                <p className={`text-center py-8 ${styles.textMuted}`}>거래 내역이 없습니다.</p>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className={`border-b pb-4 ${styles.border}`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`font-bold ${styles.title}`}>{transaction.title}</p>
                          <p className={`text-sm ${styles.textMuted}`}>{transaction.date}</p>
                        </div>
                        <p className={`text-lg font-bold ${styles.title}`}>
                          {transaction.totalAmount.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Daily 뷰 (항목별 지출)
  if (accountView === 'daily') {
    // 항목별로 그룹화된 데이터 (예시)
    const categoryGroups: { [key: string]: Transaction[] } = {};
    transactions.forEach((transaction) => {
      // Transaction에 category가 있다고 가정 (실제 데이터 구조에 맞게 수정 필요)
      const category = (transaction as any).category || '기타';
      if (!categoryGroups[category]) {
        categoryGroups[category] = [];
      }
      categoryGroups[category].push(transaction);
    });

    const categories = Object.keys(categoryGroups);

    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setAccountView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>항목별 지출</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            {categories.length === 0 ? (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>항목별 지출 내역이 없습니다.</p>
              </div>
            ) : (
              categories.map((category) => {
                const categoryTransactions = categoryGroups[category];
                const categoryTotal = categoryTransactions.reduce((sum, t) => sum + t.totalAmount, 0);
                
                return (
                  <div key={category} className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                    <div className={`flex justify-between items-center mb-4 pb-3 border-b-2 ${styles.border}`}>
                      <h2 className={`text-xl font-bold ${styles.title}`}>{category}</h2>
                      <p className={`text-lg font-bold ${styles.title}`}>
                        {categoryTotal.toLocaleString()}원
                      </p>
                    </div>
                    <div className="space-y-3">
                      {categoryTransactions.map((transaction) => (
                        <div key={transaction.id} className={`flex justify-between items-center py-2 border-b ${styles.border}`}>
                          <div className="flex-1">
                            <p className={`font-semibold ${styles.title}`}>{transaction.title}</p>
                            <p className={`text-sm ${styles.textMuted}`}>{transaction.date}</p>
                          </div>
                          <p className={`text-base font-bold ${styles.title}`}>
                            {transaction.totalAmount.toLocaleString()}원
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // Monthly 뷰
  if (accountView === 'monthly') {

    // 선택한 날짜의 계정 데이터
    const selectedDateStr = getLocalDateStr(selectedDate);
    
    // monthlyData가 없어도 캘린더는 표시
    const dailyAccountsObj = monthlyData?.dailyAccounts || {};
    
    // 날짜별 계정 데이터 찾기 (여러 방법 시도)
    let selectedDayAccounts: any[] = [];
    
    // 날짜 형식 정규화 (YYYY-MM-DD)
    const normalizedDateStr = selectedDateStr;
    
    console.log('[AccountView] ========== 날짜별 데이터 검색 ==========');
    console.log('[AccountView] 선택한 날짜:', normalizedDateStr);
    console.log('[AccountView] monthlyData 존재:', !!monthlyData);
    console.log('[AccountView] dailyAccountsObj:', dailyAccountsObj);
    console.log('[AccountView] dailyAccountsObj 타입:', typeof dailyAccountsObj);
    console.log('[AccountView] dailyAccountsObj 키들:', Object.keys(dailyAccountsObj));
    
    // 방법 1: dailyAccounts 객체에서 직접 접근
    if (dailyAccountsObj && typeof dailyAccountsObj === 'object') {
      const directAccess = dailyAccountsObj[normalizedDateStr];
      console.log('[AccountView] 방법1 - 직접 접근 결과:', directAccess);
      
      if (directAccess) {
        if (Array.isArray(directAccess)) {
          selectedDayAccounts = directAccess;
          console.log('[AccountView] 방법1 성공 - 배열로 찾음:', selectedDayAccounts.length, '개');
        } else if (typeof directAccess === 'object') {
          // 객체인 경우 배열로 변환 시도
          selectedDayAccounts = Object.values(directAccess).flat();
          console.log('[AccountView] 방법1 성공 - 객체를 배열로 변환:', selectedDayAccounts.length, '개');
        }
      }
    }
    
    // 방법 2: dailyAccounts 배열에서 찾기
    if (selectedDayAccounts.length === 0 && dailyAccounts.length > 0) {
      console.log('[AccountView] 방법2 시도 - dailyAccounts 배열 검색');
      const found = dailyAccounts.find(d => {
        const dateMatch = d.date === normalizedDateStr || d.date === selectedDateStr;
        console.log(`[AccountView] 날짜 비교: "${d.date}" === "${normalizedDateStr}" = ${dateMatch}`);
        return dateMatch;
      });
      
      if (found) {
        selectedDayAccounts = Array.isArray(found.accounts) ? found.accounts : [];
        console.log('[AccountView] 방법2 성공 - 배열에서 찾음:', selectedDayAccounts.length, '개');
      }
    }
    
    // 방법 3: 모든 dailyAccountsObj의 키를 순회하며 날짜 매칭
    if (selectedDayAccounts.length === 0 && dailyAccountsObj && typeof dailyAccountsObj === 'object') {
      console.log('[AccountView] 방법3 시도 - 모든 키 순회');
      console.log('[AccountView] 검색할 날짜:', normalizedDateStr, '또는', selectedDateStr);
      console.log('[AccountView] 사용 가능한 키들:', Object.keys(dailyAccountsObj));
      
      for (const [dateKey, accounts] of Object.entries(dailyAccountsObj)) {
        // 날짜 형식 정규화 비교 (여러 형식 시도)
        const normalizedKey = dateKey.trim();
        const keyWithoutTime = normalizedKey.split('T')[0].split(' ')[0]; // 시간 부분 제거
        
        // 여러 형식으로 비교
        if (normalizedKey === normalizedDateStr || 
            normalizedKey === selectedDateStr ||
            keyWithoutTime === normalizedDateStr ||
            keyWithoutTime === selectedDateStr ||
            dateKey === normalizedDateStr ||
            dateKey === selectedDateStr ||
            normalizedKey.startsWith(normalizedDateStr) ||
            normalizedKey.startsWith(selectedDateStr)) {
          if (Array.isArray(accounts)) {
            selectedDayAccounts = accounts;
            console.log('[AccountView] 방법3 성공 - 키 순회로 찾음:', selectedDayAccounts.length, '개, 매칭된 키:', dateKey);
            break;
          } else if (accounts && typeof accounts === 'object') {
            // 객체인 경우 배열로 변환
            selectedDayAccounts = Object.values(accounts).flat();
            console.log('[AccountView] 방법3 성공 - 객체를 배열로 변환:', selectedDayAccounts.length, '개, 키:', dateKey);
            break;
          }
        }
      }
      
      // 여전히 못 찾았으면 부분 매칭 시도
      if (selectedDayAccounts.length === 0) {
        for (const [dateKey, accounts] of Object.entries(dailyAccountsObj)) {
          const keyWithoutTime = dateKey.split('T')[0].split(' ')[0].trim();
          if (keyWithoutTime === normalizedDateStr || keyWithoutTime === selectedDateStr ||
              dateKey.includes(normalizedDateStr) || dateKey.includes(selectedDateStr)) {
            if (Array.isArray(accounts)) {
              selectedDayAccounts = accounts;
              console.log('[AccountView] 방법3-2 성공 - 부분 매칭으로 찾음:', selectedDayAccounts.length, '개, 키:', dateKey);
              break;
            } else if (accounts && typeof accounts === 'object') {
              selectedDayAccounts = Object.values(accounts).flat();
              console.log('[AccountView] 방법3-2 성공 - 객체를 배열로 변환:', selectedDayAccounts.length, '개, 키:', dateKey);
              break;
            }
          }
        }
      }
    }
    
    console.log('[AccountView] 최종 선택된 계정 데이터:', selectedDayAccounts);
    console.log('[AccountView] 계정 데이터 개수:', selectedDayAccounts.length);
    
    // 데이터 샘플 출력 (처음 1개만)
    if (selectedDayAccounts.length > 0) {
      const sample = selectedDayAccounts[0];
      console.log('[AccountView] 데이터 샘플:', {
        transactionDate: sample.transactionDate,
        transactionTime: sample.transactionTime,
        type: sample.type,
        amount: sample.amount,
        paymentMethod: sample.paymentMethod,
        location: sample.location
      });
    }
    
    // dailyTotals에서 날짜로 찾기 (객체 형태)
    const dailyTotals = monthlyData?.dailyTotals || {};
    // 모든 키를 순회하며 날짜 매칭 시도
    let selectedDayTotals = { income: 0, expense: 0 };
    
    // 정확한 매칭 시도
    if (dailyTotals[normalizedDateStr]) {
      selectedDayTotals = { 
        income: dailyTotals[normalizedDateStr].income || 0, 
        expense: dailyTotals[normalizedDateStr].expense || 0 
      };
    } else if (dailyTotals[selectedDateStr]) {
      selectedDayTotals = { 
        income: dailyTotals[selectedDateStr].income || 0, 
        expense: dailyTotals[selectedDateStr].expense || 0 
      };
    } else {
      // 부분 매칭 시도
      for (const [dateKey, totals] of Object.entries(dailyTotals)) {
        const keyWithoutTime = dateKey.split('T')[0].trim();
        if (keyWithoutTime === normalizedDateStr || keyWithoutTime === selectedDateStr || 
            dateKey.includes(normalizedDateStr) || dateKey.includes(selectedDateStr)) {
          selectedDayTotals = { 
            income: (totals as any).income || 0, 
            expense: (totals as any).expense || 0 
          };
          break;
        }
      }
      
      // 여전히 못 찾았으면 selectedDayAccounts에서 직접 계산
      if (selectedDayTotals.income === 0 && selectedDayTotals.expense === 0 && selectedDayAccounts.length > 0) {
        const income = selectedDayAccounts
          .filter((acc: any) => acc.type === 'INCOME' || acc.type === '수입')
          .reduce((sum: number, acc: any) => sum + (acc.amount || 0), 0);
        const expense = selectedDayAccounts
          .filter((acc: any) => acc.type === 'EXPENSE' || acc.type === '지출')
          .reduce((sum: number, acc: any) => sum + (acc.amount || 0), 0);
        selectedDayTotals = { income, expense };
      }
    }
    
    console.log('[AccountView] 선택한 날짜의 총계:', selectedDayTotals);
    console.log('[AccountView] dailyTotals 키들:', Object.keys(dailyTotals));
    
    // 수입과 지출 분리
    const incomeAccounts = selectedDayAccounts.filter((acc: any) => {
      if (!acc) return false;
      const type = acc.type || '';
      const isIncome = type.toUpperCase() === 'INCOME' || type === '수입';
      return isIncome;
    });
    const expenseAccounts = selectedDayAccounts.filter((acc: any) => {
      if (!acc) return false;
      const type = acc.type || '';
      const isExpense = type.toUpperCase() === 'EXPENSE' || type === '지출';
      return isExpense;
    });
    
    console.log('[AccountView] 수입 계정:', incomeAccounts.length, '개');
    console.log('[AccountView] 지출 계정:', expenseAccounts.length, '개');
    console.log('[AccountView] ==========================================');

    // 캘린더 그리드 생성
    const year = monthlySelectedMonth.getFullYear();
    const month = monthlySelectedMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setAccountView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>월별 지출</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-6xl mx-auto space-y-4">
            {/* 월별 통계와 알람 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 월별 통계 */}
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <div className={`mb-4 pb-3 border-b-2 ${styles.border}`}>
                  <h2 className={`text-xl font-bold ${styles.title} mb-3`}>
                    {year}년 {month + 1}월 통계
                  </h2>
                  {loading ? (
                    <p className={`text-sm ${styles.textMuted}`}>로딩 중...</p>
                  ) : monthlyData ? (
                    <div className="flex gap-4">
                      <div className="text-right flex-1">
                        <p className={`text-sm ${styles.textMuted}`}>수입</p>
                        <p className={`text-lg font-bold text-green-500`}>
                          {monthlyData.monthlyTotal?.income?.toLocaleString() || 0}원
                        </p>
                      </div>
                      <div className="text-right flex-1">
                        <p className={`text-sm ${styles.textMuted}`}>지출</p>
                        <p className={`text-lg font-bold text-red-500`}>
                          {monthlyData.monthlyTotal?.expense?.toLocaleString() || 0}원
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-sm ${styles.textMuted}`}>데이터 없음</p>
                  )}
                </div>
              </div>

              {/* 알람 목록 */}
              <AccountAlarmList darkMode={darkMode} />
            </div>

            {/* 캘린더 - CalendarView 구조 참고 */}
            <div className={`rounded-2xl border-2 shadow-lg p-6 ${
              darkMode ? 'bg-[#121212] border-[#2a2a2a]' : 'bg-white border-[#8B7355]'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() =>
                    setMonthlySelectedMonth(new Date(year, month - 1, 1))
                  }
                  className={`px-4 py-2 text-2xl rounded-lg transition-colors ${
                    darkMode 
                      ? 'text-gray-300 hover:bg-[#1a1a1a]' 
                      : 'text-gray-700 hover:bg-[#f5f1e8]'
                  }`}
                >
                  ←
                </button>
                <div className="text-center">
                  <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>📅 가계부 캘린더</h2>
                  <p className={`text-lg mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {year}년 {month + 1}월
                  </p>
                </div>
                <button
                  onClick={() =>
                    setMonthlySelectedMonth(new Date(year, month + 1, 1))
                  }
                  className={`px-4 py-2 text-2xl rounded-lg transition-colors ${
                    darkMode 
                      ? 'text-gray-300 hover:bg-[#1a1a1a]' 
                      : 'text-gray-700 hover:bg-[#f5f1e8]'
                  }`}
                >
                  →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                  <div key={day} className={`text-center text-base font-bold py-3 ${
                    day === '일' ? 'text-red-500' : darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>
                ))}
                {Array.from({ length: startDayOfWeek }).map((_, index) => (
                  <div key={`empty-${index}`} className="p-4"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const date = new Date(year, month, day);
                  const dateStr = getLocalDateStr(date);
                  const todayStr = getLocalDateStr(new Date());
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === getLocalDateStr(selectedDate);
                  const dayData = monthlyData?.dailyTotals?.[dateStr];
                  const hasAccounts = dayData && (dayData.income > 0 || dayData.expense > 0);
                  const dayOfWeek = date.getDay();

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`p-4 rounded-lg text-base font-medium transition-all min-h-[60px] flex flex-col items-center justify-center relative ${
                        isSelected
                          ? darkMode
                            ? 'bg-[#1a1a1a] text-white scale-105'
                            : 'bg-[#8B7355] text-white scale-105'
                          : isToday
                          ? darkMode
                            ? 'bg-[#1a1a1a] text-white font-bold ring-2 ring-[#333333]'
                            : 'bg-[#d4cdc0] text-gray-900 font-bold ring-2 ring-[#8B7355]'
                          : darkMode
                          ? 'hover:bg-[#1a1a1a] text-gray-300'
                          : 'hover:bg-[#f5f1e8] text-gray-700'
                      } ${dayOfWeek === 0 && !isSelected ? 'text-red-500' : ''}`}
                    >
                      <span className={isSelected ? 'text-white' : ''}>{day}</span>
                      {hasAccounts && (
                        <div className="flex gap-1 mt-1">
                          {dayData.income > 0 && (
                            <span className="w-2 h-2 bg-green-500 rounded-full" title={`수입: ${dayData.income.toLocaleString()}원`}></span>
                          )}
                          {dayData.expense > 0 && (
                            <span className="w-2 h-2 bg-red-500 rounded-full" title={`지출: ${dayData.expense.toLocaleString()}원`}></span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 선택한 날짜의 상세 내역 */}
            <div className={`rounded-2xl border-2 shadow-lg p-6 ${styles.card}`}>
              <h3 className={`text-xl font-bold mb-4 pb-3 border-b-2 ${styles.border}`}>
                📋 {selectedDate.getFullYear()}/{String(selectedDate.getMonth() + 1).padStart(2, '0')}/{String(selectedDate.getDate()).padStart(2, '0')}일 상세 내역
              </h3>
              
              {loading ? (
                <p className={`text-center py-8 ${styles.textMuted}`}>로딩 중...</p>
              ) : !monthlyData ? (
                <p className={`text-center py-8 ${styles.textMuted}`}>데이터를 불러오는 중입니다...</p>
              ) : selectedDayAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className={`${styles.textMuted} mb-2`}>해당 날짜의 거래 내역이 없습니다.</p>
                  <p className={`text-xs ${styles.textMuted}`}>
                    날짜: {selectedDateStr} | 
                    사용 가능한 날짜: {Object.keys(dailyAccountsObj).length > 0 ? Object.keys(dailyAccountsObj).join(', ') : '없음'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 날짜별 요약 */}
                  <div className={`p-4 rounded-lg ${styles.cardBg}`}>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className={`text-sm mb-1 ${styles.textMuted}`}>수입</p>
                        <p className={`text-lg font-bold text-green-500`}>
                          {selectedDayTotals.income.toLocaleString()}원
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm mb-1 ${styles.textMuted}`}>지출</p>
                        <p className={`text-lg font-bold text-red-500`}>
                          {selectedDayTotals.expense.toLocaleString()}원
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 수입 내역 */}
                  {incomeAccounts.length > 0 && (
                    <div className="space-y-3">
                      <h4 className={`text-lg font-bold ${styles.title} mb-2`}>
                        💰 수입 내역 ({incomeAccounts.length}건)
                      </h4>
                      {incomeAccounts.map((account: any, index: number) => (
                        <div key={`income-${account.id || index}`} className={`flex justify-between items-center py-3 px-4 border-b ${styles.border} bg-green-50 dark:bg-green-900/20 rounded-lg mb-2`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 font-semibold">
                                {account.type || 'INCOME'}
                              </span>
                              {account.paymentMethod && (
                                <span className={`text-xs px-2 py-1 rounded ${styles.cardBg} ${styles.textMuted} font-medium`}>
                                  💳 {account.paymentMethod}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className={`text-sm ${styles.title} font-medium`}>
                                📅 {account.transactionDate || '날짜 없음'}
                              </p>
                              {account.transactionTime && (
                                <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                  🕐 {account.transactionTime}
                                </p>
                              )}
                              {account.location && account.location.trim() !== '' && (
                                <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                  📍 {account.location}
                                </p>
                              )}
                              {account.category && (
                                <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                  🏷️ {account.category}
                                </p>
                              )}
                              {account.description && account.description.trim() !== '' && (
                                <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                  📝 {account.description}
                                </p>
                              )}
                              {/* 메모 표시/입력 */}
                              <div className="mt-2">
                                {editingMemo[`income-${account.id}`] !== undefined ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editingMemo[`income-${account.id}`] || account.memo || ''}
                                      onChange={(e) => setEditingMemo({ ...editingMemo, [`income-${account.id}`]: e.target.value })}
                                      placeholder="메모를 입력하세요"
                                      className={`flex-1 text-xs px-2 py-1 rounded border ${styles.border} ${styles.cardBg} ${styles.title}`}
                                    />
                                    <button
                                      onClick={async () => {
                                        const memo = editingMemo[`income-${account.id}`] || '';
                                        try {
                                          console.log('[AccountView] 메모 저장 시도:', { accountId: account.id, content: memo });
                                          const response = await fetchJSONFromGateway<{ code: number; message: string; data: any }>(
                                            `/account/memos`,
                                            {},
                                            {
                                              method: 'POST',
                                              body: JSON.stringify({ 
                                                accountId: account.id,
                                                content: memo
                                              })
                                            }
                                          );
                                          console.log('[AccountView] 메모 저장 응답:', response);
                                          if (response.data && response.data.code === 200) {
                                            alert('메모가 저장되었습니다.');
                                            const updated = { ...editingMemo };
                                            delete updated[`income-${account.id}`];
                                            setEditingMemo(updated);
                                            // 데이터 새로고침
                                            fetchMonthlyData();
                                          } else {
                                            alert(`메모 저장 실패: ${response.data?.message || '알 수 없는 오류'}`);
                                            console.error('[AccountView] 메모 저장 실패:', response.data);
                                          }
                                        } catch (error) {
                                          console.error('[AccountView] 메모 저장 실패:', error);
                                          alert(`메모 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
                                        }
                                      }}
                                      className={`text-xs px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 ${styles.buttonHover}`}
                                    >
                                      저장
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                      📌 {account.memo || '메모 없음'}
                                    </p>
                                    <button
                                      onClick={() => setEditingMemo({ ...editingMemo, [`income-${account.id}`]: account.memo || '' })}
                                      className={`text-xs px-2 py-1 rounded ${styles.buttonHover}`}
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                )}
                                {/* 알람 설정 */}
                                <div className="mt-1 flex items-center gap-2">
                                  <button
                                    onClick={() => setEditingAlarm({ ...editingAlarm, [`income-${account.id}`]: !editingAlarm[`income-${account.id}`] })}
                                    className={`text-xs px-2 py-1 rounded ${account.alarmEnabled ? 'bg-yellow-500 text-white' : styles.buttonHover}`}
                                  >
                                    🔔 {account.alarmEnabled ? '알람 ON' : '알람 설정'}
                                  </button>
                                  {editingAlarm[`income-${account.id}`] && (
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="date"
                                        value={alarmSettings[`income-${account.id}`]?.date || account.alarmDate || ''}
                                        onChange={(e) => setAlarmSettings({
                                          ...alarmSettings,
                                          [`income-${account.id}`]: {
                                            ...alarmSettings[`income-${account.id}`],
                                            date: e.target.value,
                                            enabled: true
                                          }
                                        })}
                                        className={`text-xs px-2 py-1 rounded border ${styles.border}`}
                                      />
                                      <input
                                        type="time"
                                        value={alarmSettings[`income-${account.id}`]?.time || account.alarmTime || ''}
                                        onChange={(e) => setAlarmSettings({
                                          ...alarmSettings,
                                          [`income-${account.id}`]: {
                                            ...alarmSettings[`income-${account.id}`],
                                            time: e.target.value,
                                            enabled: true
                                          }
                                        })}
                                        className={`text-xs px-2 py-1 rounded border ${styles.border}`}
                                      />
                                      <button
                                        onClick={async () => {
                                          try {
                                            // alarmSettings 상태에서 직접 값 가져오기
                                            const setting = alarmSettings[`income-${account.id}`];
                                            const alarmDate = setting?.date || account.alarmDate || '';
                                            const alarmTime = setting?.time || account.alarmTime || '';
                                            
                                            // 빈 문자열 체크
                                            if (!alarmDate || !alarmTime || alarmDate.trim() === '' || alarmTime.trim() === '') {
                                              alert('날짜와 시간을 모두 입력해주세요.');
                                              return;
                                            }
                                            
                                            console.log('[AccountView] 알람 저장 시도:', {
                                              accountId: account.id,
                                              alarmDate,
                                              alarmTime,
                                              setting
                                            });
                                            
                                            const response = await fetchJSONFromGateway<{ code: number; message: string; data: any }>(
                                              `/account/alerts`,
                                              {},
                                              {
                                                method: 'POST',
                                                body: JSON.stringify({
                                                  accountId: account.id,
                                                  alarmEnabled: true,
                                                  alarmDate: alarmDate,
                                                  alarmTime: alarmTime
                                                })
                                              }
                                            );
                                            
                                            console.log('[AccountView] 알람 저장 응답:', response);
                                            
                                            if (response.data && response.data.code === 200) {
                                              alert('알람이 설정되었습니다.');
                                              const updated = { ...editingAlarm };
                                              delete updated[`income-${account.id}`];
                                              setEditingAlarm(updated);
                                              // alarmSettings도 초기화
                                              const updatedSettings = { ...alarmSettings };
                                              delete updatedSettings[`income-${account.id}`];
                                              setAlarmSettings(updatedSettings);
                                              // 데이터 새로고침
                                              fetchMonthlyData();
                                            } else {
                                              const errorMsg = response.data?.message || '알 수 없는 오류';
                                              alert(`알람 설정 실패: ${errorMsg}`);
                                              console.error('[AccountView] 알람 설정 실패 상세:', {
                                                response: response.data,
                                                request: { accountId: account.id, alarmDate, alarmTime }
                                              });
                                            }
                                          } catch (error) {
                                            console.error('[AccountView] 알람 설정 실패:', error);
                                            alert(`알람 설정 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
                                          }
                                        }}
                                        className={`text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600`}
                                      >
                                        저장
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0 text-right">
                            <p className="text-lg font-bold text-green-500 whitespace-nowrap">
                              +{account.amount?.toLocaleString() || 0}원
                            </p>
                            {account.incomeSource && (
                              <p className={`text-xs ${styles.textMuted} mt-1`}>
                                {account.incomeSource}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 지출 내역 */}
                  {expenseAccounts.length > 0 && (
                    <div className="space-y-3">
                      <h4 className={`text-lg font-bold ${styles.title} mb-2`}>
                        💸 지출 내역 ({expenseAccounts.length}건)
                      </h4>
                      {expenseAccounts.map((account: any, index: number) => (
                        <div key={`expense-${account.id || index}`} className={`flex justify-between items-center py-3 px-4 border-b ${styles.border} bg-red-50 dark:bg-red-900/20 rounded-lg mb-2`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 font-semibold">
                                {account.type || 'EXPENSE'}
                              </span>
                              {account.paymentMethod && (
                                <span className={`text-xs px-2 py-1 rounded ${styles.cardBg} ${styles.textMuted} font-medium`}>
                                  💳 {account.paymentMethod}
                                </span>
                              )}
                              {account.category && (
                                <span className={`text-xs px-2 py-1 rounded ${styles.cardBg} ${styles.textMuted} font-medium`}>
                                  🏷️ {account.category}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className={`text-sm ${styles.title} font-medium`}>
                                📅 {account.transactionDate || '날짜 없음'}
                              </p>
                              {account.transactionTime && (
                                <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                  🕐 {account.transactionTime}
                                </p>
                              )}
                              {account.location && account.location.trim() !== '' && (
                                <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                  📍 {account.location}
                                </p>
                              )}
                              {account.description && account.description.trim() !== '' && (
                                <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                  📝 {account.description}
                                </p>
                              )}
                              {account.vatAmount && account.vatAmount > 0 && (
                                <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                  💰 부가세: {account.vatAmount.toLocaleString()}원
                                </p>
                              )}
                              {/* 메모 표시/입력 */}
                              <div className="mt-2">
                                {editingMemo[`expense-${account.id}`] !== undefined ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editingMemo[`expense-${account.id}`] || account.memo || ''}
                                      onChange={(e) => setEditingMemo({ ...editingMemo, [`expense-${account.id}`]: e.target.value })}
                                      placeholder="메모를 입력하세요"
                                      className={`flex-1 text-xs px-2 py-1 rounded border ${styles.border} ${styles.cardBg} ${styles.title}`}
                                    />
                                    <button
                                      onClick={async () => {
                                        const memo = editingMemo[`expense-${account.id}`] || '';
                                        try {
                                          console.log('[AccountView] 메모 저장 시도:', { accountId: account.id, content: memo });
                                          const response = await fetchJSONFromGateway<{ code: number; message: string; data: any }>(
                                            `/account/memos`,
                                            {},
                                            {
                                              method: 'POST',
                                              body: JSON.stringify({ 
                                                accountId: account.id,
                                                content: memo
                                              })
                                            }
                                          );
                                          console.log('[AccountView] 메모 저장 응답:', response);
                                          if (response.data && response.data.code === 200) {
                                            alert('메모가 저장되었습니다.');
                                            const updated = { ...editingMemo };
                                            delete updated[`expense-${account.id}`];
                                            setEditingMemo(updated);
                                            fetchMonthlyData();
                                          } else {
                                            alert(`메모 저장 실패: ${response.data?.message || '알 수 없는 오류'}`);
                                            console.error('[AccountView] 메모 저장 실패:', response.data);
                                          }
                                        } catch (error) {
                                          console.error('[AccountView] 메모 저장 실패:', error);
                                          alert(`메모 저장 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
                                        }
                                      }}
                                      className={`text-xs px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 ${styles.buttonHover}`}
                                    >
                                      저장
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <p className={`text-xs ${styles.textMuted} flex items-center gap-1`}>
                                      📌 {account.memo || '메모 없음'}
                                    </p>
                                    <button
                                      onClick={() => setEditingMemo({ ...editingMemo, [`expense-${account.id}`]: account.memo || '' })}
                                      className={`text-xs px-2 py-1 rounded ${styles.buttonHover}`}
                                    >
                                      ✏️
                                    </button>
                                  </div>
                                )}
                                {/* 알람 설정 */}
                                <div className="mt-1 flex items-center gap-2">
                                  <button
                                    onClick={() => setEditingAlarm({ ...editingAlarm, [`expense-${account.id}`]: !editingAlarm[`expense-${account.id}`] })}
                                    className={`text-xs px-2 py-1 rounded ${account.alarmEnabled ? 'bg-yellow-500 text-white' : styles.buttonHover}`}
                                  >
                                    🔔 {account.alarmEnabled ? '알람 ON' : '알람 설정'}
                                  </button>
                                  {editingAlarm[`expense-${account.id}`] && (
                                    <div className="flex gap-2 items-center">
                                      <input
                                        type="date"
                                        value={alarmSettings[`expense-${account.id}`]?.date || account.alarmDate || ''}
                                        onChange={(e) => setAlarmSettings({
                                          ...alarmSettings,
                                          [`expense-${account.id}`]: {
                                            ...alarmSettings[`expense-${account.id}`],
                                            date: e.target.value,
                                            enabled: true
                                          }
                                        })}
                                        className={`text-xs px-2 py-1 rounded border ${styles.border}`}
                                      />
                                      <input
                                        type="time"
                                        value={alarmSettings[`expense-${account.id}`]?.time || account.alarmTime || ''}
                                        onChange={(e) => setAlarmSettings({
                                          ...alarmSettings,
                                          [`expense-${account.id}`]: {
                                            ...alarmSettings[`expense-${account.id}`],
                                            time: e.target.value,
                                            enabled: true
                                          }
                                        })}
                                        className={`text-xs px-2 py-1 rounded border ${styles.border}`}
                                      />
                                      <button
                                        onClick={async () => {
                                          try {
                                            // alarmSettings 상태에서 직접 값 가져오기
                                            const setting = alarmSettings[`expense-${account.id}`];
                                            const alarmDate = setting?.date || account.alarmDate || '';
                                            const alarmTime = setting?.time || account.alarmTime || '';
                                            
                                            // 빈 문자열 체크
                                            if (!alarmDate || !alarmTime || alarmDate.trim() === '' || alarmTime.trim() === '') {
                                              alert('날짜와 시간을 모두 입력해주세요.');
                                              return;
                                            }
                                            
                                            console.log('[AccountView] 알람 저장 시도:', {
                                              accountId: account.id,
                                              alarmDate,
                                              alarmTime,
                                              setting
                                            });
                                            
                                            const response = await fetchJSONFromGateway<{ code: number; message: string; data: any }>(
                                              `/account/alerts`,
                                              {},
                                              {
                                                method: 'POST',
                                                body: JSON.stringify({
                                                  accountId: account.id,
                                                  alarmEnabled: true,
                                                  alarmDate: alarmDate,
                                                  alarmTime: alarmTime
                                                })
                                              }
                                            );
                                            
                                            console.log('[AccountView] 알람 저장 응답:', response);
                                            
                                            if (response.data && response.data.code === 200) {
                                              alert('알람이 설정되었습니다.');
                                              const updated = { ...editingAlarm };
                                              delete updated[`expense-${account.id}`];
                                              setEditingAlarm(updated);
                                              // alarmSettings도 초기화
                                              const updatedSettings = { ...alarmSettings };
                                              delete updatedSettings[`expense-${account.id}`];
                                              setAlarmSettings(updatedSettings);
                                              // 데이터 새로고침
                                              fetchMonthlyData();
                                            } else {
                                              alert(`알람 설정 실패: ${response.data?.message || '알 수 없는 오류'}`);
                                            }
                                          } catch (error) {
                                            console.error('[AccountView] 알람 설정 실패:', error);
                                            alert('알람 설정 중 오류가 발생했습니다.');
                                          }
                                        }}
                                        className={`text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600`}
                                      >
                                        저장
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0 text-right">
                            <p className="text-lg font-bold text-red-500 whitespace-nowrap">
                              -{account.amount?.toLocaleString() || 0}원
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Income 뷰
  if (accountView === 'income') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setAccountView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>수익 관리</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <div className="space-y-6">
                <div className="text-center">
                  <p className={`text-3xl font-bold mb-2 ${styles.title}`}>0원</p>
                  <p className={styles.textMuted}>이번 달 수익</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`rounded-lg p-4 ${styles.cardBg}`}>
                    <p className={`text-sm mb-1 ${styles.textMuted}`}>저축</p>
                    <p className={`text-xl font-bold ${styles.title}`}>0원</p>
                  </div>
                  <div className={`rounded-lg p-4 ${styles.cardBg}`}>
                    <p className={`text-sm mb-1 ${styles.textMuted}`}>투자</p>
                    <p className={`text-xl font-bold ${styles.title}`}>0원</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tax 뷰
  if (accountView === 'tax') {
    return (
      <div className={`flex-1 flex flex-col ${styles.bg}`}>
        <div className={`border-b shadow-sm p-4 ${styles.header}`}>
          <div className="max-w-4xl mx-auto flex items-center gap-4">
            <button
              onClick={() => setAccountView('home')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${styles.buttonHover}`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className={`text-2xl font-bold ${styles.title}`}>세금 관리</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <p className={`text-center py-8 ${styles.textMuted}`}>세금 정보가 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
