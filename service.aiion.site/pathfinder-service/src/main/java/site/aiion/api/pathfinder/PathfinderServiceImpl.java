package site.aiion.api.pathfinder;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import site.aiion.api.pathfinder.common.domain.Messenger;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class PathfinderServiceImpl implements PathfinderService {

    private final PathfinderRepository pathfinderRepository;

    private PathfinderModel entityToModel(Pathfinder entity) {
        return PathfinderModel.builder()
                .id(entity.getId())
                .createdAt(entity.getCreatedAt())
                .title(entity.getTitle())
                .description(entity.getDescription())
                .userId(entity.getUserId())
                .build();
    }

    private Pathfinder modelToEntity(PathfinderModel model) {
        return Pathfinder.builder()
                .id(model.getId())
                .createdAt(model.getCreatedAt())
                .title(model.getTitle())
                .description(model.getDescription())
                .userId(model.getUserId())
                .build();
    }

    @Override
    public Messenger findById(PathfinderModel pathfinderModel) {
        if (pathfinderModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        Optional<Pathfinder> entity = pathfinderRepository.findById(pathfinderModel.getId());
        if (entity.isPresent()) {
            PathfinderModel model = entityToModel(entity.get());
            return Messenger.builder()
                    .code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("경로 탐색 정보를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findAll() {
        List<Pathfinder> entities = pathfinderRepository.findAll();
        List<PathfinderModel> modelList = entities.stream()
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
        List<Pathfinder> entities = pathfinderRepository.findByUserId(userId);
        List<PathfinderModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("사용자별 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(PathfinderModel pathfinderModel) {
        if (pathfinderModel.getCreatedAt() == null) {
            pathfinderModel.setCreatedAt(java.time.LocalDateTime.now());
        }
        
        // userId가 필수값
        if (pathfinderModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID는 필수 값입니다.")
                    .build();
        }
        
        // 새 경로 탐색 정보 저장 시 ID를 null로 설정 (데이터베이스에서 자동 생성)
        Pathfinder entity = Pathfinder.builder()
                .id(null)  // 새 엔티티는 ID를 null로 설정
                .createdAt(pathfinderModel.getCreatedAt())
                .title(pathfinderModel.getTitle())
                .description(pathfinderModel.getDescription())
                .userId(pathfinderModel.getUserId())
                .build();
        
        Pathfinder saved = pathfinderRepository.save(entity);
        PathfinderModel model = entityToModel(saved);
        return Messenger.builder()
                .code(200)
                .message("저장 성공: " + saved.getId())
                .data(model)
                .build();
    }

    @Override
    @Transactional
    public Messenger saveAll(List<PathfinderModel> pathfinderModelList) {
        // userId가 없는 항목이 있는지 확인
        boolean hasNullUserId = pathfinderModelList.stream()
                .anyMatch(model -> model.getUserId() == null);
        
        if (hasNullUserId) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID는 필수 값입니다. 모든 경로 탐색 정보에 사용자 ID를 설정해주세요.")
                    .build();
        }
        
        // 새 경로 탐색 정보 저장 시 모든 ID를 null로 설정
        List<Pathfinder> entities = pathfinderModelList.stream()
                .map(model -> {
                    if (model.getCreatedAt() == null) {
                        model.setCreatedAt(java.time.LocalDateTime.now());
                    }
                    return Pathfinder.builder()
                            .id(null)  // 새 엔티티는 ID를 null로 설정
                            .createdAt(model.getCreatedAt())
                            .title(model.getTitle())
                            .description(model.getDescription())
                            .userId(model.getUserId())
                            .build();
                })
                .collect(Collectors.toList());
        
        List<Pathfinder> saved = pathfinderRepository.saveAll(entities);
        return Messenger.builder()
                .code(200)
                .message("일괄 저장 성공: " + saved.size() + "개")
                .build();
    }

    @Override
    @Transactional
    public Messenger update(PathfinderModel pathfinderModel) {
        if (pathfinderModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        Optional<Pathfinder> optionalEntity = pathfinderRepository.findById(pathfinderModel.getId());
        if (optionalEntity.isPresent()) {
            Pathfinder existing = optionalEntity.get();
            
            Pathfinder updated = Pathfinder.builder()
                    .id(existing.getId())
                    .createdAt(pathfinderModel.getCreatedAt() != null ? pathfinderModel.getCreatedAt() : existing.getCreatedAt())
                    .title(pathfinderModel.getTitle() != null ? pathfinderModel.getTitle() : existing.getTitle())
                    .description(pathfinderModel.getDescription() != null ? pathfinderModel.getDescription() : existing.getDescription())
                    .userId(pathfinderModel.getUserId() != null ? pathfinderModel.getUserId() : existing.getUserId())
                    .build();
            
            Pathfinder saved = pathfinderRepository.save(updated);
            PathfinderModel model = entityToModel(saved);
            return Messenger.builder()
                    .code(200)
                    .message("수정 성공: " + pathfinderModel.getId())
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("수정할 경로 탐색 정보를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(PathfinderModel pathfinderModel) {
        if (pathfinderModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        Optional<Pathfinder> optionalEntity = pathfinderRepository.findById(pathfinderModel.getId());
        if (optionalEntity.isPresent()) {
            pathfinderRepository.deleteById(pathfinderModel.getId());
            return Messenger.builder()
                    .code(200)
                    .message("삭제 성공: " + pathfinderModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("삭제할 경로 탐색 정보를 찾을 수 없습니다.")
                    .build();
        }
    }

}

