/**
 * Pathfinder API 함수
 * 백엔드 pathfinder-service와 통신
 */

import { fetchJSONFromGateway } from '../../lib/api/client';
import { Diary } from '../../components/types';

// 백엔드 응답 형식
interface Messenger {
  code: number;
  message: string;
  data?: any;
}

// 적성 추천 관련 타입
export interface AptitudeRecommendation {
  id: string;
  tag: string;  // "empathy", "care", "analysis"
  tagName: string;  // "공감", "돌봄", "분석"
  emoji: string;
  category: string;
  score: number;  // 0.0 ~ 1.0
  strength: 'strong' | 'moderate' | 'weak';
  discoveryReason: string;  // "당신의 일기에서..."
  evidenceSentences: string[];  // 일기에서 추출한 문장들
  relatedDiaryDates: string[];  // 관련 일기 날짜들
  videos: VideoInfo[];
}

// 하위 호환성을 위한 별칭
export interface LearningRecommendation extends AptitudeRecommendation {
  title: string;  // tagName과 동일
  frequency: number;  // score * 100으로 변환
  reason: string;  // discoveryReason과 동일
  relatedDiary: string;  // relatedDiaryDates[0]과 동일
  quickLearn: string;  // 선택적
}

export interface VideoInfo {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  emoji: string;
  count: number;
}

export interface RecommendationStats {
  discovered: number;  // 발견한 적성 개수
  strong: number;  // 강한 적성 개수
  moderate: number;  // 보통 적성 개수
  weak: number;  // 약한 적성 개수
  // 하위 호환성
  inProgress?: number;
  completed?: number;
}

export interface ComprehensiveRecommendation {
  recommendations: AptitudeRecommendation[];
  popularTopics: string[];  // 인기 적성 태그
  categories: CategoryInfo[];
  stats: RecommendationStats;
}

// 하위 호환성
export interface ComprehensiveLearningRecommendation extends ComprehensiveRecommendation {
  recommendations: LearningRecommendation[];
}

/**
 * 학습 추천 조회 (종합)
 */
export async function fetchRecommendations(userId: number): Promise<ComprehensiveRecommendation | null> {
  const endpoint = `/pathfinder/pathfinders/recommendations/${userId}`;
  console.log('[fetchRecommendations] API 호출 시작:', endpoint);
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    console.log('[fetchRecommendations] 응답 상태:', response.status);
    console.log('[fetchRecommendations] 응답 데이터:', response.data);
    console.log('[fetchRecommendations] 응답 에러:', response.error);

    // 네트워크 에러나 파싱 에러가 있는 경우
    if (response.error) {
      console.error('[fetchRecommendations] 응답 에러:', response.error);
      return null;
    }

    // 응답 데이터가 없는 경우
    if (!response.data) {
      console.warn('[fetchRecommendations] 응답 데이터가 없음');
      return null;
    }

    const messenger = response.data as Messenger;
    const responseCode = messenger?.code;
    
    // 응답 코드가 200이 아니면 null 반환
    if (responseCode !== 200) {
      console.warn('[fetchRecommendations] 응답 코드가 200이 아님:', responseCode, messenger.message);
      return null;
    }

    // data가 ComprehensiveRecommendation 형식인 경우
    if (messenger.data) {
      const recommendation = messenger.data as ComprehensiveRecommendation;
      console.log('[fetchRecommendations] 추천 데이터:', {
        recommendationsCount: recommendation.recommendations?.length || 0,
        popularTopicsCount: recommendation.popularTopics?.length || 0,
        categoriesCount: recommendation.categories?.length || 0,
      });
      return recommendation;
    }

    return null;
  } catch (error) {
    console.error('[fetchRecommendations] 예외 발생:', error);
    return null;
  }
}

/**
 * 간단 학습 추천 조회
 */
export async function fetchSimpleRecommendations(userId: number): Promise<LearningRecommendation[]> {
  const endpoint = `/pathfinder/pathfinders/recommendations/${userId}/simple`;
  console.log('[fetchSimpleRecommendations] API 호출 시작:', endpoint);
  
  try {
    const response = await fetchJSONFromGateway<Messenger>(
      endpoint,
      {},
      {
        method: 'GET',
      }
    );

    if (response.error || !response.data) {
      console.error('[fetchSimpleRecommendations] 응답 에러:', response.error);
      return [];
    }

    const messenger = response.data as Messenger;
    const responseCode = messenger?.code;
    
    if (responseCode !== 200) {
      console.warn('[fetchSimpleRecommendations] 응답 코드가 200이 아님:', responseCode);
      return [];
    }

    if (Array.isArray(messenger.data)) {
      return messenger.data as LearningRecommendation[];
    }

    return [];
  } catch (error) {
    console.error('[fetchSimpleRecommendations] 예외 발생:', error);
    return [];
  }
}

