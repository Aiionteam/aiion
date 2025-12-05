package site.aiion.api.healthcare;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;
import site.aiion.api.healthcare.common.domain.Messenger;

@Service
@RequiredArgsConstructor
public class UserScanDocumentServiceImpl implements UserScanDocumentService {

    private final UserScanDocumentRepository userScanDocumentRepository;

    @Override
    public Messenger findById(UserScanDocumentModel userScanDocumentModel) {
        try {
            if (userScanDocumentModel.getDocId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("doc_id가 필요합니다.")
                        .build();
            }

            UserScanDocument entity = userScanDocumentRepository.findById(userScanDocumentModel.getDocId())
                    .orElse(null);

            if (entity == null) {
                return Messenger.builder()
                        .code(404)
                        .message("스캔 문서를 찾을 수 없습니다.")
                        .build();
            }

            UserScanDocumentModel model = entityToModel(entity);

            return Messenger.builder()
                    .code(200)
                    .message("스캔 문서 조회 성공")
                    .data(model)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("스캔 문서 조회 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger findByUserId(Long userId) {
        try {
            List<UserScanDocument> entities = userScanDocumentRepository.findByUserId(userId);
            List<UserScanDocumentModel> models = entities.stream()
                    .map(this::entityToModel)
                    .collect(Collectors.toList());

            return Messenger.builder()
                    .code(200)
                    .message("스캔 문서 조회 성공: " + models.size() + "개")
                    .data(models)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("스캔 문서 조회 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger save(UserScanDocumentModel userScanDocumentModel) {
        try {
            // uploadedAt이 없으면 현재 시간으로 설정
            if (userScanDocumentModel.getUploadedAt() == null) {
                userScanDocumentModel.setUploadedAt(java.time.LocalDateTime.now());
            }

            UserScanDocument entity = modelToEntity(userScanDocumentModel);
            UserScanDocument savedEntity = userScanDocumentRepository.save(entity);
            UserScanDocumentModel savedModel = entityToModel(savedEntity);

            return Messenger.builder()
                    .code(200)
                    .message("스캔 문서 저장 성공")
                    .data(savedModel)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("스캔 문서 저장 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger saveAll(List<UserScanDocumentModel> userScanDocumentModelList) {
        try {
            // uploadedAt이 없으면 현재 시간으로 설정
            userScanDocumentModelList.forEach(model -> {
                if (model.getUploadedAt() == null) {
                    model.setUploadedAt(java.time.LocalDateTime.now());
                }
            });

            List<UserScanDocument> entities = userScanDocumentModelList.stream()
                    .map(this::modelToEntity)
                    .collect(Collectors.toList());

            List<UserScanDocument> savedEntities = userScanDocumentRepository.saveAll(entities);
            List<UserScanDocumentModel> savedModels = savedEntities.stream()
                    .map(this::entityToModel)
                    .collect(Collectors.toList());

            return Messenger.builder()
                    .code(200)
                    .message("스캔 문서 일괄 저장 성공: " + savedModels.size() + "개")
                    .data(savedModels)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("스캔 문서 일괄 저장 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger update(UserScanDocumentModel userScanDocumentModel) {
        try {
            if (userScanDocumentModel.getDocId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("doc_id가 필요합니다.")
                        .build();
            }

            UserScanDocument existingEntity = userScanDocumentRepository.findById(userScanDocumentModel.getDocId())
                    .orElse(null);

            if (existingEntity == null) {
                return Messenger.builder()
                        .code(404)
                        .message("스캔 문서를 찾을 수 없습니다.")
                        .build();
            }

            // 기존 엔티티 업데이트
            if (userScanDocumentModel.getUserId() != null) {
                existingEntity.setUserId(userScanDocumentModel.getUserId());
            }
            if (userScanDocumentModel.getDocType() != null) {
                existingEntity.setDocType(userScanDocumentModel.getDocType());
            }
            if (userScanDocumentModel.getUploadedAt() != null) {
                existingEntity.setUploadedAt(userScanDocumentModel.getUploadedAt());
            }
            if (userScanDocumentModel.getParsedData() != null) {
                existingEntity.setParsedData(userScanDocumentModel.getParsedData());
            }
            if (userScanDocumentModel.getHospitalSuggestion() != null) {
                existingEntity.setHospitalSuggestion(userScanDocumentModel.getHospitalSuggestion());
            }

            UserScanDocument updatedEntity = userScanDocumentRepository.save(existingEntity);
            UserScanDocumentModel updatedModel = entityToModel(updatedEntity);

            return Messenger.builder()
                    .code(200)
                    .message("스캔 문서 수정 성공")
                    .data(updatedModel)
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("스캔 문서 수정 실패: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public Messenger delete(UserScanDocumentModel userScanDocumentModel) {
        try {
            if (userScanDocumentModel.getDocId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("doc_id가 필요합니다.")
                        .build();
            }

            if (!userScanDocumentRepository.existsById(userScanDocumentModel.getDocId())) {
                return Messenger.builder()
                        .code(404)
                        .message("스캔 문서를 찾을 수 없습니다.")
                        .build();
            }

            userScanDocumentRepository.deleteById(userScanDocumentModel.getDocId());

            return Messenger.builder()
                    .code(200)
                    .message("스캔 문서 삭제 성공")
                    .build();
        } catch (Exception e) {
            return Messenger.builder()
                    .code(500)
                    .message("스캔 문서 삭제 실패: " + e.getMessage())
                    .build();
        }
    }

    private UserScanDocumentModel entityToModel(UserScanDocument entity) {
        return UserScanDocumentModel.builder()
                .docId(entity.getDocId())
                .userId(entity.getUserId())
                .docType(entity.getDocType())
                .uploadedAt(entity.getUploadedAt())
                .parsedData(entity.getParsedData())
                .hospitalSuggestion(entity.getHospitalSuggestion())
                .build();
    }

    private UserScanDocument modelToEntity(UserScanDocumentModel model) {
        return UserScanDocument.builder()
                .docId(model.getDocId())
                .userId(model.getUserId())
                .docType(model.getDocType())
                .uploadedAt(model.getUploadedAt() != null ? model.getUploadedAt() : java.time.LocalDateTime.now())
                .parsedData(model.getParsedData())
                .hospitalSuggestion(model.getHospitalSuggestion())
                .build();
    }
}

