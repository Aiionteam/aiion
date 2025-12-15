package site.aiion.api.healthcare;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import site.aiion.api.healthcare.common.domain.Messenger;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class HealthcareServiceImpl implements HealthcareService {

        private final HealthcareRepository healthcareRepository;
        private final HealthcareAnalysisRepository healthcareAnalysisRepository;

        private HealthcareModel entityToModel(Healthcare entity) {
                return HealthcareModel.builder()
                                .id(entity.getId())
                                .userId(entity.getUserId())
                                .type(entity.getType())
                                .recordDate(entity.getRecordDate())
                                .sleepHours(entity.getSleepHours())
                                .nutrition(entity.getNutrition())
                                .steps(entity.getSteps())
                                .weight(entity.getWeight())
                                .bloodPressure(entity.getBloodPressure())
                                .condition(entity.getCondition())
                                .weeklySummary(entity.getWeeklySummary())
                                .recommendedRoutine(entity.getRecommendedRoutine())
                                .build();
        }

        private Healthcare modelToEntity(HealthcareModel model) {
                return Healthcare.builder()
                                .id(model.getId())
                                .userId(model.getUserId())
                                .type(model.getType())
                                .recordDate(model.getRecordDate())
                                .sleepHours(model.getSleepHours())
                                .nutrition(model.getNutrition())
                                .steps(model.getSteps())
                                .weight(model.getWeight())
                                .bloodPressure(model.getBloodPressure())
                                .condition(model.getCondition())
                                .weeklySummary(model.getWeeklySummary())
                                .recommendedRoutine(model.getRecommendedRoutine())
                                .build();
        }

        @Override
        public Messenger findById(HealthcareModel healthcareModel) {
                if (healthcareModel.getId() == null) {
                        return Messenger.builder()
                                        .code(400)
                                        .message("ID가 필요합니다.")
                                        .build();
                }
                Optional<Healthcare> entity = healthcareRepository.findById(healthcareModel.getId());
                if (entity.isPresent()) {
                        Healthcare healthcare = entity.get();
                        HealthcareModel model = entityToModel(healthcare);
                        return Messenger.builder()
                                        .code(200)
                                        .message("조회 성공")
                                        .data(model)
                                        .build();
                } else {
                        return Messenger.builder()
                                        .code(404)
                                        .message("건강 기록을 찾을 수 없습니다.")
                                        .build();
                }
        }

        @Override
        public Messenger findAll() {
                List<Healthcare> entities = healthcareRepository.findAll();
                List<HealthcareModel> modelList = entities.stream()
                                .map(this::entityToModel)
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
                List<Healthcare> entities = healthcareRepository.findByUserId(userId);
                List<HealthcareModel> modelList = entities.stream()
                                .map(this::entityToModel)
                                .collect(Collectors.toList());
                return Messenger.builder()
                                .code(200)
                                .message("사용자별 조회 성공: " + modelList.size() + "개")
                                .data(modelList)
                                .build();
        }

        @Override
        public Messenger findByUserIdAndType(Long userId, String type) {
                if (userId == null) {
                        return Messenger.builder()
                                        .code(400)
                                        .message("사용자 ID가 필요합니다.")
                                        .build();
                }
                if (type == null || type.trim().isEmpty()) {
                        return Messenger.builder()
                                        .code(400)
                                        .message("기록 유형이 필요합니다.")
                                        .build();
                }
                List<Healthcare> entities = healthcareRepository.findByUserIdAndType(userId, type);
                List<HealthcareModel> modelList = entities.stream()
                                .map(this::entityToModel)
                                .collect(Collectors.toList());
                return Messenger.builder()
                                .code(200)
                                .message("사용자별 유형별 조회 성공: " + modelList.size() + "개")
                                .data(modelList)
                                .build();
        }

        @Override
        @Transactional
        public Messenger save(HealthcareModel healthcareModel) {
                if (healthcareModel.getRecordDate() == null) {
                        return Messenger.builder()
                                        .code(400)
                                        .message("기록 일자 정보는 필수 값입니다.")
                                        .build();
                }

                // 새 기록 저장 시 ID를 null로 설정 (데이터베이스에서 자동 생성)
                Healthcare entity = Healthcare.builder()
                                .id(null) // 새 엔티티는 ID를 null로 설정
                                .userId(healthcareModel.getUserId())
                                .type(healthcareModel.getType())
                                .recordDate(healthcareModel.getRecordDate())
                                .sleepHours(healthcareModel.getSleepHours())
                                .nutrition(healthcareModel.getNutrition())
                                .steps(healthcareModel.getSteps())
                                .weight(healthcareModel.getWeight())
                                .bloodPressure(healthcareModel.getBloodPressure())
                                .condition(healthcareModel.getCondition())
                                .weeklySummary(healthcareModel.getWeeklySummary())
                                .recommendedRoutine(healthcareModel.getRecommendedRoutine())
                                .build();

                Healthcare saved = healthcareRepository.save(entity);
                HealthcareModel model = entityToModel(saved);
                return Messenger.builder()
                                .code(200)
                                .message("저장 성공: " + saved.getId())
                                .data(model)
                                .build();
        }

        @Override
        @Transactional
        public Messenger saveAll(List<HealthcareModel> healthcareModelList) {
                // 새 기록 저장 시 모든 ID를 null로 설정
                List<Healthcare> entities = healthcareModelList.stream()
                                .map(model -> Healthcare.builder()
                                                .id(null) // 새 엔티티는 ID를 null로 설정
                                                .userId(model.getUserId())
                                                .type(model.getType())
                                                .recordDate(model.getRecordDate())
                                                .sleepHours(model.getSleepHours())
                                                .nutrition(model.getNutrition())
                                                .steps(model.getSteps())
                                                .weight(model.getWeight())
                                                .bloodPressure(model.getBloodPressure())
                                                .condition(model.getCondition())
                                                .weeklySummary(model.getWeeklySummary())
                                                .recommendedRoutine(model.getRecommendedRoutine())
                                                .build())
                                .collect(Collectors.toList());

                List<Healthcare> saved = healthcareRepository.saveAll(entities);
                return Messenger.builder()
                                .code(200)
                                .message("일괄 저장 성공: " + saved.size() + "개")
                                .build();
        }

        @Override
        @Transactional
        public Messenger update(HealthcareModel healthcareModel) {
                if (healthcareModel.getId() == null) {
                        return Messenger.builder()
                                        .code(400)
                                        .message("ID가 필요합니다.")
                                        .build();
                }
                Optional<Healthcare> optionalEntity = healthcareRepository.findById(healthcareModel.getId());
                if (optionalEntity.isPresent()) {
                        Healthcare existing = optionalEntity.get();

                        Healthcare updated = Healthcare.builder()
                                        .id(existing.getId())
                                        .userId(healthcareModel.getUserId() != null
                                                        ? healthcareModel.getUserId()
                                                        : existing.getUserId())
                                        .type(healthcareModel.getType() != null
                                                        ? healthcareModel.getType()
                                                        : existing.getType())
                                        .recordDate(healthcareModel.getRecordDate() != null
                                                        ? healthcareModel.getRecordDate()
                                                        : existing.getRecordDate())
                                        .sleepHours(healthcareModel.getSleepHours() != null
                                                        ? healthcareModel.getSleepHours()
                                                        : existing.getSleepHours())
                                        .nutrition(healthcareModel.getNutrition() != null
                                                        ? healthcareModel.getNutrition()
                                                        : existing.getNutrition())
                                        .steps(healthcareModel.getSteps() != null ? healthcareModel.getSteps()
                                                        : existing.getSteps())
                                        .weight(healthcareModel.getWeight() != null ? healthcareModel.getWeight()
                                                        : existing.getWeight())
                                        .bloodPressure(healthcareModel.getBloodPressure() != null
                                                        ? healthcareModel.getBloodPressure()
                                                        : existing.getBloodPressure())
                                        .condition(healthcareModel.getCondition() != null
                                                        ? healthcareModel.getCondition()
                                                        : existing.getCondition())
                                        .weeklySummary(healthcareModel.getWeeklySummary() != null
                                                        ? healthcareModel.getWeeklySummary()
                                                        : existing.getWeeklySummary())
                                        .recommendedRoutine(healthcareModel.getRecommendedRoutine() != null
                                                        ? healthcareModel.getRecommendedRoutine()
                                                        : existing.getRecommendedRoutine())
                                        .build();

                        Healthcare saved = healthcareRepository.save(updated);
                        HealthcareModel model = entityToModel(saved);
                        return Messenger.builder()
                                        .code(200)
                                        .message("수정 성공: " + healthcareModel.getId())
                                        .data(model)
                                        .build();
                } else {
                        return Messenger.builder()
                                        .code(404)
                                        .message("수정할 건강 기록을 찾을 수 없습니다.")
                                        .build();
                }
        }

        @Override
        @Transactional
        public Messenger delete(HealthcareModel healthcareModel) {
                if (healthcareModel.getId() == null) {
                        return Messenger.builder()
                                        .code(400)
                                        .message("ID가 필요합니다.")
                                        .build();
                }
                Optional<Healthcare> optionalEntity = healthcareRepository.findById(healthcareModel.getId());
                if (optionalEntity.isPresent()) {
                        healthcareRepository.deleteById(healthcareModel.getId());
                        return Messenger.builder()
                                        .code(200)
                                        .message("삭제 성공: " + healthcareModel.getId())
                                        .build();
                } else {
                        return Messenger.builder()
                                        .code(404)
                                        .message("삭제할 건강 기록을 찾을 수 없습니다.")
                                        .build();
                }
        }

        @Override
        public Messenger getComprehensiveAnalysis(Long userId) {
                if (userId == null) {
                        return Messenger.builder()
                                        .code(400)
                                        .message("사용자 ID가 필요합니다.")
                                        .build();
                }
                Optional<HealthcareAnalysis> analysisOptional = healthcareAnalysisRepository.findByUserId(userId);
                if (analysisOptional.isPresent()) {
                        HealthcareAnalysis analysis = analysisOptional.get();
                        return Messenger.builder()
                                        .code(200)
                                        .message("종합건강분석 조회 성공")
                                        .data(analysis.getAnalysisData())
                                        .build();
                } else {
                        return Messenger.builder()
                                        .code(404)
                                        .message("종합건강분석 데이터를 찾을 수 없습니다.")
                                        .build();
                }
        }

}
