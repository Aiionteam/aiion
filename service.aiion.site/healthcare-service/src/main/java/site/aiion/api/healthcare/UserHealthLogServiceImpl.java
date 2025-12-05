package site.aiion.api.healthcare;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import site.aiion.api.healthcare.common.domain.Messenger;

@Service
@RequiredArgsConstructor
public class UserHealthLogServiceImpl implements UserHealthLogService {

    private final UserHealthLogRepository userHealthLogRepository;

    @Override
    public Messenger findById(UserHealthLogModel userHealthLogModel) {
        try {
            if (userHealthLogModel.getLogId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("log_id가 필요합니다.")
                        .build();
            }

            UserHealthLog entity = userHealthLogRepository.findById(userHealthLogModel.getLogId())
                    .orElse(null);

            if (entity == null) {
                return Messenger.builder()
                        .code(404)
                        .message("건강 기록을 찾을 수 없습니다.")
                        .build();
            }

            UserHealthLogModel model = entityToModel(entity);

            return Messenger.builder()
                    .code(200)
                    .message("건강 기록 조회 성공")
                    .data(model)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("건강 기록 조회 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger findByUserId(Long userId) {
        try {
            List<UserHealthLog> entities = userHealthLogRepository.findByUserId(userId);
            List<UserHealthLogModel> models = entities.stream()
                    .map(this::entityToModel)
                    .collect(Collectors.toList());

            return Messenger.builder()
                    .code(200)
                    .message("건강 기록 조회 성공: " + models.size() + "개")
                    .data(models)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("건강 기록 조회 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger save(UserHealthLogModel userHealthLogModel) {
        try {
            UserHealthLog entity = modelToEntity(userHealthLogModel);
            UserHealthLog savedEntity = userHealthLogRepository.save(entity);
            UserHealthLogModel savedModel = entityToModel(savedEntity);

            return Messenger.builder()
                    .code(200)
                    .message("건강 기록 저장 성공")
                    .data(savedModel)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("건강 기록 저장 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger saveAll(List<UserHealthLogModel> userHealthLogModelList) {
        try {
            List<UserHealthLog> entities = userHealthLogModelList.stream()
                    .map(this::modelToEntity)
                    .collect(Collectors.toList());

            List<UserHealthLog> savedEntities = userHealthLogRepository.saveAll(entities);
            List<UserHealthLogModel> savedModels = savedEntities.stream()
                    .map(this::entityToModel)
                    .collect(Collectors.toList());

            return Messenger.builder()
                    .code(200)
                    .message("건강 기록 일괄 저장 성공: " + savedModels.size() + "개")
                    .data(savedModels)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("건강 기록 일괄 저장 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger update(UserHealthLogModel userHealthLogModel) {
        try {
            if (userHealthLogModel.getLogId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("log_id가 필요합니다.")
                        .build();
            }

            UserHealthLog existingEntity = userHealthLogRepository.findById(userHealthLogModel.getLogId())
                    .orElse(null);

            if (existingEntity == null) {
                return Messenger.builder()
                        .code(404)
                        .message("건강 기록을 찾을 수 없습니다.")
                        .build();
            }

            // 기존 엔티티 업데이트
            if (userHealthLogModel.getUserId() != null) {
                existingEntity.setUserId(userHealthLogModel.getUserId());
            }
            if (userHealthLogModel.getDate() != null) {
                existingEntity.setDate(userHealthLogModel.getDate());
            }
            if (userHealthLogModel.getHealthType() != null) {
                existingEntity.setHealthType(userHealthLogModel.getHealthType());
            }
            if (userHealthLogModel.getValue() != null) {
                existingEntity.setValue(userHealthLogModel.getValue());
            }
            if (userHealthLogModel.getRecommendation() != null) {
                existingEntity.setRecommendation(userHealthLogModel.getRecommendation());
            }
            if (userHealthLogModel.getNotes() != null) {
                existingEntity.setNotes(userHealthLogModel.getNotes());
            }

            UserHealthLog updatedEntity = userHealthLogRepository.save(existingEntity);
            UserHealthLogModel updatedModel = entityToModel(updatedEntity);

            return Messenger.builder()
                    .code(200)
                    .message("건강 기록 수정 성공")
                    .data(updatedModel)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("건강 기록 수정 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger delete(UserHealthLogModel userHealthLogModel) {
        try {
            if (userHealthLogModel.getLogId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("log_id가 필요합니다.")
                        .build();
            }

            if (!userHealthLogRepository.existsById(userHealthLogModel.getLogId())) {
                return Messenger.builder()
                        .code(404)
                        .message("건강 기록을 찾을 수 없습니다.")
                        .build();
            }

            userHealthLogRepository.deleteById(userHealthLogModel.getLogId());

            return Messenger.builder()
                    .code(200)
                    .message("건강 기록 삭제 성공")
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("건강 기록 삭제 실패: " + e.getMessage())
                    .build();
        }
    }

    private UserHealthLogModel entityToModel(UserHealthLog entity) {
        return UserHealthLogModel.builder()
                .logId(entity.getLogId())
                .userId(entity.getUserId())
                .date(entity.getDate())
                .healthType(entity.getHealthType())
                .value(entity.getValue())
                .recommendation(entity.getRecommendation())
                .notes(entity.getNotes())
                .build();
    }

    private UserHealthLog modelToEntity(UserHealthLogModel model) {
        return UserHealthLog.builder()
                .logId(model.getLogId())
                .userId(model.getUserId())
                .date(model.getDate())
                .healthType(model.getHealthType())
                .value(model.getValue())
                .recommendation(model.getRecommendation())
                .notes(model.getNotes())
                .build();
    }
}

