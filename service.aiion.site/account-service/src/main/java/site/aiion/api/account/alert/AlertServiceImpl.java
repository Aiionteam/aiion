package site.aiion.api.account.alert;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import site.aiion.api.account.common.domain.Messenger;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AlertServiceImpl implements AlertService {

    private final AlertRepository alertRepository;

    private AlertModel entityToModel(Alert entity) {
        return AlertModel.builder()
                .id(entity.getId())
                .accountId(entity.getAccountId())
                .userId(entity.getUserId())
                .alarmEnabled(entity.getAlarmEnabled() != null ? entity.getAlarmEnabled() : false)
                .alarmDate(entity.getAlarmDate())
                .alarmTime(entity.getAlarmTime())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private Alert modelToEntity(AlertModel model) {
        LocalDateTime now = LocalDateTime.now();
        return Alert.builder()
                .id(model.getId())
                .accountId(model.getAccountId())
                .userId(model.getUserId())
                .alarmEnabled(model.getAlarmEnabled() != null ? model.getAlarmEnabled() : false)
                .alarmDate(model.getAlarmDate())
                .alarmTime(model.getAlarmTime())
                .createdAt(model.getCreatedAt() != null ? model.getCreatedAt() : now)
                .updatedAt(model.getUpdatedAt() != null ? model.getUpdatedAt() : now)
                .build();
    }

    @Override
    public Messenger findById(AlertModel alertModel) {
        if (alertModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (alertModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Alert> entity = alertRepository.findById(alertModel.getId());
        if (entity.isPresent()) {
            Alert alert = entity.get();
            // userId 검증: 다른 사용자의 알람은 조회 불가
            if (!alert.getUserId().equals(alertModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 알람은 조회할 수 없습니다.")
                        .build();
            }
            AlertModel model = entityToModel(alert);
            return Messenger.builder()
                    .code(200)
                    .message("알람 조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("알람을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findByAccountId(Long accountId, Long userId) {
        if (accountId == null || userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("계정 ID와 사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Alert> entity = alertRepository.findByAccountIdAndUserId(accountId, userId);
        if (entity.isPresent()) {
            AlertModel model = entityToModel(entity.get());
            return Messenger.builder()
                    .code(200)
                    .message("알람 조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("알람을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public java.util.Map<Long, AlertModel> findByAccountIds(java.util.List<Long> accountIds, Long userId) {
        if (accountIds == null || accountIds.isEmpty() || userId == null) {
            return new java.util.HashMap<>();
        }
        List<Alert> entities = alertRepository.findByAccountIdInAndUserId(accountIds, userId);
        return entities.stream()
                .collect(java.util.stream.Collectors.toMap(
                    Alert::getAccountId,
                    this::entityToModel,
                    (existing, replacement) -> existing
                ));
    }

    @Override
    public Messenger findActiveAlarmsByUserId(Long userId) {
        if (userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        List<Alert> entities = alertRepository.findActiveAlarmsByUserId(userId);
        List<AlertModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("활성 알람 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(AlertModel alertModel) {
        try {
            if (alertModel.getAccountId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("계정 ID는 필수 값입니다.")
                        .build();
            }
            if (alertModel.getUserId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("사용자 ID는 필수 값입니다.")
                        .build();
            }
            
            // 같은 accountId에 대한 알람이 이미 있는지 확인
            Optional<Alert> existing = alertRepository.findByAccountIdAndUserId(
                    alertModel.getAccountId(), 
                    alertModel.getUserId()
            );
            
            if (existing.isPresent()) {
                // 기존 알람이 있으면 업데이트
                Alert alert = existing.get();
                alert.setAlarmEnabled(alertModel.getAlarmEnabled() != null ? alertModel.getAlarmEnabled() : false);
                alert.setAlarmDate(alertModel.getAlarmDate());
                alert.setAlarmTime(alertModel.getAlarmTime());
                alert.setUpdatedAt(LocalDateTime.now());
                Alert saved = alertRepository.save(alert);
                AlertModel model = entityToModel(saved);
                return Messenger.builder()
                        .code(200)
                        .message("알람 수정 성공")
                        .data(model)
                        .build();
            } else {
                // 새로 생성
                if (alertModel.getId() != null) {
                    alertModel.setId(null);
                }
                Alert entity = modelToEntity(alertModel);
                Alert saved = alertRepository.save(entity);
                AlertModel model = entityToModel(saved);
                return Messenger.builder()
                        .code(200)
                        .message("알람 저장 성공")
                        .data(model)
                        .build();
            }
        } catch (Exception e) {
            e.printStackTrace();
            return Messenger.builder()
                    .code(500)
                    .message("알람 저장 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger update(AlertModel alertModel) {
        if (alertModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (alertModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Alert> optionalEntity = alertRepository.findById(alertModel.getId());
        if (optionalEntity.isPresent()) {
            Alert existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 알람은 수정 불가
            if (!existing.getUserId().equals(alertModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 알람은 수정할 수 없습니다.")
                        .build();
            }
            
            Alert updated = Alert.builder()
                    .id(existing.getId())
                    .accountId(existing.getAccountId())
                    .userId(existing.getUserId())
                    .alarmEnabled(alertModel.getAlarmEnabled() != null ? alertModel.getAlarmEnabled() : existing.getAlarmEnabled())
                    .alarmDate(alertModel.getAlarmDate() != null ? alertModel.getAlarmDate() : existing.getAlarmDate())
                    .alarmTime(alertModel.getAlarmTime() != null ? alertModel.getAlarmTime() : existing.getAlarmTime())
                    .createdAt(existing.getCreatedAt())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            Alert saved = alertRepository.save(updated);
            AlertModel model = entityToModel(saved);
            return Messenger.builder()
                    .code(200)
                    .message("알람 수정 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("수정할 알람을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(AlertModel alertModel) {
        if (alertModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (alertModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Alert> optionalEntity = alertRepository.findById(alertModel.getId());
        if (optionalEntity.isPresent()) {
            Alert existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 알람은 삭제 불가
            if (!existing.getUserId().equals(alertModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 알람은 삭제할 수 없습니다.")
                        .build();
            }
            
            alertRepository.deleteById(alertModel.getId());
            return Messenger.builder()
                    .code(200)
                    .message("알람 삭제 성공")
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("삭제할 알람을 찾을 수 없습니다.")
                    .build();
        }
    }
}