/**
 * 더미 적성 추천 데이터 생성 (UI 테스트용)
 */
export function generateDummyAptitudeData(): ComprehensiveRecommendation {
  const dummyAptitudes: AptitudeRecommendation[] = [
    {
      id: '1',
      tag: 'empathy',
      tagName: '공감',
      emoji: '💭',
      category: '감정',
      score: 0.85,
      strength: 'strong',
      discoveryReason: '당신의 일기에서 타인의 감정을 이해하고 공감하는 표현이 자주 나타났습니다.',
      evidenceSentences: [
        '친구가 힘들어하는 모습을 보니 마음이 아팠다',
        '누군가의 이야기를 들으니 그 마음을 이해할 수 있었다',
        '다른 사람의 기쁨과 슬픔을 함께 느낄 수 있었다'
      ],
      relatedDiaryDates: ['2024.01.15', '2024.01.20', '2024.02.03'],
      videos: [
        { id: '1', title: '공감 능력 키우기', duration: '10:30', thumbnail: '' },
        { id: '2', title: '감정 이해하기', duration: '15:20', thumbnail: '' }
      ]
    },
    {
      id: '2',
      tag: 'care',
      tagName: '돌봄',
      emoji: '🩹',
      category: '의료',
      score: 0.72,
      strength: 'moderate',
      discoveryReason: '일기에서 상처나 아픔을 치유하고 돌보는 내용이 발견되었습니다.',
      evidenceSentences: [
        '병마사에게 약을 지어 치료를 받았다',
        '다친 사람을 보살폈다',
        '아픈 사람을 돌봤다'
      ],
      relatedDiaryDates: ['2024.01.10', '2024.01.25'],
      videos: [
        { id: '3', title: '응급처치 기초', duration: '12:00', thumbnail: '' },
        { id: '4', title: '돌봄의 기술', duration: '18:30', thumbnail: '' }
      ]
    },
    {
      id: '3',
      tag: 'analysis',
      tagName: '분석',
      emoji: '📊',
      category: '분석',
      score: 0.68,
      strength: 'moderate',
      discoveryReason: '일기에서 상황을 분석하고 판단하는 사고 과정이 드러났습니다.',
      evidenceSentences: [
        '상황을 차근차근 분석해보니',
        '여러 가지를 비교해보고 결정했다',
        '원인을 찾아 문제를 해결했다'
      ],
      relatedDiaryDates: ['2024.01.18', '2024.02.01'],
      videos: [
        { id: '5', title: '논리적 사고', duration: '14:15', thumbnail: '' }
      ]
    },
    {
      id: '4',
      tag: 'writing',
      tagName: '글쓰기',
      emoji: '✍️',
      category: '기록',
      score: 0.55,
      strength: 'weak',
      discoveryReason: '일기에서 글쓰기와 기록에 대한 관심이 발견되었습니다.',
      evidenceSentences: [
        '오늘 있었던 일을 자세히 기록했다',
        '생각을 글로 정리하니 마음이 편해졌다'
      ],
      relatedDiaryDates: ['2024.01.12'],
      videos: [
        { id: '6', title: '글쓰기 기초', duration: '20:00', thumbnail: '' }
      ]
    },
    {
      id: '5',
      tag: 'observation',
      tagName: '관찰',
      emoji: '🌤️',
      category: '관찰',
      score: 0.48,
      strength: 'weak',
      discoveryReason: '일기에서 주변 환경과 자연을 관찰하는 내용이 나타났습니다.',
      evidenceSentences: [
        '하늘을 보니 날씨가 변하고 있었다',
        '주변의 작은 변화를 발견했다'
      ],
      relatedDiaryDates: ['2024.01.22'],
      videos: [
        { id: '7', title: '관찰력 키우기', duration: '11:30', thumbnail: '' }
      ]
    }
  ];

  const strongCount = dummyAptitudes.filter(a => a.strength === 'strong').length;
  const moderateCount = dummyAptitudes.filter(a => a.strength === 'moderate').length;
  const weakCount = dummyAptitudes.filter(a => a.strength === 'weak').length;

  return {
    recommendations: dummyAptitudes,
    popularTopics: ['공감', '돌봄', '분석', '글쓰기', '관찰'],
    categories: [
      { id: 'emotion', name: '감정', emoji: '💭', count: 1 },
      { id: 'medical', name: '의료', emoji: '🩹', count: 1 },
      { id: 'analysis', name: '분석', emoji: '📊', count: 1 },
      { id: 'writing', name: '기록', emoji: '✍️', count: 1 },
      { id: 'observation', name: '관찰', emoji: '🌤️', count: 1 }
    ],
    stats: {
      discovered: dummyAptitudes.length,
      strong: strongCount,
      moderate: moderateCount,
      weak: weakCount,
      inProgress: 0,
      completed: 0
    }
  };
}

