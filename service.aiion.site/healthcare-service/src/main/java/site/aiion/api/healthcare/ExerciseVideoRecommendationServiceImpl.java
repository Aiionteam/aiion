package site.aiion.api.healthcare;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import site.aiion.api.healthcare.common.domain.Messenger;

@Service
@RequiredArgsConstructor
public class ExerciseVideoRecommendationServiceImpl implements ExerciseVideoRecommendationService {

    private final ExerciseVideoRecommendationRepository exerciseVideoRecommendationRepository;

    @Override
    public Messenger findById(ExerciseVideoRecommendationModel exerciseVideoRecommendationModel) {
        try {
            if (exerciseVideoRecommendationModel.getRecId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("rec_id가 필요합니다.")
                        .build();
            }

            ExerciseVideoRecommendation entity = exerciseVideoRecommendationRepository.findById(exerciseVideoRecommendationModel.getRecId())
                    .orElse(null);

            if (entity == null) {
                return Messenger.builder()
                        .code(404)
                        .message("운동 영상 추천을 찾을 수 없습니다.")
                        .build();
            }

            ExerciseVideoRecommendationModel model = entityToModel(entity);

            return Messenger.builder()
                    .code(200)
                    .message("운동 영상 추천 조회 성공")
                    .data(model)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 영상 추천 조회 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger findByUserId(Long userId) {
        try {
            List<ExerciseVideoRecommendation> entities = exerciseVideoRecommendationRepository.findByUserId(userId);
            List<ExerciseVideoRecommendationModel> models = entities.stream()
                    .map(this::entityToModel)
                    .collect(Collectors.toList());

            return Messenger.builder()
                    .code(200)
                    .message("운동 영상 추천 조회 성공: " + models.size() + "개")
                    .data(models)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 영상 추천 조회 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger save(ExerciseVideoRecommendationModel exerciseVideoRecommendationModel) {
        try {
            // recommendedAt이 없으면 현재 시간으로 설정
            if (exerciseVideoRecommendationModel.getRecommendedAt() == null) {
                exerciseVideoRecommendationModel.setRecommendedAt(java.time.LocalDateTime.now());
            }

            ExerciseVideoRecommendation entity = modelToEntity(exerciseVideoRecommendationModel);
            ExerciseVideoRecommendation savedEntity = exerciseVideoRecommendationRepository.save(entity);
            ExerciseVideoRecommendationModel savedModel = entityToModel(savedEntity);

            return Messenger.builder()
                    .code(200)
                    .message("운동 영상 추천 저장 성공")
                    .data(savedModel)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 영상 추천 저장 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger saveAll(List<ExerciseVideoRecommendationModel> exerciseVideoRecommendationModelList) {
        try {
            // recommendedAt이 없으면 현재 시간으로 설정
            exerciseVideoRecommendationModelList.forEach(model -> {
                if (model.getRecommendedAt() == null) {
                    model.setRecommendedAt(java.time.LocalDateTime.now());
                }
            });

            List<ExerciseVideoRecommendation> entities = exerciseVideoRecommendationModelList.stream()
                    .map(this::modelToEntity)
                    .collect(Collectors.toList());

            List<ExerciseVideoRecommendation> savedEntities = exerciseVideoRecommendationRepository.saveAll(entities);
            List<ExerciseVideoRecommendationModel> savedModels = savedEntities.stream()
                    .map(this::entityToModel)
                    .collect(Collectors.toList());

            return Messenger.builder()
                    .code(200)
                    .message("운동 영상 추천 일괄 저장 성공: " + savedModels.size() + "개")
                    .data(savedModels)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 영상 추천 일괄 저장 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger update(ExerciseVideoRecommendationModel exerciseVideoRecommendationModel) {
        try {
            if (exerciseVideoRecommendationModel.getRecId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("rec_id가 필요합니다.")
                        .build();
            }

            ExerciseVideoRecommendation existingEntity = exerciseVideoRecommendationRepository.findById(exerciseVideoRecommendationModel.getRecId())
                    .orElse(null);

            if (existingEntity == null) {
                return Messenger.builder()
                        .code(404)
                        .message("운동 영상 추천을 찾을 수 없습니다.")
                        .build();
            }

            // 기존 엔티티 업데이트
            if (exerciseVideoRecommendationModel.getUserId() != null) {
                existingEntity.setUserId(exerciseVideoRecommendationModel.getUserId());
            }
            if (exerciseVideoRecommendationModel.getExerciseType() != null) {
                existingEntity.setExerciseType(exerciseVideoRecommendationModel.getExerciseType());
            }
            if (exerciseVideoRecommendationModel.getYoutubeQuery() != null) {
                existingEntity.setYoutubeQuery(exerciseVideoRecommendationModel.getYoutubeQuery());
            }
            if (exerciseVideoRecommendationModel.getVideoId() != null) {
                existingEntity.setVideoId(exerciseVideoRecommendationModel.getVideoId());
            }
            if (exerciseVideoRecommendationModel.getRecommendedAt() != null) {
                existingEntity.setRecommendedAt(exerciseVideoRecommendationModel.getRecommendedAt());
            }

            ExerciseVideoRecommendation updatedEntity = exerciseVideoRecommendationRepository.save(existingEntity);
            ExerciseVideoRecommendationModel updatedModel = entityToModel(updatedEntity);

            return Messenger.builder()
                    .code(200)
                    .message("운동 영상 추천 수정 성공")
                    .data(updatedModel)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 영상 추천 수정 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger delete(ExerciseVideoRecommendationModel exerciseVideoRecommendationModel) {
        try {
            if (exerciseVideoRecommendationModel.getRecId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("rec_id가 필요합니다.")
                        .build();
            }

            if (!exerciseVideoRecommendationRepository.existsById(exerciseVideoRecommendationModel.getRecId())) {
                return Messenger.builder()
                        .code(404)
                        .message("운동 영상 추천을 찾을 수 없습니다.")
                        .build();
            }

            exerciseVideoRecommendationRepository.deleteById(exerciseVideoRecommendationModel.getRecId());

            return Messenger.builder()
                    .code(200)
                    .message("운동 영상 추천 삭제 성공")
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 영상 추천 삭제 실패: " + e.getMessage())
                    .build();
        }
    }

    private ExerciseVideoRecommendationModel entityToModel(ExerciseVideoRecommendation entity) {
        return ExerciseVideoRecommendationModel.builder()
                .recId(entity.getRecId())
                .userId(entity.getUserId())
                .exerciseType(entity.getExerciseType())
                .youtubeQuery(entity.getYoutubeQuery())
                .videoId(entity.getVideoId())
                .recommendedAt(entity.getRecommendedAt())
                .build();
    }

    private ExerciseVideoRecommendation modelToEntity(ExerciseVideoRecommendationModel model) {
        return ExerciseVideoRecommendation.builder()
                .recId(model.getRecId())
                .userId(model.getUserId())
                .exerciseType(model.getExerciseType())
                .youtubeQuery(model.getYoutubeQuery())
                .videoId(model.getVideoId())
                .recommendedAt(model.getRecommendedAt() != null ? model.getRecommendedAt() : java.time.LocalDateTime.now())
                .build();
    }
}

