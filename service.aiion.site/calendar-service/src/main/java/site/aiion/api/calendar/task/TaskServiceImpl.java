package site.aiion.api.calendar.task;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import site.aiion.api.domain.Messenger;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;

    private TaskModel entityToModel(Task entity) {
        return TaskModel.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .text(entity.getText())
                .date(entity.getDate())
                .completed(entity.getCompleted() != null ? entity.getCompleted() : false)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private Task modelToEntity(TaskModel model) {
        LocalDateTime now = LocalDateTime.now();
        Task.TaskBuilder builder = Task.builder()
                .id(model.getId())
                .userId(model.getUserId())
                .text(model.getText())
                .date(model.getDate())
                .completed(model.getCompleted() != null ? model.getCompleted() : false)
                .createdAt(model.getCreatedAt() != null ? model.getCreatedAt() : now)
                .updatedAt(model.getUpdatedAt() != null ? model.getUpdatedAt() : now);
        
        return builder.build();
    }

    @Override
    public Messenger findById(TaskModel taskModel) {
        if (taskModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (taskModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Task> entity = taskRepository.findById(taskModel.getId());
        if (entity.isPresent()) {
            Task task = entity.get();
            // userId 검증: 다른 사용자의 할 일은 조회 불가
            if (!task.getUserId().equals(taskModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 할 일은 조회할 수 없습니다.")
                        .build();
            }
            TaskModel model = entityToModel(task);
            return Messenger.builder()
                    .code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("할 일을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findByUserId(Long userId) {
        if (userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        List<Task> entities = taskRepository.findByUserIdOrderByDateAsc(userId);
        List<TaskModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("할 일 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    public Messenger findByUserIdAndDate(Long userId, LocalDate date) {
        if (userId == null || date == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID와 날짜가 필요합니다.")
                    .build();
        }
        List<Task> entities = taskRepository.findByUserIdAndDateOrderByDateAsc(userId, date);
        List<TaskModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("할 일 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    public Messenger findByUserIdAndCompleted(Long userId, Boolean completed) {
        if (userId == null || completed == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID와 완료 상태가 필요합니다.")
                    .build();
        }
        List<Task> entities = taskRepository.findByUserIdAndCompletedOrderByDateAsc(userId, completed);
        List<TaskModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("할 일 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(TaskModel taskModel) {
        try {
            if (taskModel.getUserId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("사용자 ID는 필수 값입니다.")
                        .build();
            }
            if (taskModel.getDate() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("날짜는 필수 값입니다.")
                        .build();
            }
            if (taskModel.getText() == null || taskModel.getText().trim().isEmpty()) {
                return Messenger.builder()
                        .code(400)
                        .message("내용은 필수 값입니다.")
                        .build();
            }
            
            // 새로 생성하는 경우 id를 null로 설정
            if (taskModel.getId() != null) {
                // 업데이트가 아닌 새로 생성하는 경우 id를 무시
                taskModel.setId(null);
            }
            
            Task entity = modelToEntity(taskModel);
            Task saved = taskRepository.save(entity);
            TaskModel model = entityToModel(saved);
            return Messenger.builder()
                    .code(200)
                    .message("할 일 저장 성공: " + saved.getId())
                    .data(model)
                    .build();
        } catch (Exception e) {
            e.printStackTrace();
            return Messenger.builder()
                    .code(500)
                    .message("할 일 저장 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger saveAll(List<TaskModel> taskModelList) {
        List<Task> entities = taskModelList.stream()
                .map(this::modelToEntity)
                .collect(Collectors.toList());
        
        List<Task> saved = taskRepository.saveAll(entities);
        List<TaskModel> modelList = saved.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("할 일 일괄 저장 성공: " + saved.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger update(TaskModel taskModel) {
        if (taskModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (taskModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Task> optionalEntity = taskRepository.findById(taskModel.getId());
        if (optionalEntity.isPresent()) {
            Task existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 할 일은 수정 불가
            if (!existing.getUserId().equals(taskModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 할 일은 수정할 수 없습니다.")
                        .build();
            }
            
            Task updated = Task.builder()
                    .id(existing.getId())
                    .userId(existing.getUserId()) // userId는 변경 불가
                    .text(taskModel.getText() != null ? taskModel.getText() : existing.getText())
                    .date(taskModel.getDate() != null ? taskModel.getDate() : existing.getDate())
                    .completed(taskModel.getCompleted() != null ? taskModel.getCompleted() : existing.getCompleted())
                    .createdAt(existing.getCreatedAt())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            Task saved = taskRepository.save(updated);
            TaskModel model = entityToModel(saved);
            return Messenger.builder()
                    .code(200)
                    .message("할 일 수정 성공: " + taskModel.getId())
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("수정할 할 일을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger toggleCompleted(Long taskId, Long userId) {
        if (taskId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (userId == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Task> optionalEntity = taskRepository.findById(taskId);
        if (optionalEntity.isPresent()) {
            Task existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 할 일은 변경 불가
            if (!existing.getUserId().equals(userId)) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 할 일은 변경할 수 없습니다.")
                        .build();
            }
            
            Boolean newCompleted = !existing.getCompleted();
            
            Task updated = Task.builder()
                    .id(existing.getId())
                    .userId(existing.getUserId())
                    .text(existing.getText())
                    .date(existing.getDate())
                    .completed(newCompleted)
                    .createdAt(existing.getCreatedAt())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            Task saved = taskRepository.save(updated);
            TaskModel model = entityToModel(saved);
            return Messenger.builder()
                    .code(200)
                    .message("할 일 완료 상태 변경 성공: " + taskId + " -> " + newCompleted)
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("변경할 할 일을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(TaskModel taskModel) {
        if (taskModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (taskModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Task> optionalEntity = taskRepository.findById(taskModel.getId());
        if (optionalEntity.isPresent()) {
            Task existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 할 일은 삭제 불가
            if (!existing.getUserId().equals(taskModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 할 일은 삭제할 수 없습니다.")
                        .build();
            }
            
            taskRepository.deleteById(taskModel.getId());
            return Messenger.builder()
                    .code(200)
                    .message("할 일 삭제 성공: " + taskModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("삭제할 할 일을 찾을 수 없습니다.")
                    .build();
        }
    }
}

