package site.aiion.api.pathfinder;

import java.util.*;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class PathfinderAnalysisService {

    private final PathfinderRepository pathfinderRepository;

    // 학습 주제 키워드 매핑
    private static final Map<String, LearningTopic> KEYWORD_MAPPING = new HashMap<>();
    
    static {
        // 의료/응급처치 관련
        KEYWORD_MAPPING.put("병마사", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("군관", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("상처", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("부상", new LearningTopic("응급처치 기초", "🩹", "의료"));
        KEYWORD_MAPPING.put("치료", new LearningTopic("응급처치 기초", "🩹", "의료"));
        
        // 군사/전략 관련
        KEYWORD_MAPPING.put("장전", new LearningTopic("군사 전략 및 무기", "⚔️", "군사"));
        KEYWORD_MAPPING.put("편전", new LearningTopic("군사 전략 및 무기", "⚔️", "군사"));
        KEYWORD_MAPPING.put("활", new LearningTopic("군사 전략 및 무기", "⚔️", "군사"));
        KEYWORD_MAPPING.put("병선", new LearningTopic("군사 전략 및 무기", "⚔️", "군사"));
        KEYWORD_MAPPING.put("진무", new LearningTopic("군사 전략 및 무기", "⚔️", "군사"));
        KEYWORD_MAPPING.put("별방군", new LearningTopic("군사 전략 및 무기", "⚔️", "군사"));
        KEYWORD_MAPPING.put("전투", new LearningTopic("군사 전략 및 무기", "⚔️", "군사"));
        KEYWORD_MAPPING.put("전략", new LearningTopic("군사 전략 및 무기", "⚔️", "군사"));
        
        // 감정/심리 관련
        KEYWORD_MAPPING.put("회포", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("간절", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("그리움", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        KEYWORD_MAPPING.put("감정", new LearningTopic("감정 표현 및 관리", "💭", "심리"));
        
        // 글쓰기/문서 관련
        KEYWORD_MAPPING.put("편지", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        KEYWORD_MAPPING.put("전문", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        KEYWORD_MAPPING.put("공문", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        KEYWORD_MAPPING.put("기록", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        KEYWORD_MAPPING.put("문서", new LearningTopic("글쓰기 및 기록", "✍️", "문서"));
        
        // 기상/날씨 관련
        KEYWORD_MAPPING.put("맑다", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("비", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("눈", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("흐리", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("날씨", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        KEYWORD_MAPPING.put("기상", new LearningTopic("기상 관찰 및 기록", "🌤️", "기상"));
        
        // 역사/문화 관련
        KEYWORD_MAPPING.put("이순신", new LearningTopic("역사 및 인물", "📚", "역사"));
        KEYWORD_MAPPING.put("제삿날", new LearningTopic("역사 및 인물", "📚", "역사"));
        KEYWORD_MAPPING.put("역사", new LearningTopic("역사 및 인물", "📚", "역사"));
    }

    /**
     * 일기 데이터를 분석하여 학습 주제를 추출
     * 
     * @param userId 사용자 ID
     * @return 학습 추천 목록
     */
    public List<LearningRecommendation> analyzeDiariesAndExtractLearningTopics(Long userId) {
        log.info("일기 데이터 분석 시작 - userId: {}", userId);
        
        // 사용자의 일기 데이터 조회
        List<Pathfinder> diaries = pathfinderRepository.findByUserId(userId);
        
        if (diaries.isEmpty()) {
            log.warn("일기 데이터가 없습니다 - userId: {}", userId);
            return new ArrayList<>();
        }
        
        log.info("분석할 일기 개수: {}", diaries.size());
        
        // 키워드 빈도수 계산
        Map<String, Integer> keywordFrequency = new HashMap<>();
        Map<String, List<String>> topicToDiarySnippets = new HashMap<>();
        
        for (Pathfinder diary : diaries) {
            String content = diary.getDescription();
            if (content == null || content.trim().isEmpty()) {
                continue;
            }
            
            // 각 키워드가 일기 내용에 포함되어 있는지 확인
            for (Map.Entry<String, LearningTopic> entry : KEYWORD_MAPPING.entrySet()) {
                String keyword = entry.getKey();
                LearningTopic topic = entry.getValue();
                
                if (content.contains(keyword)) {
                    // 키워드 빈도수 증가
                    keywordFrequency.put(topic.getTitle(), 
                        keywordFrequency.getOrDefault(topic.getTitle(), 0) + 1);
                    
                    // 관련 일기 문장 저장 (키워드 주변 텍스트 추출)
                    String snippet = extractSnippet(content, keyword);
                    topicToDiarySnippets.computeIfAbsent(topic.getTitle(), k -> new ArrayList<>())
                        .add(snippet);
                }
            }
        }
        
        // 빈도수 기준으로 정렬하여 상위 학습 주제 추출
        List<LearningRecommendation> recommendations = keywordFrequency.entrySet().stream()
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
            .limit(10) // 상위 10개만
            .map(entry -> {
                String topicTitle = entry.getKey();
                int frequency = entry.getValue();
                LearningTopic topic = findTopicByTitle(topicTitle);
                
                if (topic != null) {
                    List<String> snippets = topicToDiarySnippets.getOrDefault(topicTitle, new ArrayList<>());
                    String relatedDiary = snippets.isEmpty() ? "" : snippets.get(0);
                    
                    return LearningRecommendation.builder()
                        .title(topic.getTitle())
                        .emoji(topic.getEmoji())
                        .category(topic.getCategory())
                        .frequency(frequency)
                        .reason(generateReason(topic, frequency, relatedDiary))
                        .relatedDiary(relatedDiary)
                        .quickLearn(generateQuickLearn(topic))
                        .build();
                }
                return null;
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        
        log.info("학습 추천 생성 완료 - {}개", recommendations.size());
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
        quickLearnMap.put("군사 전략 및 무기", "고대 무기의 종류와 사용법, 군사 전략의 기본 원리를 학습합니다.");
        quickLearnMap.put("감정 표현 및 관리", "감정을 건강하게 표현하고 관리하는 방법을 학습합니다.");
        quickLearnMap.put("글쓰기 및 기록", "효과적인 글쓰기와 기록 방법을 학습합니다.");
        quickLearnMap.put("기상 관찰 및 기록", "날씨 관찰과 기록 방법을 학습합니다.");
        quickLearnMap.put("역사 및 인물", "역사적 사건과 인물에 대한 이해를 높입니다.");
        
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
        
        // 군사 전략 및 무기
        videoMap.put("군사 전략 및 무기", Arrays.asList(
            VideoInfo.builder().id("v4").title("고대 무기 개론").duration("18분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v5").title("군사 전략의 역사").duration("25분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v6").title("전투 기술 실습").duration("22분").thumbnail("https://via.placeholder.com/300x200").build()
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
            VideoInfo.builder().id("v12").title("문서 작성법").duration("18분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        // 기상 관찰 및 기록
        videoMap.put("기상 관찰 및 기록", Arrays.asList(
            VideoInfo.builder().id("v13").title("기상 관측 기초").duration("14분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v14").title("날씨 기록법").duration("12분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v15").title("기상 현상 이해").duration("16분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        // 역사 및 인물
        videoMap.put("역사 및 인물", Arrays.asList(
            VideoInfo.builder().id("v16").title("역사 연구 방법론").duration("18분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v17").title("역사적 인물 분석").duration("22분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v18").title("역사 기록 해석").duration("20분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
        
        return videoMap.getOrDefault(title, Arrays.asList(
            VideoInfo.builder().id("v_default_1").title(title + " 기초 강의").duration("15분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v_default_2").title(title + " 실전 응용").duration("20분").thumbnail("https://via.placeholder.com/300x200").build(),
            VideoInfo.builder().id("v_default_3").title(title + " 심화 학습").duration("18분").thumbnail("https://via.placeholder.com/300x200").build()
        ));
    }
}

