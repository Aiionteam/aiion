import React, { useState, useEffect, useCallback } from 'react';
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
  const [transactions] = useState<Transaction[]>([]);
  // 백엔드 없이 화면 구성용: CSV 기반 지출 데이터
  type ExpenseRow = {
    date: string; // YYYY-MM-DD
    category: string;
    description: string;
    amount: number;
    ts: number; // 정렬용
  };
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([]);
  const [expenseCsvLoading, setExpenseCsvLoading] = useState(false);
  const [expenseCsvError, setExpenseCsvError] = useState<string | null>(null);
  // (삭제됨) diary_entries.csv 기반 "일기 소비 데이터 파싱" UI/연동은 제거

  type ConsumptionDiaryRow = {
    date: string; // YYYY-MM-DD
    expensesText: string; // 파싱된 소비 내용(표시용)
    inferredCategory: string;
    categorizedItemsText: string; // 항목별 분류 결과(표시용)
    categoryReason: string;
    ts: number;
  };
  const [consumptionDiaryRows, setConsumptionDiaryRows] = useState<ConsumptionDiaryRow[]>([]);
  const [consumptionDiaryLoading, setConsumptionDiaryLoading] = useState(false);
  const [consumptionDiaryError, setConsumptionDiaryError] = useState<string | null>(null);

  // 백엔드 없이 화면 구성용: CSV 기반 수익 데이터
  type RevenueRow = {
    id: string;
    date: string; // YYYY-MM-DD
    currency: string; // KRW, USD ...
    amount: number;
    sourceNote: string;
    allocationPath: string;
    ts: number;
  };
  const [revenueRows, setRevenueRows] = useState<RevenueRow[]>([]);
  const [revenueCsvLoading, setRevenueCsvLoading] = useState(false);
  const [revenueCsvError, setRevenueCsvError] = useState<string | null>(null);
  const [investmentNotes, setInvestmentNotes] = useState<Record<string, string>>({});
  const [savingsNotes, setSavingsNotes] = useState<Record<string, string>>({});
  const [revenueTypeById, setRevenueTypeById] = useState<Record<string, string>>({});
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

  const parseKoreanTimeTo24H = (timeStr: string): string => {
    const t = (timeStr || '').trim();
    if (/^\d{1,2}:\d{2}:\d{2}$/.test(t)) return t; // 이미 24시간제
    const m = t.match(/^(오전|오후)\s*(\d{1,2}):(\d{2}):(\d{2})$/);
    if (!m) return '00:00:00';
    const ampm = m[1];
    let hh = parseInt(m[2], 10);
    const mm = m[3];
    const ss = m[4];
    if (ampm === '오전') {
      if (hh === 12) hh = 0;
    } else {
      if (hh !== 12) hh += 12;
    }
    return `${String(hh).padStart(2, '0')}:${mm}:${ss}`;
  };

  const parseCsvLine = (line: string): string[] => {
    // 간단 CSV 파서(큰따옴표/작은따옴표 지원)
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    let quoteChar: '"' | "'" | null = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (!inQuotes && (ch === '"' || ch === "'")) {
        inQuotes = true;
        quoteChar = ch as any;
        continue;
      }
      if (inQuotes && quoteChar && ch === quoteChar) {
        inQuotes = false;
        quoteChar = null;
        continue;
      }
      if (!inQuotes && ch === ',') {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const parseMmDdYyyyToIso = (mdy: string): string => {
    // 하드코딩된 수익 데이터 사용
    const t = (mdy || '').trim().replace(/^"|"$/g, '');
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return '';
    const mm = String(parseInt(m[1], 10)).padStart(2, '0');
    const dd = String(parseInt(m[2], 10)).padStart(2, '0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseUsDateToIso = (mdy: string): string => {
    // 하드코딩된 소비 일기 데이터 사용
    const t = (mdy || '').trim().replace(/^"|"$/g, '');
    const m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!m) return '';
    const mm = String(parseInt(m[1], 10)).padStart(2, '0');
    const dd = String(parseInt(m[2], 10)).padStart(2, '0');
    const yyyy = m[3];
    return `${yyyy}-${mm}-${dd}`;
  };

  const extractExpensesFromDiaryText = (text: string): string => {
    const t = (text || '').trim();
    if (!t) return '';

    // 1) "(지출: ...)" 패턴 우선
    const m = t.match(/\(지출:\s*([^)]+)\)/);
    if (m?.[1]) {
      return m[1].trim();
    }

    // 2) "지출:" 단독 패턴
    const m2 = t.match(/지출:\s*([^\n\r]+)/);
    if (m2?.[1]) {
      return m2[1].trim();
    }

    // 3) 금액만 있는 문장(예: "가격은 8,500원", "주유 60,000원어치")
    const amounts = Array.from(t.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/g)).map((x) => x[0]);
    if (amounts.length > 0) {
      // 문장 전체를 다 보여주기엔 길어서, 금액 주변 키워드만 간단히
      // (오늘은 화면용이므로 가장 첫 금액만 표시)
      const first = amounts[0];
      // 앞뒤 20자 정도 발췌
      const idx = t.indexOf(first);
      const start = Math.max(0, idx - 20);
      const end = Math.min(t.length, idx + first.length + 20);
      return t.slice(start, end).trim();
    }

    return '';
  };

  const inferCategoryFromExpensesText = (expensesText: string): { category: string; reason: string } => {
    const t = (expensesText || '').toLowerCase();
    if (!t) return { category: '생활용품', reason: '소비 내용이 비어있어 생활용품으로 임시 분류했습니다.' };

    const has = (re: RegExp) => re.test(t);

    // 교통비
    if (has(/통행료|고속도로|주유|기름|택시|버스|지하철|교통카드|대중교통/)) {
      return { category: '교통비', reason: '통행료/주유/대중교통 등 이동 관련 키워드가 포함되어 교통비로 분류했습니다.' };
    }
    // 식비
    if (has(/식사|점심|저녁|브런치|샌드위치|커피|카페|음료|배달|치킨|레스토랑|식재료/)) {
      return { category: '식비', reason: '식사/커피/배달 등 음식 관련 키워드가 포함되어 식비로 분류했습니다.' };
    }
    // 교육비
    if (has(/강의|구독료\s*29|온라인\s*강의|학원|교재|서적|도서|자기계발/)) {
      return { category: '교육비', reason: '강의/도서/자기계발 등 학습 관련 키워드가 포함되어 교육비로 분류했습니다.' };
    }
    // 생활용품
    if (has(/우산|택배|택배비|생활용품|드라이클리닝|수납|사무용품|문구|수리비|용품|장식|드라이/)) {
      return { category: '생활용품', reason: '생활용품/택배/수리/사무용품 등 생활 관련 키워드가 포함되어 생활용품으로 분류했습니다.' };
    }
    // 오락/문화
    if (has(/콘서트|영화|게임|아이템|넷플릭스|티켓|공연/)) {
      return { category: '오락', reason: '콘서트/영화/구독 등 여가/문화 키워드가 포함되어 오락으로 분류했습니다.' };
    }
    // 경조사
    if (has(/경조사|축하|선물|기부/)) {
      return { category: '경조사', reason: '선물/기부/경조사 관련 키워드가 포함되어 경조사로 분류했습니다.' };
    }

    return { category: '생활용품', reason: '명확한 키워드가 없어 생활용품으로 임시 분류했습니다.' };
  };

  const parseExpenseItemsFromDiaryText = (fullText: string): Array<{ name: string; amount: number }> => {
    const t = (fullText || '').trim();
    if (!t) return [];

    // (지출: ...) 우선 파싱
    const m = t.match(/\(지출:\s*([^)]+)\)/);
    const scope = m?.[1] ? m[1] : t;
    const parts = scope.split(',').map((p) => p.trim()).filter(Boolean);

    const items: Array<{ name: string; amount: number }> = [];
    for (const p of parts) {
      // "우산 5,000원", "고속도로 통행료 12,000원", "저녁 식사 20,000원 - 개인 부담금"
      const mm = p.match(/(.+?)\s*(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
      if (mm) {
        const name = mm[1].replace(/[-–—].*$/, '').trim();
        const amount = Number(mm[2].replace(/,/g, '')) || 0;
        if (amount > 0) items.push({ name: name || '지출', amount });
      }
    }

    // (지출: ) 패턴이 없고 items가 비면, 본문에서 금액 1개를 찾아 항목명 추정
    if (!m?.[1] && items.length === 0) {
      const amountMatches = Array.from(t.matchAll(/(\d{1,3}(?:,\d{3})+|\d+)\s*원/g));
      if (amountMatches.length > 0) {
        const amountStr = amountMatches[0][1];
        const amount = Number(amountStr.replace(/,/g, '')) || 0;
        let name = '지출';
        if (t.includes('주유')) name = '주유비';
        else if (t.includes('샌드위치')) name = '샌드위치';
        else if (t.includes('커피')) name = '커피';
        else if (t.includes('서점') || t.includes('책')) name = '도서';
        items.push({ name, amount });
      }
    }

    return items;
  };

  const deriveCategorizedItemsTextFromExpensesText = (expensesText: string): string => {
    const raw = (expensesText || '').trim();
    if (!raw) return '';
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    const categorized: Array<{ category: string; name: string; amount: number }> = [];

    for (const p of parts) {
      const mm = p.match(/(.+?)\s*(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
      if (!mm) continue;
      const name = mm[1].replace(/[-–—].*$/, '').trim();
      const amount = Number(mm[2].replace(/,/g, '')) || 0;
      if (!name || amount <= 0) continue;
      const c = inferCategoryFromExpensesText(name);
      categorized.push({ category: c.category, name, amount });
    }

    if (categorized.length === 0) return '';
    return categorized.map((it) => `${it.category}: ${it.name} ${it.amount.toLocaleString()}원`).join(' / ');
  };

  // 하드코딩된 소비 일기 데이터
  const HARDCODED_CONSUMPTION_DIARY_DATA = [
    { date: '2025-12-04', diaryText: '퇴근길에 갑자기 비가 쏟아졌다. 우산이 없어서 편의점에서 하나 샀는데, 비 오는 날의 운치가 나쁘지 않았다. 따뜻한 커피 한 잔과 함께 하루를 마무리했다. (지출: 우산 5,000원)' },
    { date: '2025-12-06', diaryText: '주말을 맞아 근교로 드라이브를 다녀왔다. 맑은 공기를 마시니 머리가 맑아지는 기분이었다. 맛있는 지역 음식도 먹고 힐링하는 시간을 가졌다. (지출: 고속도로 통행료 12,000원, 점심 식사 35,000원)' },
    { date: '2025-12-09', diaryText: '새로운 외국어 공부를 시작했다. 아직은 서툴지만, 꾸준히 하다 보면 언젠가는 유창하게 말할 수 있을 것이다. 매일 30분씩 투자하기로 했다. (지출: 온라인 강의 구독료 29,900원)' },
    { date: '2025-12-12', diaryText: '동료들과 저녁 식사를 함께 했다. 업무 외적인 이야기를 나누며 친목을 다질 수 있었다. 좋은 사람들과 함께 일하는 것은 큰 행운이다. (지출: 저녁 식사 20,000원 - 개인 부담금)' },
    { date: '2025-12-17', diaryText: '인터넷으로 주문한 물건이 도착했다. 기대했던 것보다 훨씬 마음에 든다. 소소한 행복을 느꼈다. (지출: 택배비 3,000원)' },
    { date: '2025-12-18', diaryText: '오늘 아침에는 유독 차가 막혀서 출근하는게 너무 힘들었다. 하루의 시작인데 벌써 삐걱거리는 느낌이 들어서 불길했지만, 다행히 주유소에 들려서 주유 60,000원어치 하고 갔는데도 지각하지 않아서 기분이 풀렸다.' },
    { date: '2025-12-19', diaryText: '점심시간에 회사 근처 새로 생긴 샌드위치 가게에 가봤다. \'에그마요 샌드위치\'가 맛있다고 해서 먹어봤는데, 정말 부드럽고 든든했다. 가격은 8,500원. 다음에는 다른 메뉴도 시도해봐야겠다.' },
    { date: '2025-12-29', diaryText: '서점에 들러 자기계발서를 한 권 샀다. 새로운 지식을 얻는 것은 언제나 즐거운 일이다. 빨리 읽어보고 싶다.' },
    { date: '2026-01-04', diaryText: '새로 산 옷을 입고 출근했다. 기분 전환이 되는 것 같다. 작은 변화가 큰 활력을 준다.' },
    { date: '2026-01-10', diaryText: '은행 앱으로 가계부를 정리했다. 불필요한 지출을 줄이고 저축을 늘려야겠다고 다짐했다. 재정 관리를 철저히 하자.' },
  ];

  const loadConsumptionDiaryCsv = useCallback(async () => {
    setConsumptionDiaryLoading(true);
    setConsumptionDiaryError(null);
    try {
      // 하드코딩된 데이터 사용
      const rows: ConsumptionDiaryRow[] = HARDCODED_CONSUMPTION_DIARY_DATA
        .map((item, idx) => {
          const dateIso = item.date;
          const diaryText = item.diaryText;
          const expensesText = extractExpensesFromDiaryText(diaryText);
          const items = parseExpenseItemsFromDiaryText(diaryText);
          const categorized =
            items.length > 0
              ? items.map((it) => {
                  const c = inferCategoryFromExpensesText(it.name);
                  return { ...it, category: c.category };
                })
              : [];
          const categorizedItemsText =
            categorized.length > 0
              ? categorized.map((it) => `${it.category}: ${it.name} ${it.amount.toLocaleString()}원`).join(' / ')
              : '';

          // 대표 카테고리: 가장 큰 금액 항목의 카테고리
          const top = categorized.slice().sort((a, b) => (b.amount || 0) - (a.amount || 0))[0];
          const inferred = top?.category
            ? { category: top.category, reason: '가장 큰 금액 항목 기준으로 대표 카테고리를 잡았습니다.' }
            : inferCategoryFromExpensesText(expensesText);
          const ts = dateIso ? new Date(`${dateIso}T00:00:00`).getTime() : idx;
          return {
            date: dateIso,
            expensesText,
            inferredCategory: inferred.category,
            categorizedItemsText,
            categoryReason: inferred.reason,
            ts,
          };
        })
        .filter((r) => !!r.date && !!r.expensesText)
        .sort((a, b) => (a.ts || 0) - (b.ts || 0));

      setConsumptionDiaryRows(rows);
    } catch (e) {
      setConsumptionDiaryRows([]);
      setConsumptionDiaryError(e instanceof Error ? e.message : '데이터 로드 중 오류');
    } finally {
      setConsumptionDiaryLoading(false);
    }
  }, []);

  // (삭제됨) diary_entries.csv 파싱 로직 제거

  // 하드코딩된 지출 데이터
  const HARDCODED_EXPENSE_DATA = [
    { transaction_date: '2025-10-26', transaction_time: '오전 8:30:15', description: '스타벅스 아메리카노', amount: 4500, category: '식비' },
    { transaction_date: '2025-10-26', transaction_time: '오후 12:45:00', description: '회사 근처 식당 점심', amount: 9000, category: '식비' },
    { transaction_date: '2025-10-26', transaction_time: '오후 6:10:30', description: '지하철 이용', amount: 1450, category: '교통' },
    { transaction_date: '2025-10-26', transaction_time: '오후 8:00:00', description: '친구와 저녁 식사', amount: 25000, category: '식비' },
    { transaction_date: '2025-10-27', transaction_time: '오전 9:00:00', description: '택시 이용', amount: 12000, category: '교통' },
    { transaction_date: '2025-10-27', transaction_time: '오후 7:30:00', description: 'CGV 영화 관람', amount: 15000, category: '오락' },
    { transaction_date: '2025-10-28', transaction_time: '오후 2:00:00', description: '온라인 쇼핑 (옷)', amount: 78000, category: '쇼핑' },
    { transaction_date: '2025-10-28', transaction_time: '오후 5:20:00', description: '마트 장보기', amount: 54000, category: '식비' },
    { transaction_date: '2025-10-29', transaction_time: '오전 11:00:00', description: '병원 진료', amount: 8000, category: '건강' },
    { transaction_date: '2025-10-30', transaction_time: '오전 10:00:00', description: '월세 납부', amount: 500000, category: '주거' },
    { transaction_date: '2025-10-30', transaction_time: '오전 10:05:00', description: '관리비 납부', amount: 80000, category: '주거' },
    { transaction_date: '2025-11-01', transaction_time: '오전 12:00:01', description: '넷플릭스 구독료', amount: 17000, category: '구독' },
    { transaction_date: '2025-11-02', transaction_time: '오후 3:00:00', description: '서점 (책 구매)', amount: 32000, category: '교육' },
    { transaction_date: '2025-11-03', transaction_time: '오후 9:00:00', description: '배달 음식 (치킨)', amount: 22000, category: '식비' },
    { transaction_date: '2025-11-04', transaction_time: '오후 1:00:00', description: '편의점 간식', amount: 5500, category: '식비' },
    { transaction_date: '2025-11-05', transaction_time: '오전 9:00:00', description: '주유', amount: 50000, category: '교통' },
    { transaction_date: '2025-11-05', transaction_time: '오후 6:00:00', description: '헬스장 등록', amount: 150000, category: '건강' },
    { transaction_date: '2025-11-05', transaction_time: '오후 8:30:00', description: '친구 선물 구매', amount: 35000, category: '경조사' },
  ];

  const loadExpenseCsv = useCallback(async () => {
    setExpenseCsvLoading(true);
    setExpenseCsvError(null);
    try {
      // 하드코딩된 데이터 사용
      const rows: ExpenseRow[] = HARDCODED_EXPENSE_DATA.map((item) => {
        const transactionDate = item.transaction_date;
        const transactionTime = item.transaction_time;
        const description = item.description;
        const amount = item.amount;
        const category = item.category;
        const time24 = parseKoreanTimeTo24H(transactionTime);
        const ts = new Date(`${transactionDate}T${time24}`).getTime();
        return {
          date: transactionDate,
          category,
          description,
          amount,
          ts: isNaN(ts) ? 0 : ts,
        };
      });
      setExpenseRows(rows);
    } catch (e) {
      setExpenseRows([]);
      setExpenseCsvError(e instanceof Error ? e.message : '데이터 로드 중 오류');
    } finally {
      setExpenseCsvLoading(false);
    }
  }, []);

  // 항목별 지출/홈 화면 진입 시 하드코딩된 지출 데이터 로드(백엔드 없이 화면 구성용)
  useEffect(() => {
    if (accountView !== 'daily' && accountView !== 'home') return;
    if (expenseRows.length > 0) return;
    void loadExpenseCsv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountView]);

  // (삭제됨) diary_entries.csv 자동 로드 제거

  // 데이터관리 진입 시 하드코딩된 소비 일기 데이터 로드
  useEffect(() => {
    if (accountView !== 'data') return;
    if (consumptionDiaryRows.length > 0) return;
    void loadConsumptionDiaryCsv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountView]);

  // 하드코딩된 수익 데이터
  const HARDCODED_REVENUE_DATA = [
    { id: '1', date: '2025-10-26', amount: 150, currency: 'USD', sourceNote: '해외 플랫폼 광고 수익 (10월분 정산)', allocationPath: '50% 미국주식_A, 50% 원화계좌_저축' },
    { id: '2', date: '2025-10-28', amount: 550000, currency: 'KRW', sourceNote: '국내 프리랜서 프로젝트 완료 수수료', allocationPath: '70% 정기예금, 30% 생활비' },
    { id: '3', date: '2025-10-30', amount: 85.5, currency: 'USD', sourceNote: '기존 투자 포트폴리오 배당금', allocationPath: '100% 미국주식_B (재투자)' },
    { id: '4', date: '2025-11-01', amount: 120000, currency: 'KRW', sourceNote: '블로그 제휴 마케팅 수익', allocationPath: '100% 국내주식_C' },
    { id: '5', date: '2025-11-03', amount: 250, currency: 'USD', sourceNote: '컨설팅 서비스 계약금', allocationPath: '80% 달러예금, 20% 원화계좌_저축' },
    { id: '6', date: '2025-11-05', amount: 320000, currency: 'KRW', sourceNote: '소액 주식 매도 차익', allocationPath: '100% 국내주식_D' },
  ];

  const loadRevenueCsv = useCallback(async () => {
    setRevenueCsvLoading(true);
    setRevenueCsvError(null);
    try {
      // 하드코딩된 데이터 사용
      const rows: RevenueRow[] = HARDCODED_REVENUE_DATA.map((item) => {
        const dateIso = item.date;
        const ts = dateIso ? new Date(`${dateIso}T00:00:00`).getTime() : 0;
        return {
          id: item.id,
          date: dateIso,
          currency: item.currency,
          amount: item.amount,
          sourceNote: item.sourceNote,
          allocationPath: item.allocationPath,
          ts,
        } satisfies RevenueRow;
      }).filter((r) => !!r.date && r.amount > 0);

      setRevenueRows(rows);
    } catch (e) {
      setRevenueRows([]);
      setRevenueCsvError(e instanceof Error ? e.message : '데이터 로드 중 오류');
    } finally {
      setRevenueCsvLoading(false);
    }
  }, []);

  // 수익/세금/홈 화면 진입 시 하드코딩된 수익 데이터 로드
  useEffect(() => {
    if (accountView !== 'income' && accountView !== 'tax' && accountView !== 'home') return;
    if (revenueRows.length > 0) return;
    void loadRevenueCsv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountView]);

  const isSavingsOrInvestment = (label: string): boolean => {
    const s = (label || '').toLowerCase();
    // 키워드 기반(오늘은 화면용이므로 단순 분류)
    const keywords = [
      '저축', '적금', '예금', '정기예금', '달러예금',
      '투자', '재투자', '주식', 'etf', '펀드', '채권',
      '미국주식', '국내주식',
      'savings', 'invest',
    ];
    return keywords.some((k) => s.includes(k.toLowerCase()));
  };

  const isSavingsLabel = (label: string): boolean => {
    const s = (label || '').toLowerCase();
    const keywords = ['저축', '적금', '예금', '정기예금', '달러예금', '원화계좌_저축', 'savings'];
    return keywords.some((k) => s.includes(k.toLowerCase()));
  };

  const isInvestmentLabel = (label: string): boolean => {
    const s = (label || '').toLowerCase();
    const keywords = ['투자', '재투자', '주식', 'etf', '펀드', '채권', '미국주식', '국내주식', 'invest'];
    return keywords.some((k) => s.includes(k.toLowerCase()));
  };

  const parseAllocationSavingsInvestmentPercent = (
    allocationPath: string
  ): { savingsPct: number; investPct: number } => {
    // 예: "70% 정기예금, 30% 생활비"
    // 예: "100% 미국주식_B (재투자)"
    const raw = (allocationPath || '').trim();
    if (!raw) return { savingsPct: 0, investPct: 0 };
    const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
    let foundAnyPercent = false;
    let savingsPct = 0;
    let investPct = 0;

    for (const p of parts) {
      const m = p.match(/(\d+(?:\.\d+)?)\s*%/);
      if (m) {
        foundAnyPercent = true;
        const pct = parseFloat(m[1]);
        const label = p.replace(m[0], '').trim();
        if (isSavingsLabel(label)) savingsPct += pct;
        if (isInvestmentLabel(label)) investPct += pct;
      } else {
        // 퍼센트가 없는 경우: 라벨이 저축/투자면 100%로 간주(단, 다른 퍼센트 파트가 있으면 무시)
        if (isSavingsLabel(p)) savingsPct += 100;
        if (isInvestmentLabel(p)) investPct += 100;
      }
    }

    // 퍼센트가 있는 파트가 하나라도 있으면, 퍼센트 없는 100% 가정은 무시(과대계산 방지)
    if (foundAnyPercent) {
      savingsPct = 0;
      investPct = 0;
      for (const p of parts) {
        const m = p.match(/(\d+(?:\.\d+)?)\s*%/);
        if (!m) continue;
        const pct = parseFloat(m[1]);
        const label = p.replace(m[0], '').trim();
        if (isSavingsLabel(label)) savingsPct += pct;
        if (isInvestmentLabel(label)) investPct += pct;
      }
    }

    return {
      savingsPct: Math.max(0, Math.min(100, savingsPct)),
      investPct: Math.max(0, Math.min(100, investPct)),
    };
  };

  const investmentNoteKey = (year: number, month: number, currency: string) =>
    `aiion_investment_note_${year}-${String(month).padStart(2, '0')}_${currency}`;

  const savingsNoteKey = (year: number, month: number, currency: string) =>
    `aiion_savings_note_${year}-${String(month).padStart(2, '0')}_${currency}`;

  const revenueTypeKey = (id: string) => `aiion_revenue_type_${id}`;

  const inferRevenueType = (sourceNote: string): '근로소득' | '사업소득' | '금융소득' => {
    const s = (sourceNote || '').toLowerCase();
    if (
      s.includes('월급') ||
      s.includes('급여') ||
      s.includes('salary') ||
      s.includes('payroll') ||
      s.includes('연봉')
    ) {
      return '근로소득';
    }
    if (
      s.includes('프리랜서') ||
      s.includes('프로젝트') ||
      s.includes('컨설팅') ||
      s.includes('제휴') ||
      s.includes('블로그') ||
      s.includes('마케팅') ||
      s.includes('광고') ||
      s.includes('계약금') ||
      s.includes('수수료')
    ) {
      return '사업소득';
    }
    return '금융소득';
  };

  // 수익/세금: 월/통화별 메모 로드 + 소득 구분 로드
  useEffect(() => {
    if (accountView !== 'income' && accountView !== 'tax') return;
    if (typeof window === 'undefined') return;

    const year = monthlySelectedMonth.getFullYear();
    const month = monthlySelectedMonth.getMonth() + 1;
    const ymPrefix = `${year}-${String(month).padStart(2, '0')}-`;
    const monthRevenue = revenueRows.filter((r) => r.date.startsWith(ymPrefix));
    const currencyKeys = Array.from(new Set(monthRevenue.map((r) => r.currency || 'KRW'))).sort();

    // 메모 로드
    const investNext: Record<string, string> = {};
    const savingsNext: Record<string, string> = {};
    for (const cur of currencyKeys) {
      const ik = investmentNoteKey(year, month, cur);
      const sk = savingsNoteKey(year, month, cur);
      const iv = localStorage.getItem(ik);
      const sv = localStorage.getItem(sk);
      if (iv) investNext[cur] = iv;
      if (sv) savingsNext[cur] = sv;
    }
    setInvestmentNotes((prev) => ({ ...prev, ...investNext }));
    setSavingsNotes((prev) => ({ ...prev, ...savingsNext }));

    // 소득 구분 로드(없으면 sourceNote 기반 기본값)
    const typeNext: Record<string, string> = {};
    for (const r of monthRevenue) {
      const saved = localStorage.getItem(revenueTypeKey(r.id));
      typeNext[r.id] = saved || inferRevenueType(r.sourceNote);
    }
    setRevenueTypeById((prev) => ({ ...prev, ...typeNext }));
  }, [accountView, monthlySelectedMonth, revenueRows]);

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
        // JWT 토큰 만료 등의 경우에도 데이터가 있을 수 있으므로 계속 진행
        if (response.status === 401) {
          console.warn('[AccountView] 인증 실패 - JWT 토큰이 만료되었을 수 있습니다. 로그인을 다시 해주세요.');
        }
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
            console.error('[AccountView] ⚠️ 데이터가 null');
            setMonthlyData(null);
            setDailyAccounts([]);
          }
        } else {
          console.error('[AccountView] ⚠️ 월별 데이터 조회 실패 (code:', responseCode, '):', response.data);
          // 에러가 있어도 빈 데이터로 설정하여 UI가 깨지지 않도록
          setMonthlyData(null);
          setDailyAccounts([]);
        }
      } else {
        console.error('[AccountView] ⚠️ 응답 데이터가 없음');
        setMonthlyData(null);
        setDailyAccounts([]);
      }
    } catch (error) {
      console.error('[AccountView] 월별 데이터 조회 실패:', error);
      setMonthlyData(null);
      setDailyAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [accountView, monthlySelectedMonth]);

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
    const getYM = (date: string): string => (date || '').slice(0, 7); // YYYY-MM
    const formatYM = (ym: string): string => {
      const [y, m] = ym.split('-');
      if (!y || !m) return ym;
      return `${parseInt(y, 10)}년 ${parseInt(m, 10)}월`;
    };
    const expenseMonths = Array.from(new Set(expenseRows.map((r) => getYM(r.date)).filter(Boolean))).sort();
    const baseYm = expenseMonths.includes('2025-10') ? '2025-10' : expenseMonths[expenseMonths.length - 2];
    const compareYm = expenseMonths.includes('2025-11') ? '2025-11' : expenseMonths[expenseMonths.length - 1];

    const buildMoM = () => {
      if (!baseYm || !compareYm || baseYm === compareYm) return null;

      const byMonthCategory = (ym: string) =>
        expenseRows
          .filter((r) => getYM(r.date) === ym)
          .reduce<Record<string, number>>((acc, r) => {
            const k = r.category || '기타';
            acc[k] = (acc[k] || 0) + (r.amount || 0);
            return acc;
          }, {});

      const topItemsForCategory = (ym: string, category: string) =>
        expenseRows
          .filter((r) => getYM(r.date) === ym && (r.category || '기타') === category)
          .slice()
          .sort((a, b) => (b.amount || 0) - (a.amount || 0))
          .slice(0, 2);

      const base = byMonthCategory(baseYm);
      const curr = byMonthCategory(compareYm);
      const allCats = Array.from(new Set([...Object.keys(base), ...Object.keys(curr)])).sort((a, b) =>
        a.localeCompare(b, 'ko')
      );

      const rows = allCats.map((cat) => {
        const b = base[cat] || 0;
        const c = curr[cat] || 0;
        const diff = c - b;
        const pct = b > 0 ? (diff / b) * 100 : c > 0 ? Infinity : 0;
        return { cat, b, c, diff, pct };
      });

      const totalBase = rows.reduce((s, r) => s + r.b, 0);
      const totalCurr = rows.reduce((s, r) => s + r.c, 0);
      const totalDiff = totalCurr - totalBase;
      const totalPct = totalBase > 0 ? (totalDiff / totalBase) * 100 : totalCurr > 0 ? Infinity : 0;

      const increases = rows
        .filter((r) => r.diff > 0)
        .sort((a, b) => b.diff - a.diff)
        .slice(0, 5);
      const decreases = rows
        .filter((r) => r.diff < 0)
        .sort((a, b) => a.diff - b.diff)
        .slice(0, 5);

      const fmtPct = (p: number) => (p === Infinity ? '신규' : `${p.toFixed(1)}%`);
      const fmtSigned = (n: number) => `${n >= 0 ? '+' : '-'}${Math.abs(n).toLocaleString()}원`;

      const detailForCategory = (cat: string) => {
        const b = base[cat] || 0;
        const c = curr[cat] || 0;
        const diff = c - b;
        const pct = b > 0 ? (diff / b) * 100 : c > 0 ? Infinity : 0;
        const baseTop = topItemsForCategory(baseYm, cat);
        const currTop = topItemsForCategory(compareYm, cat);
        return { cat, b, c, diff, pct, baseTop, currTop };
      };

      return {
        baseYm,
        compareYm,
        totalBase,
        totalCurr,
        totalDiff,
        totalPct,
        increases,
        decreases,
        fmtPct,
        fmtSigned,
        detailForCategory,
      };
    };

    const mom = buildMoM();

    return (
      <div className={`flex-1 overflow-y-auto p-4 md:p-6 ${styles.bg}`} style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center py-4">
            <h1 className={`text-3xl font-bold ${styles.title}`}>가계부</h1>
          </div>

          <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
            <h2 className={`text-2xl font-bold mb-4 text-center border-b-2 pb-3 ${styles.title} ${styles.border}`}>
              📊 종합 지출 분석
            </h2>
            {/* 리포트가 길어져도 하단 메뉴가 보이도록: 내부 스크롤 + 컴팩트 타이포 */}
            <div className={`leading-relaxed text-sm ${styles.title} space-y-3 max-h-64 md:max-h-72 overflow-y-auto pr-2`}>
              {!mom ? (
                <p className={`text-center py-4 ${styles.textMuted}`}>
                  {expenseCsvLoading ? '지출 데이터를 불러오는 중…' : '월별 비교를 위한 지출 데이터가 부족합니다.'}
                </p>
              ) : (
                <>
                  <p className={`${styles.title} text-sm`}>
                    <span className="font-bold">{formatYM(mom.baseYm)}</span> 대비{' '}
                    <span className="font-bold">{formatYM(mom.compareYm)}</span>에 전체 소비가{' '}
                    <span className="font-bold">{mom.fmtSigned(mom.totalDiff)}</span>{' '}
                    {mom.totalPct === Infinity ? '(신규)' : `(${mom.totalPct.toFixed(1)}%)`} 변동했습니다.
                  </p>

                  {mom.increases.length > 0 && (
                    <div className={`${styles.title}`}>
                      <p className="font-bold mb-1 text-sm">증가한 카테고리</p>
                      <ul className={`space-y-1 ${styles.textMuted} text-sm`}>
                        {mom.increases.map((r) => (
                          <li key={`inc-${r.cat}`}>
                            - {r.cat}: {mom.fmtSigned(r.diff)} ({mom.fmtPct(r.pct)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {mom.decreases.length > 0 && (
                    <div className={`${styles.title}`}>
                      <p className="font-bold mb-1 text-sm">감소한 카테고리</p>
                      <ul className={`space-y-1 ${styles.textMuted} text-sm`}>
                        {mom.decreases.map((r) => (
                          <li key={`dec-${r.cat}`}>
                            - {r.cat}: {mom.fmtSigned(r.diff)} ({mom.fmtPct(r.pct)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 카테고리별 상세 설명 */}
                  {(() => {
                    const cats = Array.from(
                      new Set([...(mom.increases ?? []).map((r) => r.cat), ...(mom.decreases ?? []).map((r) => r.cat)])
                    );
                    if (cats.length === 0 || !mom.detailForCategory) return null;
                    return (
                      <div className={`${styles.title} mt-2`}>
                        <p className="font-bold mb-2 text-sm">상세내용</p>
                        <div className={`space-y-2 ${styles.textMuted} text-sm`}>
                          {cats.map((cat) => {
                            const d = mom.detailForCategory(cat);
                            if (!d) return null;
                            const pctLabel = d.pct === Infinity ? '신규' : `${d.pct.toFixed(1)}%`;
                            const baseItem = d.baseTop?.[0];
                            const currItem = d.currTop?.[0];
                            const direction = d.diff > 0 ? '증가' : d.diff < 0 ? '감소' : '변동 없음';
                            return (
                              <p key={`detail-${cat}`}>
                                - <span className="font-bold">{cat}</span>: {mom.fmtSigned(d.diff)} ({pctLabel}) {direction}.{' '}
                                {currItem ? (
                                  <>
                                    {formatYM(mom.compareYm)}에는 <span className="font-semibold">{currItem.description}</span>(
                                    {currItem.amount.toLocaleString()}원)이(가) 가장 컸고,
                                  </>
                                ) : (
                                  <>
                                    {formatYM(mom.compareYm)}에는 해당 카테고리 지출이 거의 없었고,
                                  </>
                                )}{' '}
                                {baseItem ? (
                                  <>
                                    {formatYM(mom.baseYm)}에는 <span className="font-semibold">{baseItem.description}</span>(
                                    {baseItem.amount.toLocaleString()}원)이(가) 가장 컸습니다.
                                  </>
                                ) : (
                                  <>
                                    {formatYM(mom.baseYm)}에는 해당 카테고리 지출이 거의 없었습니다.
                                  </>
                                )}
                              </p>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
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
            <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
              <div className={`flex items-center justify-between gap-4 mb-4 pb-3 border-b-2 ${styles.border}`}>
                <h2 className={`text-xl font-bold ${styles.title}`}>일기(소비) 파싱</h2>
                <button
                  onClick={() => {
                    setConsumptionDiaryRows([]);
                    void loadConsumptionDiaryCsv();
                  }}
                  className={`px-3 py-2 rounded-lg border ${styles.border} ${styles.buttonHover}`}
                >
                  새로고침
                </button>
              </div>

              <p className={`text-sm mb-3 ${styles.textMuted}`}>
                하드코딩된 소비 일기 데이터에서 지출 표현만 추출해서 보여줍니다. (표시: 날짜 + 소비내용)
              </p>

              {consumptionDiaryLoading && (
                <p className={`text-center py-6 ${styles.textMuted}`}>불러오는 중…</p>
              )}
              {consumptionDiaryError && (
                <p className={`text-sm whitespace-pre-wrap ${styles.textMuted}`}>{consumptionDiaryError}</p>
              )}

              {!consumptionDiaryLoading && !consumptionDiaryError && (
                <div className="mt-2 rounded-xl border overflow-hidden" style={{ borderColor: 'inherit' }}>
                  <div className={`grid grid-cols-12 gap-2 px-4 py-2 border-b ${styles.border} ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
                    <div className={`col-span-3 text-xs ${styles.textMuted}`}>날짜</div>
                    <div className={`col-span-9 text-xs ${styles.textMuted}`}>소비내용(파싱)</div>
                  </div>
                  {/* 내부 박스 스크롤 대신, 페이지 전체 스크롤을 사용 */}
                  <div className={`${darkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
                    {consumptionDiaryRows.map((r, idx) => (
                      <div key={`consdiary-${idx}`} className={`px-4 py-3 border-b ${styles.border}`}>
                        <div className="grid grid-cols-12 gap-2">
                          <div className={`col-span-3 text-sm ${styles.textSecondary}`}>{r.date}</div>
                          <div className={`col-span-9 text-sm ${styles.title}`}>{r.expensesText}</div>
                        </div>
                        <p className={`mt-2 text-sm ${styles.textMuted}`}>
                          {(() => {
                            const categorizedText =
                              r.categorizedItemsText || deriveCategorizedItemsTextFromExpensesText(r.expensesText);
                            const isMulti = categorizedText.includes(' / ');
                            if (isMulti) {
                              const categories = Array.from(
                                new Set(
                                  categorizedText
                                    .split(' / ')
                                    .map((s) => s.split(':')[0]?.trim())
                                    .filter(Boolean)
                                )
                              );
                              const categoriesJoined =
                                categories.length <= 1 ? (categories[0] || '') : `${categories.slice(0, -1).join(', ')}와 ${categories[categories.length - 1]}`;
                              return (
                                <>
                                  이 소비는{' '}
                                  <span className={`font-bold ${styles.title}`}>{categoriesJoined}</span> 카테고리에 분류해서 들어갈 수 있어요.{' '}
                                  <span className={`font-semibold ${styles.title}`}>({categorizedText})</span>
                                </>
                              );
                            }
                            return (
                              <>
                                이 소비는{' '}
                                <span className={`font-bold ${styles.title}`}>{r.inferredCategory || '생활용품'}</span> 카테고리에 들어갈 수 있어요.{' '}
                                {r.categoryReason || '기본 분류로 표시했습니다.'}
                              </>
                            );
                          })()}
                        </p>
                      </div>
                    ))}
                    {consumptionDiaryRows.length === 0 && (
                      <p className={`text-center py-8 ${styles.textMuted}`}>파싱된 소비내용이 없습니다.</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* (삭제됨) diary_entries.csv 기반 "일기 소비 데이터 파싱" 섹션 */}
          </div>
        </div>
      </div>
    );
  }

  // Daily 뷰 (항목별 지출)
  if (accountView === 'daily') {
    const year = monthlySelectedMonth.getFullYear();
    const month = monthlySelectedMonth.getMonth() + 1;
    const ymPrefix = `${year}-${String(month).padStart(2, '0')}-`;

    const monthRows = expenseRows
      .filter((r) => r.date.startsWith(ymPrefix))
      .sort((a, b) => (a.ts || 0) - (b.ts || 0)); // 날짜 오름차순

    const rowsByCategory = monthRows.reduce<Record<string, ExpenseRow[]>>((acc, row) => {
      const key = row.category || '기타';
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    }, {});

    const categoryKeys = Object.keys(rowsByCategory).sort((a, b) => a.localeCompare(b, 'ko'));
    const monthGrandTotal = monthRows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const categoryTotals = categoryKeys
      .map((cat) => {
        const rows = rowsByCategory[cat] || [];
        const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
        return { cat, total };
      })
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total);

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
            <div className={`rounded-2xl border-2 p-5 shadow-lg ${styles.card}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className={`text-sm ${styles.textMuted}`}>선택 월</p>
                  <p className={`text-xl font-bold ${styles.title}`}>
                    {year}년 {month}월
                  </p>
                  <p className={`text-sm ${styles.textMuted}`}>{monthRows.length.toLocaleString()}건</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMonthlySelectedMonth(new Date(year, monthlySelectedMonth.getMonth() - 1, 1))}
                    className={`px-3 py-2 rounded-lg border ${styles.border} ${styles.buttonHover}`}
                  >
                    이전달
                  </button>
                  <button
                    onClick={() => setMonthlySelectedMonth(new Date(year, monthlySelectedMonth.getMonth() + 1, 1))}
                    className={`px-3 py-2 rounded-lg border ${styles.border} ${styles.buttonHover}`}
                  >
                    다음달
                  </button>
                  <button
                    onClick={() => {
                      setExpenseRows([]);
                      void loadExpenseCsv();
                    }}
                    className={`px-3 py-2 rounded-lg border ${styles.border} ${styles.buttonHover}`}
                  >
                    새로고침
                  </button>
                </div>
              </div>
            </div>

            {expenseCsvLoading && (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>불러오는 중…</p>
              </div>
            )}

            {expenseCsvError && (
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <p className={`font-bold mb-2 ${styles.title}`}>CSV 로드 실패</p>
                <p className={`text-sm whitespace-pre-wrap ${styles.textMuted}`}>{expenseCsvError}</p>
              </div>
            )}

            {!expenseCsvLoading && !expenseCsvError && monthRows.length === 0 ? (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>선택한 월의 지출 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categoryKeys.map((cat) => {
                  const rows = rowsByCategory[cat] || [];
                  const total = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
                  return (
                    <div key={cat} className={`rounded-2xl border-2 shadow-lg ${styles.card}`}>
                      <div className={`px-5 py-4 border-b-2 ${styles.border} flex items-center justify-between gap-4`}>
                        <div className="min-w-0">
                          <p className={`text-lg font-bold ${styles.title} truncate`}>{cat}</p>
                          <p className={`text-sm ${styles.textMuted}`}>{rows.length.toLocaleString()}건</p>
                        </div>
                        <p className={`text-base font-bold ${styles.title}`}>{total.toLocaleString()}원</p>
                      </div>
                      <div className="divide-y" style={{ borderColor: 'inherit' }}>
                        {rows.map((r, idx) => (
                          <div key={`${cat}-${r.date}-${idx}`} className={`flex items-center justify-between gap-4 p-4 ${styles.cardBg}`}>
                            <div className="min-w-0">
                              <p className={`text-sm ${styles.textMuted}`}>{r.date}</p>
                              <p className={`font-semibold ${styles.title} truncate`}>{r.description || '(설명 없음)'}</p>
                              <p className={`text-xs mt-1 ${styles.textMuted}`}>카테고리: {r.category || cat}</p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className={`font-bold ${styles.title}`}>{r.amount.toLocaleString()}원</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* 카테고리 지분 그래프 */}
                <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                  <div className={`flex items-center justify-between gap-4 mb-4 pb-3 border-b-2 ${styles.border}`}>
                    <h2 className={`text-xl font-bold ${styles.title}`}>카테고리별 지출 비중</h2>
                    <p className={`text-sm ${styles.textMuted}`}>
                      총 {monthGrandTotal.toLocaleString()}원
                    </p>
                  </div>

                  {monthGrandTotal <= 0 || categoryTotals.length === 0 ? (
                    <p className={`text-center py-6 ${styles.textMuted}`}>그래프를 표시할 데이터가 없습니다.</p>
                  ) : (
                    <div className="space-y-3">
                      {categoryTotals.map(({ cat, total }) => {
                        const pct = (total / monthGrandTotal) * 100;
                        const pctLabel = `${pct.toFixed(1)}%`;
                        return (
                          <div key={`share-${cat}`} className="space-y-1">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className={`font-semibold ${styles.title} truncate`}>{cat}</p>
                                <p className={`text-xs ${styles.textMuted}`}>{total.toLocaleString()}원</p>
                              </div>
                              <p className={`font-bold ${styles.title}`}>{pctLabel}</p>
                            </div>
                            <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#e8e2d5]'} overflow-hidden border ${styles.border}`}>
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                                style={{ width: `${Math.max(1, Math.min(100, pct))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
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
    const year = monthlySelectedMonth.getFullYear();
    const month = monthlySelectedMonth.getMonth() + 1;
    const ymPrefix = `${year}-${String(month).padStart(2, '0')}-`;

    const monthRevenue = revenueRows
      .filter((r) => r.date.startsWith(ymPrefix))
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));

    const totalsByCurrency = monthRevenue.reduce<
      Record<string, { totalIncome: number; savingsAmount: number; investAmount: number }>
    >(
      (acc, r) => {
        const cur = r.currency || 'KRW';
        if (!acc[cur]) acc[cur] = { totalIncome: 0, savingsAmount: 0, investAmount: 0 };
        acc[cur].totalIncome += r.amount || 0;
        const { savingsPct, investPct } = parseAllocationSavingsInvestmentPercent(r.allocationPath);
        acc[cur].savingsAmount += (r.amount || 0) * (savingsPct / 100);
        acc[cur].investAmount += (r.amount || 0) * (investPct / 100);
        return acc;
      },
      {}
    );

    const currencyKeys = Object.keys(totalsByCurrency).sort();

    const totalsByCurrencyAndType = monthRevenue.reduce<
      Record<string, Record<'근로소득' | '사업소득' | '금융소득', number>>
    >((acc, r) => {
      const cur = r.currency || 'KRW';
      const t = (revenueTypeById[r.id] as any) || inferRevenueType(r.sourceNote);
      if (!acc[cur]) acc[cur] = { 근로소득: 0, 사업소득: 0, 금융소득: 0 };
      acc[cur][t] = (acc[cur][t] || 0) + (r.amount || 0);
      return acc;
    }, {});

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
            <div className={`rounded-2xl border-2 p-5 shadow-lg ${styles.card}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className={`text-sm ${styles.textMuted}`}>선택 월</p>
                  <p className={`text-xl font-bold ${styles.title}`}>
                    {year}년 {month}월
                  </p>
                  <p className={`text-sm ${styles.textMuted}`}>{monthRevenue.length.toLocaleString()}건</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMonthlySelectedMonth(new Date(year, monthlySelectedMonth.getMonth() - 1, 1))}
                    className={`px-3 py-2 rounded-lg border ${styles.border} ${styles.buttonHover}`}
                  >
                    이전달
                  </button>
                  <button
                    onClick={() => setMonthlySelectedMonth(new Date(year, monthlySelectedMonth.getMonth() + 1, 1))}
                    className={`px-3 py-2 rounded-lg border ${styles.border} ${styles.buttonHover}`}
                  >
                    다음달
                  </button>
                  <button
                    onClick={() => {
                      setRevenueRows([]);
                      void loadRevenueCsv();
                    }}
                    className={`px-3 py-2 rounded-lg border ${styles.border} ${styles.buttonHover}`}
                  >
                    새로고침
                  </button>
                </div>
              </div>
            </div>

            {revenueCsvLoading && (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>불러오는 중…</p>
              </div>
            )}

            {revenueCsvError && (
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <p className={`font-bold mb-2 ${styles.title}`}>CSV 로드 실패</p>
                <p className={`text-sm whitespace-pre-wrap ${styles.textMuted}`}>{revenueCsvError}</p>
              </div>
            )}

            {!revenueCsvLoading && !revenueCsvError && monthRevenue.length === 0 ? (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>선택한 월의 수익 내역이 없습니다.</p>
              </div>
            ) : (
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <div className={`flex items-center justify-between gap-4 mb-4 pb-3 border-b-2 ${styles.border}`}>
                  <h2 className={`text-xl font-bold ${styles.title}`}>총 수익 중 적금/재테크 비중</h2>
                  <p className={`text-xs ${styles.textMuted}`}>(% 의미: 총 수익 중 저축·투자 배분 비중)</p>
                </div>

                <div className="space-y-4">
                  {currencyKeys.map((cur) => {
                    const t = totalsByCurrency[cur];
                    const pctSavings = t.totalIncome > 0 ? (t.savingsAmount / t.totalIncome) * 100 : 0;
                    const pctInvest = t.totalIncome > 0 ? (t.investAmount / t.totalIncome) * 100 : 0;
                    const pctSavingsLabel = `${pctSavings.toFixed(1)}%`;
                    const pctInvestLabel = `${pctInvest.toFixed(1)}%`;
                    return (
                      <div key={`revshare-${cur}`} className="space-y-2">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className={`font-bold ${styles.title}`}>{cur}</p>
                            <p className={`text-xs ${styles.textMuted}`}>
                              총 {t.totalIncome.toLocaleString()} {cur}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${styles.title}`}>
                              투자 {pctInvestLabel}
                            </p>
                            <p className={`text-sm ${styles.textMuted}`}>
                              적금 {pctSavingsLabel}
                            </p>
                          </div>
                        </div>
                        <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#e8e2d5]'} overflow-hidden border ${styles.border} flex`}>
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                            style={{ width: `${Math.max(0, Math.min(100, pctInvest))}%` }}
                            title={`투자 ${pctInvestLabel}`}
                          />
                          <div
                            className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                            style={{ width: `${Math.max(0, Math.min(100, pctSavings))}%` }}
                            title={`적금 ${pctSavingsLabel}`}
                          />
                        </div>
                        <div className={`flex items-center justify-between text-xs ${styles.textMuted}`}>
                          <span>투자 {t.investAmount.toLocaleString()} {cur}</span>
                          <span>적금 {t.savingsAmount.toLocaleString()} {cur}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 총 수익 / 적금 / 투자 금액 요약 */}
            {!revenueCsvLoading && !revenueCsvError && monthRevenue.length > 0 && (
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <div className={`flex items-center justify-between gap-4 mb-4 pb-3 border-b-2 ${styles.border}`}>
                  <h2 className={`text-xl font-bold ${styles.title}`}>이번 달 수익 요약</h2>
                  <p className={`text-xs ${styles.textMuted}`}>하드코딩된 수익 데이터 기준</p>
                </div>

                <div className="space-y-4">
                  {currencyKeys.map((cur) => {
                    const t = totalsByCurrency[cur];
                    return (
                      <div key={`revsum-${cur}`} className={`rounded-xl border p-4 ${styles.border} ${styles.cardBg}`}>
                        <div className="flex items-center justify-between gap-3">
                          <p className={`font-bold ${styles.title}`}>{cur}</p>
                          <p className={`text-sm ${styles.textMuted}`}>{month}월</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
                          <div className={`rounded-lg p-4 border ${styles.border} ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
                            <p className={`text-xs mb-1 ${styles.textMuted}`}>총 수익</p>
                            <p className={`text-lg font-bold ${styles.title}`}>{t.totalIncome.toLocaleString()} {cur}</p>
                          </div>
                          <div className={`rounded-lg p-4 border ${styles.border} ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
                            <p className={`text-xs mb-1 ${styles.textMuted}`}>적금/저축</p>
                            <p className={`text-lg font-bold ${styles.title}`}>{t.savingsAmount.toLocaleString()} {cur}</p>
                            <div className="mt-3">
                              <p className={`text-xs mb-1 ${styles.textMuted}`}>적금 메모</p>
                              <textarea
                                value={savingsNotes[cur] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSavingsNotes((prev) => ({ ...prev, [cur]: val }));
                                  if (typeof window !== 'undefined') {
                                    localStorage.setItem(savingsNoteKey(year, month, cur), val);
                                  }
                                }}
                                placeholder="예) 카카오뱅크 26주 적금, 청년도약계좌, 정기예금 ..."
                                rows={3}
                                className={`w-full mt-1 px-3 py-2 text-sm rounded-lg border ${styles.border} ${darkMode ? 'bg-[#0a0a0a] text-white placeholder:text-gray-500' : 'bg-white text-gray-900 placeholder:text-gray-400'}`}
                              />
                            </div>
                          </div>
                          <div className={`rounded-lg p-4 border ${styles.border} ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
                            <p className={`text-xs mb-1 ${styles.textMuted}`}>투자</p>
                            <p className={`text-lg font-bold ${styles.title}`}>{t.investAmount.toLocaleString()} {cur}</p>

                            <div className="mt-3">
                              <p className={`text-xs mb-1 ${styles.textMuted}`}>투자 종류 메모</p>
                              <textarea
                                value={investmentNotes[cur] || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setInvestmentNotes((prev) => ({ ...prev, [cur]: val }));
                                  if (typeof window !== 'undefined') {
                                    localStorage.setItem(investmentNoteKey(year, month, cur), val);
                                  }
                                }}
                                placeholder="예) 미국주식: TSLA, ETF: QQQ, 코인: BTC, 예금: 달러예금 ..."
                                rows={3}
                                className={`w-full mt-1 px-3 py-2 text-sm rounded-lg border ${styles.border} ${darkMode ? 'bg-[#0a0a0a] text-white placeholder:text-gray-500' : 'bg-white text-gray-900 placeholder:text-gray-400'}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 수익 소득 구분(근로/사업/기타) */}
            {!revenueCsvLoading && !revenueCsvError && monthRevenue.length > 0 && (
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <div className={`flex items-center justify-between gap-4 mb-4 pb-3 border-b-2 ${styles.border}`}>
                  <h2 className={`text-xl font-bold ${styles.title}`}>수익 구분</h2>
                  <p className={`text-xs ${styles.textMuted}`}>근로소득 / 사업소득 / 금융소득</p>
                </div>

                <div className="space-y-4">
                  {currencyKeys.map((cur) => {
                    const bucket = totalsByCurrencyAndType[cur] || { 근로소득: 0, 사업소득: 0, 금융소득: 0 };
                    return (
                      <div key={`type-sum-${cur}`} className={`rounded-xl border p-4 ${styles.border} ${styles.cardBg}`}>
                        <p className={`font-bold mb-3 ${styles.title}`}>{cur}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {(['근로소득', '사업소득', '금융소득'] as const).map((tname) => (
                            <div key={`${cur}-${tname}`} className={`rounded-lg p-4 border ${styles.border} ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
                              <p className={`text-xs mb-1 ${styles.textMuted}`}>{tname}</p>
                              <p className={`text-lg font-bold ${styles.title}`}>{bucket[tname].toLocaleString()} {cur}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  <div className={`rounded-xl border ${styles.border} overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${styles.border} ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
                      <p className={`font-bold ${styles.title}`}>이번 달 수익 내역 (소득 구분 설정)</p>
                      <p className={`text-xs ${styles.textMuted}`}>각 항목의 소득 구분을 바꾸면 위 요약이 즉시 반영됩니다. (로컬 저장)</p>
                    </div>
                    <div className={`${darkMode ? 'bg-[#0a0a0a]' : 'bg-white'}`}>
                      {monthRevenue.map((r) => (
                        <div key={`revrow-${r.id}`} className={`p-4 border-b ${styles.border} flex flex-col md:flex-row md:items-center md:justify-between gap-3`}>
                          <div className="min-w-0">
                            <p className={`text-sm ${styles.textMuted}`}>{r.date} · {r.currency}</p>
                            <p className={`font-semibold ${styles.title} truncate`}>{r.sourceNote || '(수익 메모 없음)'}</p>
                          </div>
                          <div className="flex items-center gap-3 justify-between md:justify-end">
                            <p className={`font-bold ${styles.title}`}>{r.amount.toLocaleString()} {r.currency}</p>
                            <select
                              value={(revenueTypeById[r.id] as any) || inferRevenueType(r.sourceNote)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRevenueTypeById((prev) => ({ ...prev, [r.id]: val }));
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem(revenueTypeKey(r.id), val);
                                }
                              }}
                              className={`text-sm px-3 py-2 rounded-lg border ${styles.border} ${darkMode ? 'bg-[#121212] text-white' : 'bg-white text-gray-900'}`}
                            >
                              <option value="근로소득">근로소득</option>
                              <option value="사업소득">사업소득</option>
                              <option value="금융소득">금융소득</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tax 뷰
  if (accountView === 'tax') {
    const year = monthlySelectedMonth.getFullYear();
    const month = monthlySelectedMonth.getMonth() + 1;
    const ymPrefix = `${year}-${String(month).padStart(2, '0')}-`;

    const monthRevenue = revenueRows
      .filter((r) => r.date.startsWith(ymPrefix))
      .sort((a, b) => (a.ts || 0) - (b.ts || 0));

    // 통화별 총 수익 / 적금 / 투자 금액
    const totalsByCurrency = monthRevenue.reduce<
      Record<string, { totalIncome: number; savingsAmount: number; investAmount: number }>
    >((acc, r) => {
      const cur = r.currency || 'KRW';
      if (!acc[cur]) acc[cur] = { totalIncome: 0, savingsAmount: 0, investAmount: 0 };
      acc[cur].totalIncome += r.amount || 0;
      const { savingsPct, investPct } = parseAllocationSavingsInvestmentPercent(r.allocationPath);
      acc[cur].savingsAmount += (r.amount || 0) * (savingsPct / 100);
      acc[cur].investAmount += (r.amount || 0) * (investPct / 100);
      return acc;
    }, {});
    const currencyKeys = Object.keys(totalsByCurrency).sort();

    // 소득 구분(근로/사업/금융)별 합계
    const totalsByCurrencyAndType = monthRevenue.reduce<
      Record<string, Record<'근로소득' | '사업소득' | '금융소득', number>>
    >((acc, r) => {
      const cur = r.currency || 'KRW';
      const t = (revenueTypeById[r.id] as any) || inferRevenueType(r.sourceNote);
      if (!acc[cur]) acc[cur] = { 근로소득: 0, 사업소득: 0, 금융소득: 0 };
      acc[cur][t] = (acc[cur][t] || 0) + (r.amount || 0);
      return acc;
    }, {});

    // 대략 세율(화면용, 아주 러프)
    const TAX_RATE: Record<'근로소득' | '사업소득' | '금융소득', number> = {
      근로소득: 0.05,   // 5%
      사업소득: 0.033,  // 3.3%
      금융소득: 0.154,  // 15.4%
    };

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
            {/* 월 선택 */}
            <div className={`rounded-2xl border-2 p-5 shadow-lg ${styles.card}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className={`text-sm ${styles.textMuted}`}>선택 월</p>
                  <p className={`text-xl font-bold ${styles.title}`}>
                    {year}년 {month}월
                  </p>
                  <p className={`text-sm ${styles.textMuted}`}>{monthRevenue.length.toLocaleString()}건</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMonthlySelectedMonth(new Date(year, monthlySelectedMonth.getMonth() - 1, 1))}
                    className={`px-3 py-2 rounded-lg border ${styles.border} ${styles.buttonHover}`}
                  >
                    이전달
                  </button>
                  <button
                    onClick={() => setMonthlySelectedMonth(new Date(year, monthlySelectedMonth.getMonth() + 1, 1))}
                    className={`px-3 py-2 rounded-lg border ${styles.border} ${styles.buttonHover}`}
                  >
                    다음달
                  </button>
                </div>
              </div>
            </div>

            {revenueCsvLoading && (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>수익 데이터 불러오는 중…</p>
              </div>
            )}

            {revenueCsvError && (
              <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                <p className={`font-bold mb-2 ${styles.title}`}>CSV 로드 실패</p>
                <p className={`text-sm whitespace-pre-wrap ${styles.textMuted}`}>{revenueCsvError}</p>
              </div>
            )}

            {!revenueCsvLoading && !revenueCsvError && monthRevenue.length === 0 ? (
              <div className={`rounded-2xl border-2 p-8 shadow-lg ${styles.card}`}>
                <p className={`text-center py-8 ${styles.textMuted}`}>선택한 월의 수익 데이터가 없습니다.</p>
              </div>
            ) : (
              <>
                {/* (요청) 맨 위 주황/초록 그래프 재사용 */}
                <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                  <div className={`flex items-center justify-between gap-4 mb-4 pb-3 border-b-2 ${styles.border}`}>
                    <h2 className={`text-xl font-bold ${styles.title}`}>총 수익 중 적금/재테크 비중</h2>
                    <p className={`text-xs ${styles.textMuted}`}>(% 의미: 총 수익 중 저축·투자 배분 비중)</p>
                  </div>
                  <div className="space-y-4">
                    {currencyKeys.map((cur) => {
                      const t = totalsByCurrency[cur];
                      const pctSavings = t.totalIncome > 0 ? (t.savingsAmount / t.totalIncome) * 100 : 0;
                      const pctInvest = t.totalIncome > 0 ? (t.investAmount / t.totalIncome) * 100 : 0;
                      const pctSavingsLabel = `${pctSavings.toFixed(1)}%`;
                      const pctInvestLabel = `${pctInvest.toFixed(1)}%`;
                      return (
                        <div key={`tax-share-${cur}`} className="space-y-2">
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className={`font-bold ${styles.title}`}>{cur}</p>
                              <p className={`text-xs ${styles.textMuted}`}>총 {t.totalIncome.toLocaleString()} {cur}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${styles.title}`}>투자 {pctInvestLabel}</p>
                              <p className={`text-sm ${styles.textMuted}`}>적금 {pctSavingsLabel}</p>
                            </div>
                          </div>
                          <div className={`w-full h-3 rounded-full ${darkMode ? 'bg-[#1a1a1a]' : 'bg-[#e8e2d5]'} overflow-hidden border ${styles.border} flex`}>
                            <div
                              className="h-full bg-gradient-to-r from-emerald-400 to-teal-500"
                              style={{ width: `${Math.max(0, Math.min(100, pctInvest))}%` }}
                              title={`투자 ${pctInvestLabel}`}
                            />
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                              style={{ width: `${Math.max(0, Math.min(100, pctSavings))}%` }}
                              title={`적금 ${pctSavingsLabel}`}
                            />
                          </div>
                          <div className={`flex items-center justify-between text-xs ${styles.textMuted}`}>
                            <span>투자 {t.investAmount.toLocaleString()} {cur}</span>
                            <span>적금 {t.savingsAmount.toLocaleString()} {cur}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 세금 리포트(대략) */}
                <div className={`rounded-2xl border-2 p-6 shadow-lg ${styles.card}`}>
                  <div className={`flex items-center justify-between gap-4 mb-4 pb-3 border-b-2 ${styles.border}`}>
                    <h2 className={`text-xl font-bold ${styles.title}`}>세금 리포트(대략)</h2>
                    <p className={`text-xs ${styles.textMuted}`}>하드코딩된 수익 데이터 기반 · 추정치</p>
                  </div>

                  <div className="space-y-4">
                    {currencyKeys.map((cur) => {
                      const byType = totalsByCurrencyAndType[cur] || { 근로소득: 0, 사업소득: 0, 금융소득: 0 };
                      const est =
                        byType.근로소득 * TAX_RATE.근로소득 +
                        byType.사업소득 * TAX_RATE.사업소득 +
                        byType.금융소득 * TAX_RATE.금융소득;
                      return (
                        <div key={`tax-report-${cur}`} className={`rounded-xl border p-4 ${styles.border} ${styles.cardBg}`}>
                          <div className="flex items-end justify-between gap-3">
                            <div>
                              <p className={`font-bold ${styles.title}`}>{cur}</p>
                              <p className={`text-xs ${styles.textMuted}`}>선택월: {year}-{String(month).padStart(2, '0')}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm ${styles.textMuted}`}>예상 세금</p>
                              <p className={`text-2xl font-bold ${styles.title}`}>{Math.round(est).toLocaleString()} {cur}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                            {(['근로소득', '사업소득', '금융소득'] as const).map((tname) => {
                              const amt = byType[tname] || 0;
                              const tax = amt * TAX_RATE[tname];
                              return (
                                <div key={`${cur}-${tname}`} className={`rounded-lg p-4 border ${styles.border} ${darkMode ? 'bg-[#121212]' : 'bg-white'}`}>
                                  <p className={`text-xs mb-1 ${styles.textMuted}`}>{tname}</p>
                                  <p className={`text-base font-bold ${styles.title}`}>{amt.toLocaleString()} {cur}</p>
                                  <p className={`text-xs mt-1 ${styles.textMuted}`}>가정 세율 {Math.round(TAX_RATE[tname] * 1000) / 10}% → {Math.round(tax).toLocaleString()} {cur}</p>
                                </div>
                              );
                            })}
                          </div>

                          <p className={`text-xs mt-4 ${styles.textMuted}`}>
                            참고: 이 값은 아주 단순 추정치입니다. 실제 세금은 공제/경비/원천징수/과세구간/금융소득 종합과세 여부 등에 따라 크게 달라질 수 있어요.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
