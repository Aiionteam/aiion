package site.aiion.api.pathfinder;

import java.util.*;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import site.aiion.api.pathfinder.client.DiaryServiceClient;

@Slf4j
@Service
@RequiredArgsConstructor
public class PathfinderAnalysisService {

    private final DiaryServiceClient diaryServiceClient;
    private final site.aiion.api.pathfinder.client.MLServiceClient mlServiceClient;

    // 학습 주제 키워드 매핑
    private static final Map<String, LearningTopic> KEYWORD_MAPPING = new HashMap<>();
    
    static {
        // 의료/건강 관련 (현대 키워드)
        KEYWORD_MAPPING.put("병원", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("의사", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("상처", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("부상", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("치료", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("아픔", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("다쳤", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("응급", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("건강", new LearningTopic("응급처치 기초", "🩹", "의료"));
        
        // 요리/음식 관련
        KEYWORD_MAPPING.put("요리", new LearningTopic("요리 기초", "🍳", "생활"));
        KEYWORD_MAPPING.put("음식", new LearningTopic("요리 기초", "🍳", "생활"));
        KEYWORD_MAPPING.put("레시피", new LearningTopic("요리 기초", "🍳", "생활"));
        KEYWORD_MAPPING.put("요리법", new LearningTopic("요리 기초", "🍳", "생활"));
        KEYWORD_MAPPING.put("조리", new LearningTopic("요리 기초", "🍳", "생활"));
        KEYWORD_MAPPING.put("맛있", new LearningTopic("요리 기초", "🍳", "생활"));
        KEYWORD_MAPPING.put("식사", new LearningTopic("요리 기초", "🍳", "생활"));
        
        // 감정/심리 관련
        KEYWORD_MAPPING.put("행복", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("슬픔", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("화남", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("기쁨", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("우울", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("스트레스", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("감정", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("마음", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("그리움", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        
        // 글쓰기/문서 관련
        KEYWORD_MAPPING.put("일기", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        KEYWORD_MAPPING.put("글쓰기", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        KEYWORD_MAPPING.put("기록", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        KEYWORD_MAPPING.put("문서", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        KEYWORD_MAPPING.put("작성", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        KEYWORD_MAPPING.put("메모", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        
        // 운동/건강 관련
        KEYWORD_MAPPING.put("운동", new LearningTopic("운동 및 피트니스", "🏃", "건강"));
        KEYWORD_MAPPING.put("헬스", new LearningTopic("운동 및 피트니스", "🏃", "건강"));
        KEYWORD_MAPPING.put("달리기", new LearningTopic("운동 및 피트니스", "🏃", "건강"));
        KEYWORD_MAPPING.put("요가", new LearningTopic("운동 및 피트니스", "🏃", "건강"));
        KEYWORD_MAPPING.put("피트니스", new LearningTopic("운동 및 피트니스", "🏃", "건강"));
        
        // 날씨/기상 관련
        KEYWORD_MAPPING.put("날씨", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("비", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("눈", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("맑", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("흐림", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("기온", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        
        // 학습/교육 관련
        KEYWORD_MAPPING.put("공부", new LearningTopic("학습 방법론", "📚", "교육"));
        KEYWORD_MAPPING.put("학습", new LearningTopic("학습 방법론", "📚", "교육"));
        KEYWORD_MAPPING.put("공부법", new LearningTopic("학습 방법론", "📚", "교육"));
        KEYWORD_MAPPING.put("시험", new LearningTopic("학습 방법론", "📚", "교육"));
        KEYWORD_MAPPING.put("수업", new LearningTopic("학습 방법론", "📚", "교육"));
        
        // 여행/문화 관련
        KEYWORD_MAPPING.put("여행", new LearningTopic("여행 계획 및 준비", "✈️", "문화"));
        KEYWORD_MAPPING.put("여행지", new LearningTopic("여행 계획 및 준비", "✈️", "문화"));
        KEYWORD_MAPPING.put("관광", new LearningTopic("여행 계획 및 준비", "✈️", "문화"));
        KEYWORD_MAPPING.put("문화", new LearningTopic("여행 계획 및 준비", "✈️", "문화"));
    }

    /**
     * 일기 데이터를 분석하여 학습 주제를 추출 (ML 기반)
     * 
     * @param userId 사용자 ID
     * @return 학습 추천 목록
     */
    public List<LearningRecommendation> analyzeDiariesAndExtractLearningTopics(Long userId) {
        log.info("ML 기반 일기 데이터 분석 시작 - userId: {}", userId);
        
        // ML 서비스를 통해 추천 생성
        List<LearningRecommendation> recommendations = mlServiceClient.getMLRecommendations(userId);
        
        // 상위 10개만 반환
        if (recommendations.size() > 10) {
            recommendations = recommendations.subList(0, 10);
        }
        
        log.info("ML 기반 학습 추천 생성 완료 - {}개", recommendations.size());
        return recommendations;
    }

    /**
     * 키워드 주변 텍스트 추출 (관련 일기 문장)
     */
    private String extractSnippet(String content, String keyword) {
        int keywordIndex = content.indexOf(keyword);
        if (keywordIndex == -1) {
            return content.length() > 100 ? content.substring(0, 100) + "..." : content;
        }
        
        int start = Math.max(0, keywordIndex - 50);
        int end = Math.min(content.length(), keywordIndex + keyword.length() + 50);
        
        String snippet = content.substring(start, end);
        if (start > 0) snippet = "..." + snippet;
        if (end < content.length()) snippet = snippet + "...";
        
        return snippet.trim();
    }

    /**
     * 제목으로 LearningTopic 찾기
     */
    private LearningTopic findTopicByTitle(String title) {
        return KEYWORD_MAPPING.values().stream()
            .filter(topic -> topic.getTitle().equals(title))
            .findFirst()
            .orElse(null);
    }

    /**
     * 추천 이유 생성
     */
    private String generateReason(LearningTopic topic, int frequency, String relatedDiary) {
        StringBuilder reason = new StringBuilder();
        reason.append("일기에서 ").append(topic.getTitle()).append(" 관련 내용이 ");
        reason.append(frequency).append("회 발견되었습니다. ");
        
        if (relatedDiary != null && !relatedDiary.isEmpty()) {
            reason.append("예: \"").append(relatedDiary).append("\"");
        }
        
        return reason.toString();
    }

    /**
     * 간단 학습 내용 생성
     */
    private String generateQuickLearn(LearningTopic topic) {
        Map<String, String> quickLearnMap = new HashMap<>();
        quickLearnMap.put("응급처치 기초", "응급상황에서 기본적인 처치 방법을 배웁니다. 상처 관리, 지혈법, 골절 대응 등을 학습합니다.");
        quickLearnMap.put("요리 기초", "기본적인 요리 기술과 레시피를 배웁니다. 간단한 요리부터 시작하여 점진적으로 실력을 향상시킵니다.");
        quickLearnMap.put("감정 표현 및 관리", "감정을 건강하게 표현하고 관리하는 방법을 학습합니다. 감정 인식, 표현 기법, 스트레스 관리 등을 다룹니다.");
        quickLearnMap.put("글쓰기 및 기록", "효과적인 글쓰기와 기록 방법을 학습합니다. 일기 쓰기, 메모 작성, 문서 작성 등의 기술을 향상시킵니다.");
        quickLearnMap.put("운동 및 피트니스", "건강한 신체를 위한 운동 방법을 배웁니다. 유산소 운동, 근력 운동, 유연성 향상 등을 학습합니다.");
        quickLearnMap.put("기상 관찰 및 기록", "날씨 관찰과 기록 방법을 학습합니다. 기상 현상 이해, 날씨 예보 읽기 등을 다룹니다.");
        quickLearnMap.put("학습 방법론", "효과적인 학습 방법과 공부 기법을 배웁니다. 집중력 향상, 기억력 강화, 시험 대비 전략 등을 학습합니다.");
        quickLearnMap.put("여행 계획 및 준비", "체계적인 여행 계획과 준비 방법을 배웁니다. 여행지 조사, 예약, 준비물 체크 등을 학습합니다.");
        
        return quickLearnMap.getOrDefault(topic.getTitle(), 
            topic.getTitle() + "에 대한 기본 지식을 학습합니다.");
    }

    /**
     * 학습 주제 정보 클래스
     */
    private static class LearningTopic {
        private final String title;
        private final String emoji;
        private final String category;

        public LearningTopic(String title, String emoji, String category) {
            this.title = title;
            this.emoji = emoji;
            this.category = category;
        }

        public String getTitle() { return title; }
        public String getEmoji() { return emoji; }
        public String getCategory() { return category; }
    }

    /**
     * 종합 학습 추천 결과 (프론트엔드용)
     */
    @lombok.Data
    @lombok.Builder
    public static class ComprehensiveRecommendation {
        private List<LearningRecommendation> recommendations; // 일기에서 발견한 학습 기회
        private List<String> popularTopics; // 인기 학습 주제
        private List<CategoryInfo> categories; // 카테고리별 탐색
        private RecommendationStats stats; // 통계 정보
    }

    /**
     * 학습 추천 결과 클래스
     */
    @lombok.Data
    @lombok.Builder
    public static class LearningRecommendation {
        private String id;
        private String title;
        private String emoji;
        private String category;
        private int frequency;
        private String reason;
        private String relatedDiary;
        private String quickLearn;
        private List<VideoInfo> videos; // 추천 영상 3개
    }

    /**
     * 영상 정보
     */
    @lombok.Data
    @lombok.Builder
    public static class VideoInfo {
        private String id;
        private String title;
        private String duration;
        private String thumbnail;
    }

    /**
     * 카테고리 정보
     */
    @lombok.Data
    @lombok.Builder
    public static class CategoryInfo {
        private String id;
        private String name;
        private String emoji;
        private int count;
    }

    /**
     * 통계 정보
     */
    @lombok.Data
    @lombok.Builder
    public static class RecommendationStats {
        private int discovered; // 발견한 학습
        private int inProgress; // 진행중
        private int completed; // 완료
    }

    /**
     * 종합 학습 추천 생성 (프론트엔드용)
     * 
     * @param userId 사용자 ID
     * @return 종합 학습 추천 결과
     */
    public ComprehensiveRecommendation generateComprehensiveRecommendations(Long userId) {
        log.info("종합 학습 추천 생성 시작 - userId: {}", userId);
        
        // 기본 학습 추천 목록
        List<LearningRecommendation> recommendations = analyzeDiariesAndExtractLearningTopics(userId);
        
        // 영상 정보 추가
        recommendations = recommendations.stream()
            .map(rec -> {
                rec.setId(generateId(rec.getTitle()));
                rec.setVideos(generateVideos(rec.getTitle()));
                return rec;
            })
            .collect(Collectors.toList());
        
        // 인기 학습 주제 추출 (빈도수 기준 상위 6개)
        List<String> popularTopics = recommendations.stream()
            .sorted((a, b) -> Integer.compare(b.getFrequency(), a.getFrequency()))
            .limit(6)
            .map(LearningRecommendation::getTitle)
            .collect(Collectors.toList());
        
        // 카테고리별 그룹화 및 카운트
        Map<String, Integer> categoryCount = new HashMap<>();
        Map<String, String> categoryEmoji = new HashMap<>();
        
        for (LearningRecommendation rec : recommendations) {
            String category = rec.getCategory();
            categoryCount.put(category, categoryCount.getOrDefault(category, 0) + 1);
            categoryEmoji.put(category, rec.getEmoji());
        }
        
        // 카테고리 정보 생성
        List<CategoryInfo> categories = categoryCount.entrySet().stream()
            .map(entry -> CategoryInfo.builder()
                .id(entry.getKey())
                .name(entry.getKey())
                .emoji(categoryEmoji.getOrDefault(entry.getKey(), "📚"))
                .count(entry.getValue())
                .build())
            .collect(Collectors.toList());
        
        // 통계 정보 생성 (더미 데이터 - 추후 실제 학습 진행 상태와 연동)
        RecommendationStats stats = RecommendationStats.builder()
            .discovered(recommendations.size())
            .inProgress(0) // 추후 실제 진행중 학습 데이터와 연동
            .completed(0)  // 추후 실제 완료 학습 데이터와 연동
            .build();
        
        return ComprehensiveRecommendation.builder()
            .recommendations(recommendations)
            .popularTopics(popularTopics)
            .categories(categories)
            .stats(stats)
            .build();
    }

    /**
     * ID 생성
     */
    private String generateId(String title) {
        return String.valueOf(title.hashCode());
    }

    /**
     * 추천 영상 정보 생성
     */
    private List<VideoInfo> generateVideos(String title) {
        Map<String, List<VideoInfo>> videoMap = new HashMap<>();
        
        // 응급처치 기초
        videoMap.put("응급처치 기초", Arrays.asList(
            VideoInfo.builder().id("v1").title("응급처치 기초 강의").duration("15분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v2").title("실전 응급처치 시뮬레이션").duration("20분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v3").title("응급처치 도구 사용법").duration("10분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        // 요리 기초
        videoMap.put("요리 기초", Arrays.asList(
            VideoInfo.builder().id("v4").title("초보자를 위한 요리 기초").duration("18분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v5").title("간단한 일상 요리 레시피").duration("15분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v6").title("요리 도구 사용법").duration("12분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        // 감정 표현 및 관리
        videoMap.put("감정 표현 및 관리", Arrays.asList(
            VideoInfo.builder().id("v7").title("감정 인식과 표현").duration("12분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v8").title("감정 관리 기법").duration("16분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v9").title("마음챙김과 감정").duration("14분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        // 글쓰기 및 기록
        videoMap.put("글쓰기 및 기록", Arrays.asList(
            VideoInfo.builder().id("v10").title("글쓰기 기초").duration("20분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v11").title("기록의 기술").duration("15분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v12").title("일기 쓰기의 힘").duration("18분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        // 운동 및 피트니스
        videoMap.put("운동 및 피트니스", Arrays.asList(
            VideoInfo.builder().id("v13").title("초보자를 위한 운동 가이드").duration("20분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v14").title("홈 트레이닝 기초").duration("15분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v15").title("운동 루틴 만들기").duration("18분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        // 기상 관찰 및 기록
        videoMap.put("기상 관찰 및 기록", Arrays.asList(
            VideoInfo.builder().id("v16").title("기상 관측 기초").duration("14분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v17").title("날씨 기록법").duration("12분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v18").title("기상 현상 이해").duration("16분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        // 학습 방법론
        videoMap.put("학습 방법론", Arrays.asList(
            VideoInfo.builder().id("v19").title("효과적인 공부법").duration("18분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v20").title("집중력 향상 기법").duration("15분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v21").title("기억력 강화 방법").duration("20분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        // 여행 계획 및 준비
        videoMap.put("여행 계획 및 준비", Arrays.asList(
            VideoInfo.builder().id("v22").title("여행 계획 세우기").duration("16분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v23").title("여행 준비물 체크리스트").duration("12분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v24").title("여행 예산 관리").duration("14분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        return videoMap.getOrDefault(title, Arrays.asList(
            VideoInfo.builder().id("v_default_1").title(title + " 기초 강의").duration("15분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v_default_2").title(title + " 실전 응용").duration("20분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v_default_3").title(title + " 심화 학습").duration("18분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
    }
}

