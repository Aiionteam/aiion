package site.aiion.api.healthcare;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import site.aiion.api.healthcare.common.domain.Messenger;

@Service
@RequiredArgsConstructor
public class UserExerciseLogServiceImpl implements UserExerciseLogService {

    private final UserExerciseLogRepository userExerciseLogRepository;

    @Override
    public Messenger findById(UserExerciseLogModel userExerciseLogModel) {
        try {
            if (userExerciseLogModel.getLogId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("log_id가 필요합니다.")
                        .build();
            }

            UserExerciseLog entity = userExerciseLogRepository.findById(userExerciseLogModel.getLogId())
                    .orElse(null);

            if (entity == null) {
                return Messenger.builder()
                        .code(404)
                        .message("운동 기록을 찾을 수 없습니다.")
                        .build();
            }

            UserExerciseLogModel model = entityToModel(entity);

            return Messenger.builder()
                    .code(200)
                    .message("운동 기록 조회 성공")
                    .data(model)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 기록 조회 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger findByUserId(Long userId) {
        try {
            List<UserExerciseLog> entities = userExerciseLogRepository.findByUserId(userId);
            List<UserExerciseLogModel> models = entities.stream()
                    .map(this::entityToModel)
                    .collect(Collectors.toList());

            return Messenger.builder()
                    .code(200)
                    .message("운동 기록 조회 성공: " + models.size() + "개")
                    .data(models)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 기록 조회 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger save(UserExerciseLogModel userExerciseLogModel) {
        try {
            UserExerciseLog entity = modelToEntity(userExerciseLogModel);
            UserExerciseLog savedEntity = userExerciseLogRepository.save(entity);
            UserExerciseLogModel savedModel = entityToModel(savedEntity);

            return Messenger.builder()
                    .code(200)
                    .message("운동 기록 저장 성공")
                    .data(savedModel)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 기록 저장 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger saveAll(List<UserExerciseLogModel> userExerciseLogModelList) {
        try {
            List<UserExerciseLog> entities = userExerciseLogModelList.stream()
                    .map(this::modelToEntity)
                    .collect(Collectors.toList());

            List<UserExerciseLog> savedEntities = userExerciseLogRepository.saveAll(entities);
            List<UserExerciseLogModel> savedModels = savedEntities.stream()
                    .map(this::entityToModel)
                    .collect(Collectors.toList());

            return Messenger.builder()
                    .code(200)
                    .message("운동 기록 일괄 저장 성공: " + savedModels.size() + "개")
                    .data(savedModels)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 기록 일괄 저장 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger update(UserExerciseLogModel userExerciseLogModel) {
        try {
            if (userExerciseLogModel.getLogId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("log_id가 필요합니다.")
                        .build();
            }

            UserExerciseLog existingEntity = userExerciseLogRepository.findById(userExerciseLogModel.getLogId())
                    .orElse(null);

            if (existingEntity == null) {
                return Messenger.builder()
                        .code(404)
                        .message("운동 기록을 찾을 수 없습니다.")
                        .build();
            }

            // 기존 엔티티 업데이트
            if (userExerciseLogModel.getUserId() != null) {
                existingEntity.setUserId(userExerciseLogModel.getUserId());
            }
            if (userExerciseLogModel.getDate() != null) {
                existingEntity.setDate(userExerciseLogModel.getDate());
            }
            if (userExerciseLogModel.getExerciseType() != null) {
                existingEntity.setExerciseType(userExerciseLogModel.getExerciseType());
            }
            if (userExerciseLogModel.getDurationMinutes() != null) {
                existingEntity.setDurationMinutes(userExerciseLogModel.getDurationMinutes());
            }
            if (userExerciseLogModel.getIntensity() != null) {
                existingEntity.setIntensity(userExerciseLogModel.getIntensity());
            }
            if (userExerciseLogModel.getMood() != null) {
                existingEntity.setMood(userExerciseLogModel.getMood());
            }
            if (userExerciseLogModel.getNotes() != null) {
                existingEntity.setNotes(userExerciseLogModel.getNotes());
            }

            UserExerciseLog updatedEntity = userExerciseLogRepository.save(existingEntity);
            UserExerciseLogModel updatedModel = entityToModel(updatedEntity);

            return Messenger.builder()
                    .code(200)
                    .message("운동 기록 수정 성공")
                    .data(updatedModel)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 기록 수정 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger delete(UserExerciseLogModel userExerciseLogModel) {
        try {
            if (userExerciseLogModel.getLogId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("log_id가 필요합니다.")
                        .build();
            }

            if (!userExerciseLogRepository.existsById(userExerciseLogModel.getLogId())) {
                return Messenger.builder()
                        .code(404)
                        .message("운동 기록을 찾을 수 없습니다.")
                        .build();
            }

            userExerciseLogRepository.deleteById(userExerciseLogModel.getLogId());

            return Messenger.builder()
                    .code(200)
                    .message("운동 기록 삭제 성공")
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("운동 기록 삭제 실패: " + e.getMessage())
                    .build();
        }
    }

    private UserExerciseLogModel entityToModel(UserExerciseLog entity) {
        return UserExerciseLogModel.builder()
                .logId(entity.getLogId())
                .userId(entity.getUserId())
                .date(entity.getDate())
                .exerciseType(entity.getExerciseType())
                .durationMinutes(entity.getDurationMinutes())
                .intensity(entity.getIntensity())
                .mood(entity.getMood())
                .notes(entity.getNotes())
                .build();
    }

    private UserExerciseLog modelToEntity(UserExerciseLogModel model) {
        return UserExerciseLog.builder()
                .logId(model.getLogId())
                .userId(model.getUserId())
                .date(model.getDate())
                .exerciseType(model.getExerciseType())
                .durationMinutes(model.getDurationMinutes())
                .intensity(model.getIntensity())
                .mood(model.getMood())
                .notes(model.getNotes())
                .build();
    }
}

