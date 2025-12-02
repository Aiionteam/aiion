import React, { useState } from 'react';
import { Button } from '../atoms';
import { AccountView as AccountViewType, Transaction } from '../types';
import { getLocalDateStr } from '../../lib';

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
  const [transactions] = useState<Transaction[]>([]);
  const [dailySelectedDate, setDailySelectedDate] = useState(new Date());
  const [monthlySelectedMonth, setMonthlySelectedMonth] = useState(new Date());
  const styles = getCommonStyles(darkMode);

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
                  <span className="text-4xl">📅</span>
                  <p className={`text-xl font-bold ${styles.title}`}>날짜별 지출</p>
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

  // Daily 뷰
  if (accountView === 'daily') {
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>날짜별 지출</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <div className="mb-4">
                <p className={`text-lg font-semibold ${styles.textSecondary}`}>
                  {dailySelectedDate.getFullYear()}년 {dailySelectedDate.getMonth() + 1}월 {dailySelectedDate.getDate()}일
                </p>
              </div>
              <p className={`text-center py-8 ${styles.textMuted}`}>해당 날짜의 지출 내역이 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Monthly 뷰
  if (accountView === 'monthly') {
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
            <h1 className={`text-2xl font-bold ${styles.title}`}>월별 지출</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="max-w-4xl mx-auto space-y-4">
            <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
              <div className="mb-4">
                <p className={`text-lg font-semibold ${styles.textSecondary}`}>
                  {monthlySelectedMonth.getFullYear()}년 {monthlySelectedMonth.getMonth() + 1}월
                </p>
              </div>
              <p className={`text-center py-8 ${styles.textMuted}`}>해당 월의 지출 내역이 없습니다.</p>
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