/**
 * 더미 나의 적성 데이터 생성
 */
export interface MyAptitudeItem {
  id: string;
  tag: string;
  tagName: string;
  emoji: string;
  score: number;
  strength: 'strong' | 'moderate' | 'weak';
  progress: number;  // 학습 진행률 0-100
  completed_videos: number;
  total_videos: number;
  last_studied?: string;
  status: 'in_progress' | 'completed';
  rating?: number;  // 완료된 경우만
  completed_date?: string;
}

export function generateDummyMyAptitudeData(): {
  inProgress: MyAptitudeItem[];
  completed: MyAptitudeItem[];
} {
  return {
    inProgress: [
      {
        id: '1',
        tag: 'empathy',
        tagName: '공감',
        emoji: '💭',
        score: 0.85,
        strength: 'strong',
        progress: 65,
        completed_videos: 3,
        total_videos: 5,
        last_studied: '2024.01.20',
        status: 'in_progress'
      },
      {
        id: '2',
        tag: 'care',
        tagName: '돌봄',
        emoji: '🩹',
        score: 0.72,
        strength: 'moderate',
        progress: 40,
        completed_videos: 2,
        total_videos: 5,
        last_studied: '2024.01.18',
        status: 'in_progress'
      }
    ],
    completed: [
      {
        id: '3',
        tag: 'analysis',
        tagName: '분석',
        emoji: '📊',
        score: 0.68,
        strength: 'moderate',
        progress: 100,
        completed_videos: 5,
        total_videos: 5,
        last_studied: '2024.01.15',
        status: 'completed',
        rating: 5,
        completed_date: '2024.01.15'
      },
      {
        id: '4',
        tag: 'writing',
        tagName: '글쓰기',
        emoji: '✍️',
        score: 0.55,
        strength: 'weak',
        progress: 100,
        completed_videos: 3,
        total_videos: 3,
        last_studied: '2024.01.10',
        status: 'completed',
        rating: 4,
        completed_date: '2024.01.10'
      },
      {
        id: '5',
        tag: 'observation',
        tagName: '관찰',
        emoji: '🌤️',
        score: 0.48,
        strength: 'weak',
        progress: 100,
        completed_videos: 2,
        total_videos: 2,
        last_studied: '2024.01.08',
        status: 'completed',
        rating: 4,
        completed_date: '2024.01.08'
      }
    ]
  };
}

/**
 * 더미 커리어 추천 데이터 생성
 */
export interface CareerRecommendation {
  job_id: string;
  job_name: string;
  emoji: string;
  match_percentage: number;
  matched_aptitudes: string[];
  reasons: string[];
  description: string;
  required_traits: string[];
  related_skills: string[];
  videos: VideoInfo[];
  salary_range?: string;
  growth_potential?: 'high' | 'medium' | 'low';
  // 상세 정보 (커리어넷 API에서 받아올 데이터)
  detailed_info?: {
    job_description: string; // 직무 설명
    main_duties: string[]; // 주요 업무
    work_environment: string; // 근무 환경
    required_education: string; // 필요 학력
    required_certifications: string[]; // 필요 자격증
    career_prospects: string; // 전망
    related_jobs: string[]; // 관련 직업
    work_life_balance: string; // 워라밸
    entry_difficulty: 'easy' | 'medium' | 'hard'; // 진입 난이도
  };
}

