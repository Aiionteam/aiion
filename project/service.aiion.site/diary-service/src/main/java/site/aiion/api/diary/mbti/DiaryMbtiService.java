package site.aiion.api.diary.mbti;

import site.aiion.api.diary.common.domain.Messenger;
import java.util.List;
import java.util.Map;

public interface DiaryMbtiService {
    /**
     * 일기 ID로 MBTI 분석 결과 조회
     */
    Messenger findByDiaryId(Long diaryId);
    
    /**
     * 여러 일기 ID로 MBTI 분석 결과 조회 (일기 목록 조회 시 사용)
     */
    Map<Long, DiaryMbtiModel> findByDiaryIdIn(List<Long> diaryIds);
    
    /**
     * 일기 MBTI 분석 수행 및 저장
     */
    Messenger analyzeAndSave(Long diaryId, String title, String content);
    
    /**
     * 일기 MBTI 분석 수행 및 저장 (비동기)
     */
    void analyzeAndSaveAsync(Long diaryId, String title, String content);
    
    /**
     * 일기 MBTI 분석 결과 삭제
     */
    Messenger deleteByDiaryId(Long diaryId);
}

