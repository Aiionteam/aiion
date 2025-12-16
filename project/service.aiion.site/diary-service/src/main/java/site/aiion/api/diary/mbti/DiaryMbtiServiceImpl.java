package site.aiion.api.diary.mbti;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.client.RestClientException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import site.aiion.api.diary.common.domain.Messenger;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class DiaryMbtiServiceImpl implements DiaryMbtiService {

    private final DiaryMbtiRepository diaryMbtiRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // Business Diary Service URL (Docker 네트워크 내부에서 직접 접근)
    // business/diary_service가 포트 9007에서 실행됨 (컨테이너 이름: aihoyun-diary-service)
    private static final String BUSINESS_SERVICE_URL = "http://aihoyun-diary-service:9007/diary-mbti/predict";
    
    // MBTI 차원별 라벨 매핑
    private static final Map<Integer, String> E_I_LABELS = Map.of(
        0, "평가불가",
        1, "E",
        2, "I"
    );
    
    private static final Map<Integer, String> S_N_LABELS = Map.of(
        0, "평가불가",
        1, "S",
        2, "N"
    );
    
    private static final Map<Integer, String> T_F_LABELS = Map.of(
        0, "평가불가",
        1, "T",
        2, "F"
    );
    
    private static final Map<Integer, String> J_P_LABELS = Map.of(
        0, "평가불가",
        1, "J",
        2, "P"
    );

    private DiaryMbtiModel entityToModel(DiaryMbti entity) {
        if (entity == null) {
            return null;
        }
        return DiaryMbtiModel.builder()
                .id(entity.getId())
                .diaryId(entity.getDiaryId())
                .eI(entity.getEI())
                .sN(entity.getSN())
                .tF(entity.getTF())
                .jP(entity.getJP())
                .mbtiType(entity.getMbtiType())
                .confidence(entity.getConfidence())
                .probabilities(entity.getProbabilities())
                .analyzedAt(entity.getAnalyzedAt())
                .build();
    }

    private DiaryMbti modelToEntity(DiaryMbtiModel model) {
        return DiaryMbti.builder()
                .id(model.getId())
                .diaryId(model.getDiaryId())
                .eI(model.getEI())
                .sN(model.getSN())
                .tF(model.getTF())
                .jP(model.getJP())
                .mbtiType(model.getMbtiType())
                .confidence(model.getConfidence())
                .probabilities(model.getProbabilities())
                .analyzedAt(model.getAnalyzedAt() != null ? model.getAnalyzedAt() : LocalDateTime.now())
                .build();
    }

    @Override
    public Messenger findByDiaryId(Long diaryId) {
        if (diaryId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("일기 ID가 필요합니다.")
                    .build();
        }
        
        Optional<DiaryMbti> mbti = diaryMbtiRepository.findByDiaryId(diaryId);
        if (mbti.isPresent()) {
            DiaryMbtiModel model = entityToModel(mbti.get());
            return Messenger.builder()
                    .code(200)
                    .message("MBTI 분석 결과 조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("MBTI 분석 결과를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Map<Long, DiaryMbtiModel> findByDiaryIdIn(List<Long> diaryIds) {
        if (diaryIds == null || diaryIds.isEmpty()) {
            return Map.of();
        }
        
        List<DiaryMbti> mbtis = diaryMbtiRepository.findByDiaryIdIn(diaryIds);
        
        Map<Long, DiaryMbtiModel> result = mbtis.stream()
                .map(this::entityToModel)
                .filter(model -> model != null && model.getDiaryId() != null)
                .collect(Collectors.toMap(
                    DiaryMbtiModel::getDiaryId,
                    model -> model,
                    (existing, replacement) -> existing // 중복 키가 있으면 기존 값 유지
                ));
        
        return result;
    }

    @Override
    @Async("diaryAnalysisExecutor")
    @Transactional
    public void analyzeAndSaveAsync(Long diaryId, String title, String content) {
        log.info("일기 ID {} MBTI 분석 시작 (비동기)...", diaryId);
        try {
            analyzeAndSave(diaryId, title, content);
        } catch (Exception e) {
            log.error("일기 ID {} MBTI 분석 중 예외 발생: {}", diaryId, e.getMessage(), e);
        }
    }

    @Override
    @Transactional
    public Messenger analyzeAndSave(Long diaryId, String title, String content) {
        if (diaryId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("일기 ID가 필요합니다.")
                    .build();
        }

        try {
            // 제목과 내용 결합
            String text = (title != null ? title : "") + " " + (content != null ? content : "");
            text = text.trim();
            
            if (text.isEmpty()) {
                log.warn("일기 ID {}의 텍스트가 비어있어 MBTI 분석을 건너뜁니다.", diaryId);
                return Messenger.builder()
                        .code(400)
                        .message("일기 내용이 비어있습니다.")
                        .build();
            }

            // Business Diary Service에 MBTI 분석 요청 (DL 모델 사용)
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("text", text);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);

            log.info("일기 ID {} MBTI 분석 요청: DL 모델(KoELECTRA) 사용 (Business Diary Service 호출 중)...", diaryId);
            log.info("Business Diary Service URL: {}", BUSINESS_SERVICE_URL);
            log.info("요청 본문: text length = {}", text.length());
            log.info("RestTemplate 타임아웃 설정: connectTimeout=10s, readTimeout=60s");
            
            ResponseEntity<Map> response;
            try {
                log.debug("HTTP POST 요청 시작: {}", BUSINESS_SERVICE_URL);
                response = restTemplate.postForEntity(
                    BUSINESS_SERVICE_URL,
                    request,
                    Map.class
                );
                log.info("일기 ID {} Business Diary Service 응답: status = {}, headers = {}", 
                    diaryId, response.getStatusCode(), response.getHeaders());
                if (response.getBody() != null) {
                    log.debug("응답 본문 키: {}", response.getBody().keySet());
                }
            } catch (org.springframework.web.client.ResourceAccessException e) {
                log.error("일기 ID {} Business Diary Service 연결 실패 - URL: {}", 
                    diaryId, BUSINESS_SERVICE_URL);
                log.error("연결 에러 상세: {}", e.getMessage());
                if (e.getCause() != null) {
                    log.error("원인: {}", e.getCause().getMessage());
                }
                throw e;
            } catch (org.springframework.web.client.HttpClientErrorException e) {
                log.error("일기 ID {} Business Diary Service HTTP 에러 - status: {}, body: {}", 
                    diaryId, e.getStatusCode(), e.getResponseBodyAsString());
                throw e;
            } catch (org.springframework.web.client.HttpServerErrorException e) {
                log.error("일기 ID {} Business Diary Service 서버 에러 - status: {}, body: {}", 
                    diaryId, e.getStatusCode(), e.getResponseBodyAsString());
                throw e;
            } catch (Exception e) {
                log.error("일기 ID {} Business Diary Service 호출 실패 - URL: {}, 에러 타입: {}, 메시지: {}", 
                    diaryId, BUSINESS_SERVICE_URL, e.getClass().getSimpleName(), e.getMessage(), e);
                throw e;
            }

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> result = response.getBody();
                
                log.debug("일기 ID {} MBTI 분석 응답: {}", diaryId, result);
                
                // DL 모델 응답 파싱 (predictions와 dimensions 포함)
                Map<String, Object> predictions = null;
                Map<String, Object> dimensions = null;
                Map<String, Object> probabilities = null;
                
                if (result.containsKey("predictions")) {
                    predictions = (Map<String, Object>) result.get("predictions");
                }
                if (result.containsKey("dimensions")) {
                    dimensions = (Map<String, Object>) result.get("dimensions");
                }
                if (result.containsKey("probabilities")) {
                    probabilities = (Map<String, Object>) result.get("probabilities");
                }
                
                // Business Diary Service 응답 파싱 (null 체크 강화)
                Object eIObj = predictions != null ? predictions.get("E_I") : null;
                Object sNObj = predictions != null ? predictions.get("S_N") : null;
                Object tFObj = predictions != null ? predictions.get("T_F") : null;
                Object jPObj = predictions != null ? predictions.get("J_P") : null;
                
                // null 체크 및 타입 변환
                Integer eI = 0;
                if (eIObj != null) {
                    if (eIObj instanceof Integer) {
                        eI = (Integer) eIObj;
                    } else if (eIObj instanceof Number) {
                        eI = ((Number) eIObj).intValue();
                    }
                }
                
                Integer sN = 0;
                if (sNObj != null) {
                    if (sNObj instanceof Integer) {
                        sN = (Integer) sNObj;
                    } else if (sNObj instanceof Number) {
                        sN = ((Number) sNObj).intValue();
                    }
                }
                
                Integer tF = 0;
                if (tFObj != null) {
                    if (tFObj instanceof Integer) {
                        tF = (Integer) tFObj;
                    } else if (tFObj instanceof Number) {
                        tF = ((Number) tFObj).intValue();
                    }
                }
                
                Integer jP = 0;
                if (jPObj != null) {
                    if (jPObj instanceof Integer) {
                        jP = (Integer) jPObj;
                    } else if (jPObj instanceof Number) {
                        jP = ((Number) jPObj).intValue();
                    }
                }
                
                String mbtiType = (String) result.get("mbti");  // "mbti_type" → "mbti"
                
                // confidence 계산 (각 차원의 평균 확률) - 0.0~1.0 범위만 사용
                Double confidence = null;
                if (probabilities != null) {
                    try {
                        double totalConf = 0.0;
                        int count = 0;
                        for (String label : new String[]{"E_I", "S_N", "T_F", "J_P"}) {
                            if (probabilities.containsKey(label)) {
                                Map<String, Object> dimProbs = (Map<String, Object>) probabilities.get(label);
                                if (dimProbs != null) {
                                    // Python에서 전달한 confidence 값 직접 사용 (0.0~1.0 범위)
                                    if (dimProbs.containsKey("confidence")) {
                                        Object confValue = dimProbs.get("confidence");
                                        if (confValue instanceof Number) {
                                            double conf = ((Number) confValue).doubleValue();
                                            // 0.0~1.0 범위인지 확인 (퍼센트 값 제외)
                                            if (conf >= 0.0 && conf <= 1.0) {
                                                totalConf += conf;
                                                count++;
                                            }
                                        }
                                    } else {
                                        // confidence 키가 없으면 '0', '1', '2' 키만 사용
                                        double maxProb = 0.0;
                                        for (String key : new String[]{"0", "1", "2"}) {
                                            if (dimProbs.containsKey(key)) {
                                                Object probValue = dimProbs.get(key);
                                                if (probValue instanceof Number) {
                                                    double prob = ((Number) probValue).doubleValue();
                                                    if (prob >= 0.0 && prob <= 1.0) {  // 0.0~1.0 범위만
                                                        maxProb = Math.max(maxProb, prob);
                                                    }
                                                }
                                            }
                                        }
                                        if (maxProb > 0.0) {
                                            totalConf += maxProb;
                                            count++;
                                        }
                                    }
                                }
                            }
                        }
                        if (count > 0) {
                            confidence = totalConf / count;  // 평균 확률 (0.0~1.0)
                        }
                    } catch (Exception e) {
                        log.warn("일기 ID {} confidence 계산 실패: {}", diaryId, e.getMessage());
                    }
                }

                // probabilities를 JSON 문자열로 변환
                String probabilitiesJson = null;
                if (probabilities != null) {
                    try {
                        probabilitiesJson = objectMapper.writeValueAsString(probabilities);
                    } catch (JsonProcessingException e) {
                        log.warn("일기 ID {} probabilities JSON 변환 실패: {}", diaryId, e.getMessage());
                    }
                }
                
                // dimension_percentages 파싱 및 JSON 문자열로 변환
                String dimensionPercentagesJson = null;
                if (result.containsKey("dimension_percentages")) {
                    try {
                        Object dimPercObj = result.get("dimension_percentages");
                        if (dimPercObj != null) {
                            dimensionPercentagesJson = objectMapper.writeValueAsString(dimPercObj);
                            log.debug("일기 ID {} dimension_percentages 파싱 완료", diaryId);
                        }
                    } catch (Exception e) {
                        log.warn("일기 ID {} dimension_percentages JSON 변환 실패: {}", diaryId, e.getMessage());
                    }
                }

                // MBTI 타입 문자열 생성 (없는 경우)
                if (mbtiType == null || mbtiType.isEmpty()) {
                    if (eI == 0 || sN == 0 || tF == 0 || jP == 0) {
                        mbtiType = "평가불가";
                    } else {
                        String eILabel = E_I_LABELS.get(eI);
                        String sNLabel = S_N_LABELS.get(sN);
                        String tFLabel = T_F_LABELS.get(tF);
                        String jPLabel = J_P_LABELS.get(jP);
                        
                        if (eILabel != null && sNLabel != null && tFLabel != null && jPLabel != null) {
                            mbtiType = eILabel + sNLabel + tFLabel + jPLabel;
                        } else {
                            mbtiType = "평가불가";
                        }
                    }
                }

                // 필수 필드 최종 검증
                if (eI == null || sN == null || tF == null || jP == null) {
                    log.error("일기 ID {} MBTI 분석 실패: 필수 필드가 null입니다. eI={}, sN={}, tF={}, jP={}", 
                        diaryId, eI, sN, tF, jP);
                    return Messenger.builder()
                            .code(500)
                            .message("MBTI 분석 결과에 필수 필드가 없습니다.")
                            .build();
                }
                
                // 기존 MBTI 분석 결과 확인 (예외 처리 강화)
                Optional<DiaryMbti> existingMbtiOpt = Optional.empty();
                try {
                    existingMbtiOpt = diaryMbtiRepository.findByDiaryId(diaryId);
                } catch (Exception e) {
                    log.error("일기 ID {} 기존 MBTI 조회 실패: {}", diaryId, e.getMessage(), e);
                    // 조회 실패 시 새로 생성하도록 empty로 유지
                }

                DiaryMbti diaryMbti;
                try {
                    if (existingMbtiOpt.isPresent()) {
                        // 기존 결과 업데이트
                        DiaryMbti existing = existingMbtiOpt.get();
                        existing.setEI(eI);
                        existing.setSN(sN);
                        existing.setTF(tF);
                        existing.setJP(jP);
                        existing.setMbtiType(mbtiType);
                        existing.setConfidence(confidence);
                        existing.setProbabilities(probabilitiesJson);
                        existing.setDimensionPercentages(dimensionPercentagesJson);
                        existing.setAnalyzedAt(LocalDateTime.now());
                        diaryMbti = diaryMbtiRepository.save(existing);
                        log.info("일기 ID {} MBTI 분석 결과 업데이트: {}", diaryId, mbtiType);
                    } else {
                        // 새로 생성
                        diaryMbti = DiaryMbti.builder()
                            .diaryId(diaryId)
                            .eI(eI)
                            .sN(sN)
                            .tF(tF)
                            .jP(jP)
                            .mbtiType(mbtiType)
                            .confidence(confidence)
                            .probabilities(probabilitiesJson)
                            .dimensionPercentages(dimensionPercentagesJson)
                            .analyzedAt(LocalDateTime.now())
                            .build();
                        diaryMbti = diaryMbtiRepository.save(diaryMbti);
                        log.info("일기 ID {} MBTI 분석 결과 저장: {}", diaryId, mbtiType);
                    }
                } catch (org.springframework.dao.DataIntegrityViolationException e) {
                    // Duplicate key 에러 발생 시 다시 조회 후 업데이트 시도
                    log.warn("일기 ID {} MBTI 분석 결과 저장 중 중복 키 에러 발생, 업데이트로 재시도", diaryId);
                    try {
                        existingMbtiOpt = diaryMbtiRepository.findByDiaryId(diaryId);
                        if (existingMbtiOpt.isPresent()) {
                            DiaryMbti existing = existingMbtiOpt.get();
                            existing.setEI(eI);
                            existing.setSN(sN);
                            existing.setTF(tF);
                            existing.setJP(jP);
                            existing.setMbtiType(mbtiType);
                            existing.setConfidence(confidence);
                            existing.setProbabilities(probabilitiesJson);
                            existing.setDimensionPercentages(dimensionPercentagesJson);
                            existing.setAnalyzedAt(LocalDateTime.now());
                            diaryMbti = diaryMbtiRepository.save(existing);
                            log.info("일기 ID {} MBTI 분석 결과 업데이트 완료 (재시도): {}", diaryId, mbtiType);
                        } else {
                            log.error("일기 ID {} MBTI 재조회 실패", diaryId);
                            return Messenger.builder()
                                    .code(500)
                                    .message("MBTI 분석 결과 저장 중 오류 발생: 중복 키 에러")
                                    .build();
                        }
                    } catch (Exception retryEx) {
                        log.error("일기 ID {} MBTI 재시도 실패: {}", diaryId, retryEx.getMessage(), retryEx);
                        return Messenger.builder()
                                .code(500)
                                .message("MBTI 분석 결과 저장 중 오류 발생: " + retryEx.getMessage())
                                .build();
                    }
                } catch (Exception e) {
                    log.error("일기 ID {} MBTI 저장 실패: {}", diaryId, e.getMessage(), e);
                    return Messenger.builder()
                            .code(500)
                            .message("MBTI 분석 결과 저장 중 오류 발생: " + e.getMessage())
                            .build();
                }

                DiaryMbtiModel model = entityToModel(diaryMbti);
                
                // 응답에 모델 타입 정보 추가
                Map<String, Object> responseData = new HashMap<>();
                responseData.put("mbti", model);
                responseData.put("model_type", "deep_learning");
                responseData.put("model_name", "KoELECTRA v3 base");
                
                return Messenger.builder()
                        .code(200)
                        .message("MBTI 분석 완료 (DL 모델): " + mbtiType)
                        .data(responseData)
                        .build();
            } else {
                log.error("일기 ID {} MBTI 분석 실패: Business Diary Service 응답 오류", diaryId);
                return Messenger.builder()
                        .code(500)
                        .message("Business Diary Service 응답 오류")
                        .build();
            }
        } catch (RestClientException e) {
            log.error("일기 ID {} MBTI 분석 중 오류 발생: {}", diaryId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("MBTI 분석 중 오류 발생: " + e.getMessage())
                    .build();
        } catch (Exception e) {
            log.error("일기 ID {} MBTI 분석 중 예상치 못한 오류 발생: {}", diaryId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("예상치 못한 오류 발생: " + e.getMessage())
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger deleteByDiaryId(Long diaryId) {
        if (diaryId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("일기 ID가 필요합니다.")
                    .build();
        }

        try {
            diaryMbtiRepository.deleteByDiaryId(diaryId);
            log.info("일기 ID {}의 MBTI 분석 결과 삭제됨", diaryId);
            return Messenger.builder()
                    .code(200)
                    .message("MBTI 분석 결과 삭제 성공")
                    .build();
        } catch (Exception e) {
            log.error("일기 ID {} MBTI 분석 결과 삭제 중 오류 발생: {}", diaryId, e.getMessage(), e);
            return Messenger.builder()
                    .code(500)
                    .message("삭제 중 오류 발생: " + e.getMessage())
                    .build();
        }
    }
}