export function generateDummyCareerData(): CareerRecommendation[] {
  return [
    {
      job_id: '1',
      job_name: '간호사',
      emoji: '🏥',
      match_percentage: 92,
      matched_aptitudes: ['돌봄', '공감', '관찰'],
      reasons: [
        '당신의 돌봄 적성이 72%로 높게 나타났습니다',
        '공감 능력이 85%로 환자 돌봄에 적합합니다',
        '관찰력이 일기에서 자주 발견되어 환자 상태 파악에 도움이 됩니다'
      ],
      description: '병원에서 환자를 직접 돌보고 치료를 보조하는 의료 전문가입니다. 환자의 건강 회복과 일상 생활 지원을 담당합니다.',
      required_traits: ['공감', '돌봄', '관찰', '위기대응'],
      related_skills: ['의사소통', '관찰력', '문제해결', '응급처치'],
      videos: [
        { id: '1', title: '간호사의 하루', duration: '15:30', thumbnail: '' },
        { id: '2', title: '환자와의 소통 기술', duration: '12:20', thumbnail: '' }
      ],
      salary_range: '3,000만원 ~ 5,500만원',
      growth_potential: 'high',
      detailed_info: {
        job_description: '간호사는 의사의 지시에 따라 환자를 돌보고, 진단과 치료를 보조하며, 환자의 건강 회복과 질병 예방을 돕는 의료 전문가입니다. 병원, 클리닉, 요양시설 등 다양한 의료 기관에서 근무합니다.',
        main_duties: [
          '환자의 상태를 관찰하고 기록',
          '의사의 진료를 보조하고 처치 수행',
          '투약 및 주사 관리',
          '환자와 보호자에게 건강 교육 제공',
          '응급 상황 대응 및 응급처치',
          '의료 기록 작성 및 관리'
        ],
        work_environment: '병원, 클리닉, 요양시설, 보건소 등에서 근무하며, 3교대 근무가 일반적입니다. 밤 근무와 주말 근무가 포함되어 있습니다.',
        required_education: '간호학과 4년제 대학 졸업 또는 전문대학 간호과 졸업',
        required_certifications: ['간호사 국가고시 합격', '간호사 면허증'],
        career_prospects: '고령화 사회로 인해 간호사 수요가 지속적으로 증가하고 있으며, 전문 간호사, 간호 관리자 등으로 성장할 수 있습니다.',
        related_jobs: ['의사', '물리치료사', '작업치료사', '간병인', '의료기사'],
        work_life_balance: '3교대 근무로 인해 개인 시간 확보가 어려울 수 있으나, 근무 일정이 규칙적입니다.',
        entry_difficulty: 'medium'
      }
    },
    {
      job_id: '2',
      job_name: '경찰관',
      emoji: '👮',
      match_percentage: 85,
      matched_aptitudes: ['분석', '관찰', '문제해결'],
      reasons: [
        '분석 능력이 68%로 사건 수사에 적합합니다',
        '관찰력이 범죄 현장 분석에 도움이 됩니다',
        '문제해결 능력이 공공 안전 유지에 필수적입니다'
      ],
      description: '시민의 안전을 지키고 법질서를 유지하는 공무원입니다. 범죄 예방, 수사, 교통 관리 등 다양한 업무를 담당합니다.',
      required_traits: ['분석', '관찰', '문제해결', '기획'],
      related_skills: ['상황 분석', '의사결정', '의사소통', '리더십'],
      videos: [
        { id: '3', title: '경찰관이 되는 방법', duration: '20:00', thumbnail: '' },
        { id: '4', title: '사건 수사 기초', duration: '18:30', thumbnail: '' }
      ],
      salary_range: '3,500만원 ~ 6,500만원',
      growth_potential: 'medium',
      detailed_info: {
        job_description: '경찰관은 시민의 생명과 재산을 보호하고, 법질서를 유지하며, 범죄를 예방하고 수사하는 공무원입니다. 지역 경찰서, 수사대, 교통대 등 다양한 부서에서 근무합니다.',
        main_duties: [
          '순찰 및 지역 안전 관리',
          '범죄 수사 및 용의자 체포',
          '교통 단속 및 교통사고 처리',
          '시민 신고 접수 및 대응',
          '범죄 예방 활동',
          '각종 행사 및 집회 경비'
        ],
        work_environment: '경찰서, 파출소, 수사대 등에서 근무하며, 24시간 교대 근무가 일반적입니다. 야외 근무와 위험 상황 대응이 포함됩니다.',
        required_education: '고등학교 졸업 이상 (경찰공무원 시험 응시 자격)',
        required_certifications: ['경찰공무원 시험 합격', '경찰교육원 수료'],
        career_prospects: '공무원으로 안정적인 직업이며, 경위, 경감, 경정 등으로 승진할 수 있습니다. 수사, 교통, 경비 등 전문 분야로 진출 가능합니다.',
        related_jobs: ['소방관', '교도관', '검사', '판사', '변호사'],
        work_life_balance: '교대 근무와 긴급 출동으로 인해 개인 시간 확보가 어려울 수 있으나, 공무원으로 안정적인 근무 환경을 제공합니다.',
        entry_difficulty: 'hard'
      }
    },
    {
      job_id: '3',
      job_name: '작가',
      emoji: '✍️',
      match_percentage: 78,
      matched_aptitudes: ['글쓰기', '관찰', '분석'],
      reasons: [
        '글쓰기 적성이 55%로 창작 작업에 적합합니다',
        '관찰력이 일상의 이야기를 글로 옮기는데 도움이 됩니다',
        '분석 능력이 복잡한 주제를 다루는데 필요합니다'
      ],
      description: '소설, 에세이, 시 등 다양한 형태의 글을 창작하는 전문가입니다. 독자에게 감동과 통찰을 전달합니다.',
      required_traits: ['글쓰기', '관찰', '분석', '창의'],
      related_skills: ['문서 작성', '스토리텔링', '연구', '자기표현'],
      videos: [
        { id: '5', title: '작가가 되는 길', duration: '14:15', thumbnail: '' },
        { id: '6', title: '글쓰기 기법', duration: '16:45', thumbnail: '' }
      ],
      salary_range: '2,000만원 ~ 10,000만원+',
      growth_potential: 'high',
      detailed_info: {
        job_description: '작가는 소설, 에세이, 시, 수필 등 다양한 형태의 글을 창작하여 독자에게 감동과 통찰을 전달하는 전문가입니다. 출판사와 계약하여 작품을 출간하거나, 프리랜서로 활동합니다.',
        main_duties: [
          '창작 아이디어 발굴 및 기획',
          '소설, 에세이, 시 등 작품 창작',
          '출판사와의 계약 및 협상',
          '원고 교정 및 수정',
          '독자와의 소통 (사인회, 강연 등)',
          '다른 작가 및 편집자와의 협업'
        ],
        work_environment: '주로 자택이나 카페 등에서 집필하며, 출판사 방문, 사인회, 강연 등 외부 활동도 포함됩니다. 프리랜서로 자유로운 근무 환경을 가집니다.',
        required_education: '학력 제한 없음 (문학, 국어국문학 전공 유리)',
        required_certifications: [],
        career_prospects: '디지털 콘텐츠 시장 확대로 전자책, 웹소설 등 다양한 플랫폼에서 활동 기회가 늘어나고 있습니다. 베스트셀러 작가가 되면 높은 수입을 기대할 수 있습니다.',
        related_jobs: ['편집자', '번역가', '기자', '방송 작가', '시나리오 작가'],
        work_life_balance: '자유로운 근무 시간을 가지나, 데드라인과 창작 압박으로 인해 불규칙한 생활 패턴이 될 수 있습니다.',
        entry_difficulty: 'hard'
      }
    }
  ];
}

