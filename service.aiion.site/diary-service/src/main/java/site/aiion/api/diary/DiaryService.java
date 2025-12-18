package site.aiion.api.diary;

import java.util.List;
import site.aiion.api.diary.common.domain.Messenger;

public interface DiaryService {
    public Messenger findById(DiaryModel diaryModel);
    public Messenger findAll();
    public Messenger findByUserId(Long userId);
    public Messenger save(DiaryModel diaryModel);
    public Messenger saveAll(List<DiaryModel> diaryModelList);
    public Messenger update(DiaryModel diaryModel);
    public Messenger delete(DiaryModel diaryModel);
    /**
     * 기존 일기 일괄 재분석 (수동 실행용)
     * 모델 재학습 후 기존 일기들을 새 모델로 재분석
     */
    public Messenger reanalyzeEmotionsForUser(Long userId);
    
    /**
     * 모든 일기 감정 분석 (수동 실행용)
     * 일기 테이블의 모든 일기를 분석합니다
     */
    public Messenger reanalyzeAllEmotions();
    
    /**
     * 특정 사용자의 모든 일기 MBTI 분석 재실행
     */
    public Messenger reanalyzeMbtiForUser(Long userId);
    
    /**
     * 모든 일기 MBTI 분석 (수동 실행용)
     * 일기 테이블의 모든 일기를 분석합니다
     */
    public Messenger reanalyzeAllMbti();
}

