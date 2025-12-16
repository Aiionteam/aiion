package site.aiion.api.diary;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import site.aiion.api.diary.common.domain.Messenger;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class DiaryServiceImpl implements DiaryService {

    private final DiaryRepository diaryRepository;
    private final site.aiion.api.diary.emotion.DiaryEmotionService diaryEmotionService;
    private final site.aiion.api.diary.mbti.DiaryMbtiService diaryMbtiService;
    private final JdbcTemplate jdbcTemplate;

    private DiaryModel entityToModel(Diary entity) {
        // 감정 분석 결과 조회
        site.aiion.api.diary.common.domain.Messenger emotionResult = diaryEmotionService.findByDiaryId(entity.getId());
        
        DiaryModel.DiaryModelBuilder builder = DiaryModel.builder()
                .id(entity.getId())
                .diaryDate(entity.getDiaryDate())
                .title(entity.getTitle())
                .content(entity.getContent())
                .userId(entity.getUserId());
        
        // 감정 분석 결과가 있으면 추가
        if (emotionResult != null && emotionResult.getCode() == 200 && emotionResult.getData() != null) {
            site.aiion.api.diary.emotion.DiaryEmotionModel emotion = 
                (site.aiion.api.diary.emotion.DiaryEmotionModel) emotionResult.getData();
            builder.emotion(emotion.getEmotion())
                   .emotionLabel(emotion.getEmotionLabel())
                   .emotionConfidence(emotion.getConfidence());
        }
        
        return builder.build();
    }

    private DiaryModel entityToModel(Diary entity, Map<Long, site.aiion.api.diary.emotion.DiaryEmotionModel> emotionMap) {
        return entityToModel(entity, emotionMap, Map.of());
    }
    
    private DiaryModel entityToModel(
            Diary entity, 
            Map<Long, site.aiion.api.diary.emotion.DiaryEmotionModel> emotionMap,
            Map<Long, site.aiion.api.diary.mbti.DiaryMbtiModel> mbtiMap) {
        DiaryModel.DiaryModelBuilder builder = DiaryModel.builder()
                .id(entity.getId())
                .diaryDate(entity.getDiaryDate())
                .title(entity.getTitle())
                .content(entity.getContent())
                .userId(entity.getUserId());
        
        // 감정 분석 결과가 있으면 추가
        site.aiion.api.diary.emotion.DiaryEmotionModel emotion = emotionMap.get(entity.getId());
        if (emotion != null) {
            builder.emotion(emotion.getEmotion())
                   .emotionLabel(emotion.getEmotionLabel())
                   .emotionConfidence(emotion.getConfidence())
                   .emotionProbabilities(emotion.getProbabilities());
        }
        
        // MBTI 분석 결과가 있으면 추가
        site.aiion.api.diary.mbti.DiaryMbtiModel mbti = mbtiMap.get(entity.getId());
        if (mbti != null) {
            builder.mbtiType(mbti.getMbtiType())
                   .mbtiConfidence(mbti.getConfidence())
                   .mbtiDimensionPercentages(mbti.getDimensionPercentages());
        }
        
        return builder.build();
    }

    private Diary modelToEntity(DiaryModel model) {
        return Diary.builder()
                .id(model.getId())
                .diaryDate(model.getDiaryDate())
                .title(model.getTitle())
                .content(model.getContent())
                .userId(model.getUserId())
                .build();
    }

    @Override
    public Messenger findById(DiaryModel diaryModel) {
        if (diaryModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (diaryModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Diary> entity = diaryRepository.findById(diaryModel.getId());
        if (entity.isPresent()) {
            Diary diary = entity.get();
            // userId 검증: 다른 사용자의 일기는 조회 불가
            if (!diary.getUserId().equals(diaryModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 일기는 조회할 수 없습니다.")
                        .build();
            }
            // 일괄 조회 방식 사용 (N+1 문제 해결)
            List<Long> diaryIds = List.of(diary.getId());
            Map<Long, site.aiion.api.diary.emotion.DiaryEmotionModel> emotionMap = 
                diaryEmotionService.findByDiaryIdIn(diaryIds);
            Map<Long, site.aiion.api.diary.mbti.DiaryMbtiModel> mbtiMap = Map.of();
            try {
                mbtiMap = diaryMbtiService.findByDiaryIdIn(diaryIds);
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + diary.getId() + " MBTI 조회 실패: " + e.getMessage());
            }
            DiaryModel model = entityToModel(diary, emotionMap, mbtiMap);
            return Messenger.builder()
                    .code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("일기를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findAll() {
        List<Diary> entities = diaryRepository.findAll();
        
        // 일괄 조회로 N+1 문제 해결
        List<Long> diaryIds = entities.stream()
                .map(Diary::getId)
                .collect(Collectors.toList());
        Map<Long, site.aiion.api.diary.emotion.DiaryEmotionModel> emotionMap = 
            diaryEmotionService.findByDiaryIdIn(diaryIds);
        Map<Long, site.aiion.api.diary.mbti.DiaryMbtiModel> mbtiMap;
        try {
            mbtiMap = diaryMbtiService.findByDiaryIdIn(diaryIds);
        } catch (Exception e) {
            System.err.println("[DiaryServiceImpl] 전체 조회 시 MBTI 일괄 조회 실패: " + e.getMessage());
            mbtiMap = Map.of();
        }
        final Map<Long, site.aiion.api.diary.mbti.DiaryMbtiModel> finalMbtiMap = mbtiMap;
        
        List<DiaryModel> modelList = entities.stream()
                .map(entity -> entityToModel(entity, emotionMap, finalMbtiMap))
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("전체 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    public Messenger findByUserId(Long userId) {
        if (userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        List<Diary> entities = diaryRepository.findByUserId(userId);
        
        // 일괄 조회로 N+1 문제 해결
        List<Long> diaryIds = entities.stream()
                .map(Diary::getId)
                .collect(Collectors.toList());
        
        Map<Long, site.aiion.api.diary.emotion.DiaryEmotionModel> emotionMap = 
            diaryEmotionService.findByDiaryIdIn(diaryIds);
        Map<Long, site.aiion.api.diary.mbti.DiaryMbtiModel> mbtiMap;
        try {
            mbtiMap = diaryMbtiService.findByDiaryIdIn(diaryIds);
        } catch (Exception e) {
            System.err.println("[DiaryServiceImpl] MBTI 일괄 조회 실패: " + e.getMessage());
            mbtiMap = Map.of();
        }
        final Map<Long, site.aiion.api.diary.mbti.DiaryMbtiModel> finalMbtiMap = mbtiMap;
        
        // 감정 분석 및 MBTI 분석 결과를 포함하여 모델 변환
        List<DiaryModel> modelList = entities.stream()
                .map(entity -> entityToModel(entity, emotionMap, finalMbtiMap))
                .collect(Collectors.toList());
        
        return Messenger.builder()
                .code(200)
                .message("사용자별 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(DiaryModel diaryModel) {
        if (diaryModel.getDiaryDate() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("일자 정보는 필수 값입니다.")
                    .build();
        }

        // userId가 필수값
        if (diaryModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID는 필수 값입니다.")
                    .build();
        }

        // 새 일기 저장 시 ID를 null로 설정 (데이터베이스에서 자동 생성)
        Diary entity = Diary.builder()
                .id(null)  // 새 엔티티는 ID를 null로 설정
                .diaryDate(diaryModel.getDiaryDate())
                .title(diaryModel.getTitle())
                .content(diaryModel.getContent())
                .userId(diaryModel.getUserId())
                .build();

        Diary saved;
        try {
            saved = diaryRepository.save(entity);
        } catch (DataIntegrityViolationException e) {
            // duplicate key 에러 발생 시 시퀀스 재설정 후 재시도
            if (e.getMessage() != null && e.getMessage().contains("duplicate key")) {
                System.out.println("[DiaryServiceImpl] Duplicate key 에러 발생, 시퀀스 재설정 중...");
                try {
                    String maxIdQuery = "SELECT COALESCE(MAX(id), 0) FROM diaries";
                    Integer maxId = jdbcTemplate.queryForObject(maxIdQuery, Integer.class);
                    if (maxId != null && maxId > 0) {
                        String resetSequence = String.format("SELECT setval('diaries_id_seq', %d, true)", maxId);
                        jdbcTemplate.execute(resetSequence);
                        System.out.println("[DiaryServiceImpl] 시퀀스 재설정 완료: " + maxId);
                    }
                    // 재시도
                    saved = diaryRepository.save(entity);
                } catch (Exception ex) {
                    System.err.println("[DiaryServiceImpl] 시퀀스 재설정 실패: " + ex.getMessage());
                    throw e; // 원래 예외를 다시 던짐
                }
            } else {
                throw e; // 다른 에러는 그대로 던짐
            }
        }

        // 감정 분석 파이프라인 실행 (비동기)
        log.info("[DiaryServiceImpl] 일기 ID {} 저장 완료. 감정 분석 시작 (비동기)...", saved.getId());
        diaryEmotionService.analyzeAndSaveAsync(saved.getId(), saved.getTitle(), saved.getContent());
        
        // MBTI 분석 파이프라인 실행 (비동기)
        log.info("[DiaryServiceImpl] 일기 ID {} MBTI 분석 시작 (비동기)...", saved.getId());
        diaryMbtiService.analyzeAndSaveAsync(saved.getId(), saved.getTitle(), saved.getContent());

        // 일괄 조회 방식 사용 (N+1 문제 해결)
        List<Long> diaryIds = List.of(saved.getId());
        Map<Long, site.aiion.api.diary.emotion.DiaryEmotionModel> emotionMap =
            diaryEmotionService.findByDiaryIdIn(diaryIds);
        
        // MBTI 조회는 예외가 발생해도 일기 저장은 성공으로 처리
        Map<Long, site.aiion.api.diary.mbti.DiaryMbtiModel> mbtiMap = Map.of();
        try {
            mbtiMap = diaryMbtiService.findByDiaryIdIn(diaryIds);
        } catch (Exception e) {
            System.err.println("[DiaryServiceImpl] 일기 ID " + saved.getId() + " MBTI 조회 실패: " + e.getMessage());
            // MBTI 조회 실패해도 일기 저장은 성공으로 처리
        }
        
        DiaryModel model = entityToModel(saved, emotionMap, mbtiMap);
        return Messenger.builder()
                .code(200)
                .message("저장 성공: " + saved.getId())
                .data(model)
                .build();
    }

    @Override
    @Transactional
    public Messenger saveAll(List<DiaryModel> diaryModelList) {
        // userId가 없는 항목이 있는지 확인
        boolean hasNullUserId = diaryModelList.stream()
                .anyMatch(model -> model.getUserId() == null);
        
        if (hasNullUserId) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID는 필수 값입니다. 모든 일기에 사용자 ID를 설정해주세요.")
                    .build();
        }
        
        // 새 일기 저장 시 모든 ID를 null로 설정
        List<Diary> entities = diaryModelList.stream()
                .map(model -> Diary.builder()
                        .id(null)  // 새 엔티티는 ID를 null로 설정
                        .diaryDate(model.getDiaryDate())
                        .title(model.getTitle())
                        .content(model.getContent())
                        .userId(model.getUserId())
                        .build())
                .collect(Collectors.toList());
        
        List<Diary> saved = diaryRepository.saveAll(entities);
        
        // 일괄 저장된 일기들에 대해 감정 분석 및 MBTI 분석 수행 (비동기로 처리)
        for (Diary diary : saved) {
            // 감정 분석
            try {
                site.aiion.api.diary.common.domain.Messenger result = 
                    diaryEmotionService.analyzeAndSave(diary.getId(), diary.getTitle(), diary.getContent());
                if (result.getCode() != 200) {
                    System.err.println("[DiaryServiceImpl] 일기 ID " + diary.getId() + " 감정 분석 실패: " + result.getMessage());
                }
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + diary.getId() + " 감정 분석 실패: " + e.getMessage());
            }
            
            // MBTI 분석
            try {
                site.aiion.api.diary.common.domain.Messenger result = 
                    diaryMbtiService.analyzeAndSave(diary.getId(), diary.getTitle(), diary.getContent());
                if (result.getCode() != 200) {
                    System.err.println("[DiaryServiceImpl] 일기 ID " + diary.getId() + " MBTI 분석 실패: " + result.getMessage());
                }
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + diary.getId() + " MBTI 분석 실패: " + e.getMessage());
            }
        }
        
        return Messenger.builder()
                .code(200)
                .message("일괄 저장 성공: " + saved.size() + "개")
                .build();
    }

    @Override
    @Transactional
    public Messenger update(DiaryModel diaryModel) {
        if (diaryModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (diaryModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Diary> optionalEntity = diaryRepository.findById(diaryModel.getId());
        if (optionalEntity.isPresent()) {
            Diary existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 일기는 수정 불가
            if (!existing.getUserId().equals(diaryModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 일기는 수정할 수 없습니다.")
                        .build();
            }
            
            Diary updated = Diary.builder()
                    .id(existing.getId())
                    .diaryDate(diaryModel.getDiaryDate() != null ? diaryModel.getDiaryDate() : existing.getDiaryDate())
                    .title(diaryModel.getTitle() != null ? diaryModel.getTitle() : existing.getTitle())
                    .content(diaryModel.getContent() != null ? diaryModel.getContent() : existing.getContent())
                    .userId(existing.getUserId()) // userId는 변경 불가
                    .build();
            
            Diary saved = diaryRepository.save(updated);
            
            // 일기 수정 시 감정 분석 재실행 (비동기)
            log.info("[DiaryServiceImpl] 일기 ID {} 감정 분석 시작 (비동기)", saved.getId());
            diaryEmotionService.analyzeAndSaveAsync(saved.getId(), saved.getTitle(), saved.getContent());
            
            // 일기 수정 시 MBTI 분석 재실행 (비동기)
            log.info("[DiaryServiceImpl] 일기 ID {} MBTI 분석 시작 (비동기)", saved.getId());
            diaryMbtiService.analyzeAndSaveAsync(saved.getId(), saved.getTitle(), saved.getContent());
            
            // 일괄 조회 방식 사용 (N+1 문제 해결)
            List<Long> diaryIds = List.of(saved.getId());
            Map<Long, site.aiion.api.diary.emotion.DiaryEmotionModel> emotionMap = 
                diaryEmotionService.findByDiaryIdIn(diaryIds);
            Map<Long, site.aiion.api.diary.mbti.DiaryMbtiModel> mbtiMap = Map.of();
            try {
                mbtiMap = diaryMbtiService.findByDiaryIdIn(diaryIds);
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + saved.getId() + " MBTI 조회 실패 (수정): " + e.getMessage());
            }
            DiaryModel model = entityToModel(saved, emotionMap, mbtiMap);
            return Messenger.builder()
                    .code(200)
                    .message("수정 성공: " + diaryModel.getId())
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("수정할 일기를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(DiaryModel diaryModel) {
        // 일기 삭제 전에 감정 분석 및 MBTI 분석 결과도 함께 삭제
        if (diaryModel.getId() != null) {
            boolean emotionDeleteSuccess = true;
            boolean mbtiDeleteSuccess = true;
            
            // 감정 분석 결과 삭제
            try {
                site.aiion.api.diary.common.domain.Messenger result = 
                    diaryEmotionService.deleteByDiaryId(diaryModel.getId());
                if (result.getCode() != 200) {
                    System.err.println("[DiaryServiceImpl] 일기 ID " + diaryModel.getId() + " 감정 분석 결과 삭제 실패: " + result.getMessage());
                    emotionDeleteSuccess = false;
                } else {
                    System.out.println("[DiaryServiceImpl] 일기 ID " + diaryModel.getId() + " 감정 분석 결과 삭제 성공");
                }
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + diaryModel.getId() + " 감정 분석 결과 삭제 실패: " + e.getMessage());
                emotionDeleteSuccess = false;
            }
            
            // MBTI 분석 결과 삭제
            try {
                site.aiion.api.diary.common.domain.Messenger result = 
                    diaryMbtiService.deleteByDiaryId(diaryModel.getId());
                if (result.getCode() != 200) {
                    System.err.println("[DiaryServiceImpl] 일기 ID " + diaryModel.getId() + " MBTI 분석 결과 삭제 실패: " + result.getMessage());
                    mbtiDeleteSuccess = false;
                } else {
                    System.out.println("[DiaryServiceImpl] 일기 ID " + diaryModel.getId() + " MBTI 분석 결과 삭제 성공");
                }
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + diaryModel.getId() + " MBTI 분석 결과 삭제 실패: " + e.getMessage());
                mbtiDeleteSuccess = false;
            }
            
            // 삭제 실패 시 경고 로그 (일기 삭제는 계속 진행)
            if (!emotionDeleteSuccess || !mbtiDeleteSuccess) {
                System.err.println("[DiaryServiceImpl] ⚠️ 일기 ID " + diaryModel.getId() + " 삭제 시 관련 데이터 삭제 실패 - 일기는 삭제되지만 고아 레코드가 남을 수 있습니다.");
            }
        }
        if (diaryModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (diaryModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Diary> optionalEntity = diaryRepository.findById(diaryModel.getId());
        if (optionalEntity.isPresent()) {
            Diary existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 일기는 삭제 불가
            if (!existing.getUserId().equals(diaryModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 일기는 삭제할 수 없습니다.")
                        .build();
            }
            
            diaryRepository.deleteById(diaryModel.getId());
            return Messenger.builder()
                    .code(200)
                    .message("삭제 성공: " + diaryModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("삭제할 일기를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger reanalyzeEmotionsForUser(Long userId) {
        if (userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        
        // 해당 사용자의 모든 일기 조회
        List<Diary> diaries = diaryRepository.findByUserId(userId);
        
        if (diaries.isEmpty()) {
            return Messenger.builder()
                    .code(200)
                    .message("재분석할 일기가 없습니다.")
                    .data(0)
                    .build();
        }
        
        int successCount = 0;
        int failCount = 0;
        
        // 각 일기에 대해 감정 분석 재수행 (기존 결과 업데이트)
        for (Diary diary : diaries) {
            try {
                // 감정 분석 수행 (기존 결과가 있으면 자동으로 업데이트됨)
                site.aiion.api.diary.common.domain.Messenger result = 
                    diaryEmotionService.analyzeAndSave(diary.getId(), diary.getTitle(), diary.getContent());
                if (result.getCode() == 200) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + diary.getId() + " 감정 분석 재실행 실패: " + e.getMessage());
                failCount++;
            }
        }
        
        return Messenger.builder()
                .code(200)
                .message("감정 분석 재실행 완료: 성공 " + successCount + "개, 실패 " + failCount + "개")
                .data(Map.of("success", successCount, "fail", failCount, "total", diaries.size()))
                .build();
    }

    @Override
    @Transactional
    public Messenger reanalyzeAllEmotions() {
        // 모든 일기 조회
        List<Diary> allDiaries = diaryRepository.findAll();
        
        if (allDiaries.isEmpty()) {
            return Messenger.builder()
                    .code(200)
                    .message("분석할 일기가 없습니다.")
                    .data(0)
                    .build();
        }
        
        int successCount = 0;
        int failCount = 0;
        
        // 각 일기에 대해 감정 분석 수행
        for (Diary diary : allDiaries) {
            try {
                // 감정 분석 수행 (기존 결과가 있으면 자동으로 업데이트됨)
                site.aiion.api.diary.common.domain.Messenger result = 
                    diaryEmotionService.analyzeAndSave(diary.getId(), diary.getTitle(), diary.getContent());
                if (result.getCode() == 200) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + diary.getId() + " 감정 분석 실패: " + e.getMessage());
                failCount++;
            }
        }
        
        return Messenger.builder()
                .code(200)
                .message("전체 일기 감정 분석 완료: 성공 " + successCount + "개, 실패 " + failCount + "개")
                .data(Map.of("success", successCount, "fail", failCount, "total", allDiaries.size()))
                .build();
    }

    @Override
    @Transactional
    public Messenger reanalyzeMbtiForUser(Long userId) {
        if (userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        
        // 해당 사용자의 모든 일기 조회
        List<Diary> diaries = diaryRepository.findByUserId(userId);
        
        if (diaries.isEmpty()) {
            return Messenger.builder()
                    .code(200)
                    .message("재분석할 일기가 없습니다.")
                    .data(0)
                    .build();
        }
        
        int successCount = 0;
        int failCount = 0;
        
        // 각 일기에 대해 MBTI 분석 재수행 (기존 결과 업데이트)
        for (Diary diary : diaries) {
            try {
                // MBTI 분석 수행 (기존 결과가 있으면 자동으로 업데이트됨)
                site.aiion.api.diary.common.domain.Messenger result = 
                    diaryMbtiService.analyzeAndSave(diary.getId(), diary.getTitle(), diary.getContent());
                if (result.getCode() == 200) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + diary.getId() + " MBTI 분석 재실행 실패: " + e.getMessage());
                failCount++;
            }
        }
        
        return Messenger.builder()
                .code(200)
                .message("MBTI 분석 재실행 완료: 성공 " + successCount + "개, 실패 " + failCount + "개")
                .data(Map.of("success", successCount, "fail", failCount, "total", diaries.size()))
                .build();
    }

    @Override
    @Transactional
    public Messenger reanalyzeAllMbti() {
        // 모든 일기 조회
        List<Diary> allDiaries = diaryRepository.findAll();
        
        if (allDiaries.isEmpty()) {
            return Messenger.builder()
                    .code(200)
                    .message("분석할 일기가 없습니다.")
                    .data(0)
                    .build();
        }
        
        int successCount = 0;
        int failCount = 0;
        
        // 각 일기에 대해 MBTI 분석 수행
        for (Diary diary : allDiaries) {
            try {
                // MBTI 분석 수행 (기존 결과가 있으면 자동으로 업데이트됨)
                site.aiion.api.diary.common.domain.Messenger result = 
                    diaryMbtiService.analyzeAndSave(diary.getId(), diary.getTitle(), diary.getContent());
                if (result.getCode() == 200) {
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (Exception e) {
                System.err.println("[DiaryServiceImpl] 일기 ID " + diary.getId() + " MBTI 분석 실패: " + e.getMessage());
                failCount++;
            }
        }
        
        return Messenger.builder()
                .code(200)
                .message("전체 일기 MBTI 분석 완료: 성공 " + successCount + "개, 실패 " + failCount + "개")
                .data(Map.of("success", successCount, "fail", failCount, "total", allDiaries.size()))
                .build();
    }

}