/**
 * 더미 로드맵 데이터 생성
 */
export interface RoadmapPhase {
  phase_id: string;
  phase_number: number;
  phase_name: string;
  description: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  progress?: number;
  required_aptitudes: string[];
  learning_items: LearningItem[];
  estimated_duration: string;
  // 상세 정보
  detailed_info?: {
    overview: string; // 단계 개요
    key_points: string[]; // 핵심 포인트
    learning_tips: string[]; // 학습 팁
    recommended_resources: {
      books?: string[];
      websites?: string[];
      courses?: string[];
      videos?: VideoInfo[];
    };
    common_challenges: string[]; // 자주 겪는 어려움
    success_criteria: string[]; // 성공 기준
  };
}

export interface LearningItem {
  id: string;
  title: string;
  type: 'video' | 'course' | 'practice' | 'certification';
  completed: boolean;
  duration?: string;
}

export interface CareerRoadmap {
  career_name: string;
  career_emoji: string;
  phases: RoadmapPhase[];
}

export function generateDummyRoadmapData(careerId: string): CareerRoadmap | null {
  const roadmaps: Record<string, CareerRoadmap> = {
    '1': {
      career_name: '간호사',
      career_emoji: '🏥',
      phases: [
        {
          phase_id: '1',
          phase_number: 1,
          phase_name: '의료 기초 지식 학습',
          description: '간호학 기초 이론과 의료 윤리를 학습합니다.',
          status: 'completed',
          required_aptitudes: ['돌봄', '공감'],
          learning_items: [
            { id: '1', title: '간호학 개론', type: 'course', completed: true, duration: '40시간' },
            { id: '2', title: '의료 윤리', type: 'course', completed: true, duration: '20시간' },
            { id: '3', title: '인체 해부생리학', type: 'course', completed: true, duration: '60시간' }
          ],
          estimated_duration: '6개월',
          detailed_info: {
            overview: '간호학의 기초 이론과 의료 윤리를 체계적으로 학습하는 단계입니다. 이 단계를 완료하면 간호사로서 필요한 기본 지식을 갖추게 됩니다.',
            key_points: [
              '간호학의 역사와 철학 이해',
              '인체 구조와 생리 기능 학습',
              '의료 윤리와 법규 준수',
              '기본 간호 기술 습득'
            ],
            learning_tips: [
              '이론 수업과 실습을 병행하여 이해도 높이기',
              '인체 해부도를 활용하여 시각적으로 학습',
              '의료 윤리 사례를 통해 실무 적용 방법 이해',
              '정기적인 복습으로 장기 기억 강화'
            ],
            recommended_resources: {
              books: ['간호학 개론', '인체 해부생리학', '의료 윤리'],
              websites: ['한국간호교육평가원', '대한간호협회'],
              courses: ['간호학 기초 강의', '의료 윤리 특강'],
              videos: [
                { id: '1', title: '간호학 개론 강의', duration: '2시간 30분', thumbnail: '' },
                { id: '2', title: '인체 해부생리학 기초', duration: '3시간', thumbnail: '' },
                { id: '3', title: '의료 윤리 사례 분석', duration: '1시간 15분', thumbnail: '' }
              ]
            },
            common_challenges: [
              '많은 양의 이론 지식을 한 번에 습득하기 어려움',
              '의료 용어의 이해가 어려울 수 있음',
              '실습과 이론의 연결이 어려울 수 있음'
            ],
            success_criteria: [
              '간호학 기초 이론을 정확히 이해',
              '인체 구조를 설명할 수 있음',
              '의료 윤리 원칙을 실무에 적용 가능',
              '기본 간호 기술을 수행할 수 있음'
            ]
          }
        },
        {
          phase_id: '2',
          phase_number: 2,
          phase_name: '실습 및 임상 경험',
          description: '병원에서 실제 환자를 돌보며 실무 경험을 쌓습니다.',
          status: 'in_progress',
          progress: 45,
          required_aptitudes: ['관찰', '위기대응'],
          learning_items: [
            { id: '4', title: '병원 실습 (내과)', type: 'practice', completed: true, duration: '160시간' },
            { id: '5', title: '병원 실습 (외과)', type: 'practice', completed: false, duration: '160시간' },
            { id: '6', title: '응급처치 실습', type: 'practice', completed: false, duration: '40시간' }
          ],
          estimated_duration: '1년',
          detailed_info: {
            overview: '실제 병원 환경에서 환자를 직접 돌보며 실무 경험을 쌓는 단계입니다. 이론으로 배운 지식을 실제 상황에 적용하는 중요한 단계입니다.',
            key_points: [
              '환자 상태 관찰 및 기록',
              '의사의 처방 보조',
              '응급 상황 대응',
              '의료진과의 협업'
            ],
            learning_tips: [
              '선배 간호사에게 적극적으로 질문하기',
              '실습 일지를 작성하여 경험 정리',
              '다양한 과별 실습을 통해 경험 확대',
              '환자와의 소통 기술 연습'
            ],
            recommended_resources: {
              books: ['임상 간호 실무', '응급처치 매뉴얼'],
              websites: ['간호 실습 가이드', '임상 간호 정보'],
              courses: ['임상 실습 특강', '응급처치 실습'],
              videos: [
                { id: '4', title: '병원 실습 가이드', duration: '1시간 20분', thumbnail: '' },
                { id: '5', title: '환자 관찰 기술', duration: '45분', thumbnail: '' },
                { id: '6', title: '응급처치 실전 연습', duration: '2시간', thumbnail: '' },
                { id: '7', title: '의료진 협업 방법', duration: '1시간', thumbnail: '' }
              ]
            },
            common_challenges: [
              '실습 환경에 적응하는 데 시간이 걸림',
              '응급 상황에서의 판단력 부족',
              '다양한 환자 유형에 대한 대응 어려움'
            ],
            success_criteria: [
              '환자 상태를 정확히 관찰하고 기록',
              '의사의 처방을 정확히 수행',
              '응급 상황에 적절히 대응',
              '의료진과 원활하게 협업'
            ]
          }
        },
        {
          phase_id: '3',
          phase_number: 3,
          phase_name: '간호사 국가고시 준비',
          description: '간호사 국가고시를 준비하고 자격증을 취득합니다.',
          status: 'upcoming',
          required_aptitudes: ['분석', '문제해결'],
          learning_items: [
            { id: '7', title: '국가고시 필기 준비', type: 'certification', completed: false, duration: '6개월' },
            { id: '8', title: '국가고시 실기 준비', type: 'certification', completed: false, duration: '3개월' }
          ],
          estimated_duration: '1년',
          detailed_info: {
            overview: '간호사 국가고시를 준비하고 합격하여 간호사 자격증을 취득하는 단계입니다. 이 단계를 완료하면 정식 간호사가 됩니다.',
            key_points: [
              '국가고시 필기 시험 준비',
              '국가고시 실기 시험 준비',
              '과목별 집중 학습',
              '모의고사 및 기출 문제 풀이'
            ],
            learning_tips: [
              '과목별로 체계적인 학습 계획 수립',
              '기출 문제를 반복적으로 풀어보기',
              '약한 과목에 집중하여 보완',
              '실기 시험 대비 실습 연습'
            ],
            recommended_resources: {
              books: ['간호사 국가고시 문제집', '간호사 국가고시 핵심 정리'],
              websites: ['간호사 국가고시 정보', '간호사 국가고시 커뮤니티'],
              courses: ['간호사 국가고시 온라인 강의', '국가고시 실기 특강'],
              videos: [
                { id: '8', title: '간호사 국가고시 필기 완벽 가이드', duration: '3시간', thumbnail: '' },
                { id: '9', title: '국가고시 실기 시험 준비법', duration: '2시간 30분', thumbnail: '' },
                { id: '10', title: '과목별 핵심 정리 강의', duration: '5시간', thumbnail: '' }
              ]
            },
            common_challenges: [
              '많은 양의 학습 내용을 정리하기 어려움',
              '실기 시험의 긴장감',
              '시간 관리의 어려움'
            ],
            success_criteria: [
              '국가고시 필기 시험 합격',
              '국가고시 실기 시험 합격',
              '간호사 면허증 취득'
            ]
          }
        },
        {
          phase_id: '4',
          phase_number: 4,
          phase_name: '전문 간호사 성장',
          description: '전문 분야를 선택하고 고급 간호사로 성장합니다.',
          status: 'upcoming',
          required_aptitudes: ['공감', '돌봄', '관찰', '분석'],
          learning_items: [
            { id: '9', title: '전문 간호사 자격 (중환자실)', type: 'certification', completed: false, duration: '1년' },
            { id: '10', title: '간호 관리자 과정', type: 'course', completed: false, duration: '2년' }
          ],
          estimated_duration: '3년',
          detailed_info: {
            overview: '전문 분야를 선택하고 고급 간호사로 성장하는 단계입니다. 전문 간호사 자격을 취득하거나 간호 관리자로 성장할 수 있습니다.',
            key_points: [
              '전문 분야 선택 (중환자실, 응급실 등)',
              '전문 간호사 자격 취득',
              '간호 관리자 과정 이수',
              '지속적인 전문성 개발'
            ],
            learning_tips: [
              '관심 있는 전문 분야를 조기에 결정',
              '해당 분야의 전문가와 네트워킹',
              '관련 자격증 및 교육 과정 이수',
              '실무 경험을 통한 전문성 향상'
            ],
            recommended_resources: {
              books: ['전문 간호사 가이드', '간호 관리론'],
              websites: ['대한간호협회', '전문 간호사 정보'],
              courses: ['전문 간호사 자격 과정', '간호 관리자 과정'],
              videos: [
                { id: '11', title: '전문 간호사가 되는 길', duration: '2시간', thumbnail: '' },
                { id: '12', title: '간호 관리자 역할과 책임', duration: '1시간 30분', thumbnail: '' },
                { id: '13', title: '전문 분야별 간호 실무', duration: '3시간', thumbnail: '' }
              ]
            },
            common_challenges: [
              '전문 분야 선택의 어려움',
              '자격 취득을 위한 시간과 노력',
              '관리자 역할의 책임감'
            ],
            success_criteria: [
              '전문 간호사 자격 취득',
              '전문 분야에서의 실무 경험',
              '간호 관리자로 성장'
            ]
          }
        }
      ]
    },
    '2': {
      career_name: '경찰관',
      career_emoji: '👮',
      phases: [
        {
          phase_id: '1',
          phase_number: 1,
          phase_name: '경찰 기초 교육',
          description: '경찰 공무원 시험 준비 및 기본 소양 교육',
          status: 'completed',
          required_aptitudes: ['분석', '관찰'],
          learning_items: [
            { id: '1', title: '경찰학 개론', type: 'course', completed: true, duration: '80시간' },
            { id: '2', title: '형법/형사소송법', type: 'course', completed: true, duration: '60시간' }
          ],
          estimated_duration: '1년'
        },
        {
          phase_id: '2',
          phase_number: 2,
          phase_name: '경찰공무원 시험 및 채용',
          description: '경찰공무원 시험에 합격하고 경찰교육원에서 교육을 받습니다.',
          status: 'in_progress',
          progress: 30,
          required_aptitudes: ['문제해결', '기획'],
          learning_items: [
            { id: '3', title: '경찰공무원 시험 합격', type: 'certification', completed: true, duration: '1년' },
            { id: '4', title: '경찰교육원 교육', type: 'practice', completed: false, duration: '6개월' }
          ],
          estimated_duration: '1.5년'
        },
        {
          phase_id: '3',
          phase_number: 3,
          phase_name: '순경 근무 및 경력 쌓기',
          description: '순경으로 배치되어 실무 경험을 쌓고 승진을 준비합니다.',
          status: 'upcoming',
          required_aptitudes: ['리더십', '의사결정'],
          learning_items: [
            { id: '5', title: '순경 근무 (3년)', type: 'practice', completed: false, duration: '3년' },
            { id: '6', title: '경위 승진 시험', type: 'certification', completed: false, duration: '1년' }
          ],
          estimated_duration: '4년'
        },
        {
          phase_id: '4',
          phase_number: 4,
          phase_name: '전문 분야 진출',
          description: '수사, 교통, 경비 등 전문 분야로 진출하여 전문가로 성장합니다.',
          status: 'upcoming',
          required_aptitudes: ['분석', '관찰', '문제해결', '기획'],
          learning_items: [
            { id: '7', title: '수사 전문 과정', type: 'course', completed: false, duration: '1년' },
            { id: '8', title: '경감 승진', type: 'certification', completed: false, duration: '5년' }
          ],
          estimated_duration: '6년'
        }
      ]
    },
    '3': {
      career_name: '작가',
      career_emoji: '✍️',
      phases: [
        {
          phase_id: '1',
          phase_number: 1,
          phase_name: '글쓰기 기초 다지기',
          description: '기본적인 글쓰기 기술과 문학 이론을 학습합니다.',
          status: 'completed',
          required_aptitudes: ['글쓰기', '관찰'],
          learning_items: [
            { id: '1', title: '창작 기법 강의', type: 'course', completed: true, duration: '40시간' },
            { id: '2', title: '문학 작품 읽기', type: 'practice', completed: true, duration: '지속적' }
          ],
          estimated_duration: '6개월'
        },
        {
          phase_id: '2',
          phase_number: 2,
          phase_name: '작품 창작 및 발표',
          description: '실제 작품을 창작하고 문학지나 온라인에 발표합니다.',
          status: 'in_progress',
          progress: 60,
          required_aptitudes: ['분석', '관찰'],
          learning_items: [
            { id: '3', title: '단편 소설 창작', type: 'practice', completed: true, duration: '3개월' },
            { id: '4', title: '문학지 투고', type: 'practice', completed: false, duration: '지속적' }
          ],
          estimated_duration: '1년'
        },
        {
          phase_id: '3',
          phase_number: 3,
          phase_name: '출간 및 작가 데뷔',
          description: '첫 작품을 출간하고 작가로 공식 데뷔합니다.',
          status: 'upcoming',
          required_aptitudes: ['글쓰기', '분석', '창의'],
          learning_items: [
            { id: '5', title: '출판사 계약', type: 'certification', completed: false, duration: '6개월~1년' },
            { id: '6', title: '첫 작품 출간', type: 'certification', completed: false, duration: '1년' }
          ],
          estimated_duration: '2년'
        },
        {
          phase_id: '4',
          phase_number: 4,
          phase_name: '전문 작가로 성장',
          description: '지속적인 작품 활동을 통해 전문 작가로 자리잡습니다.',
          status: 'upcoming',
          required_aptitudes: ['글쓰기', '관찰', '분석', '창의'],
          learning_items: [
            { id: '7', title: '연속 작품 출간', type: 'practice', completed: false, duration: '지속적' },
            { id: '8', title: '문학상 수상', type: 'certification', completed: false, duration: '3~5년' }
          ],
          estimated_duration: '5년+'
        }
      ]
    }
  };

  return roadmaps[careerId] || null;
}

