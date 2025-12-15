package site.aiion.api.calendar.event;

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
public class EventServiceImpl implements EventService {

    private final EventRepository eventRepository;

    private EventModel entityToModel(Event entity) {
        return EventModel.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .text(entity.getText())
                .date(entity.getDate())
                .time(entity.getTime())
                .description(entity.getDescription())
                .isAllDay(entity.getIsAllDay() != null ? entity.getIsAllDay() : false)
                .alarmOn(entity.getAlarmOn() != null ? entity.getAlarmOn() : false)
                .notification(entity.getNotification() != null ? entity.getNotification() : false)
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }

    private Event modelToEntity(EventModel model) {
        LocalDateTime now = LocalDateTime.now();
        Event.EventBuilder builder = Event.builder()
                // 새로 생성하는 경우 id는 null (자동 생성)
                // 업데이트하는 경우에만 id 설정
                .id(model.getId())
                .userId(model.getUserId())
                .text(model.getText())
                .date(model.getDate())
                .time(model.getTime())
                .description(model.getDescription())
                .isAllDay(model.getIsAllDay() != null ? model.getIsAllDay() : false)
                .alarmOn(model.getAlarmOn() != null ? model.getAlarmOn() : false)
                .notification(model.getNotification() != null ? model.getNotification() : false)
                .createdAt(model.getCreatedAt() != null ? model.getCreatedAt() : now)
                .updatedAt(model.getUpdatedAt() != null ? model.getUpdatedAt() : now);
        
        return builder.build();
    }

    @Override
    public Messenger findById(EventModel eventModel) {
        if (eventModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (eventModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Event> entity = eventRepository.findById(eventModel.getId());
        if (entity.isPresent()) {
            Event event = entity.get();
            // userId 검증: 다른 사용자의 일정은 조회 불가
            if (!event.getUserId().equals(eventModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 일정은 조회할 수 없습니다.")
                        .build();
            }
            EventModel model = entityToModel(event);
            return Messenger.builder()
                    .code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("일정을 찾을 수 없습니다.")
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
        List<Event> entities = eventRepository.findByUserIdOrderByDateAscTimeAsc(userId);
        List<EventModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("일정 조회 성공: " + modelList.size() + "개")
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
        List<Event> entities = eventRepository.findByUserIdAndDateOrderByTimeAsc(userId, date);
        List<EventModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("일정 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    public Messenger findByUserIdAndDateRange(Long userId, LocalDate startDate, LocalDate endDate) {
        if (userId == null || startDate == null || endDate == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID, 시작 날짜, 종료 날짜가 필요합니다.")
                    .build();
        }
        if (startDate.isAfter(endDate)) {
            return Messenger.builder()
                    .code(400)
                    .message("시작 날짜가 종료 날짜보다 늦을 수 없습니다.")
                    .build();
        }
        List<Event> entities = eventRepository.findByUserIdAndDateBetween(userId, startDate, endDate);
        List<EventModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("일정 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(EventModel eventModel) {
        try {
            if (eventModel.getUserId() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("사용자 ID는 필수 값입니다.")
                        .build();
            }
            if (eventModel.getDate() == null) {
                return Messenger.builder()
                        .code(400)
                        .message("날짜는 필수 값입니다.")
                        .build();
            }
            if (eventModel.getText() == null || eventModel.getText().trim().isEmpty()) {
                return Messenger.builder()
                        .code(400)
                        .message("내용은 필수 값입니다.")
                        .build();
            }
            
            // 새로 생성하는 경우 id를 null로 설정
            if (eventModel.getId() != null) {
                // 업데이트가 아닌 새로 생성하는 경우 id를 무시
                eventModel.setId(null);
            }
            
            Event entity = modelToEntity(eventModel);
            Event saved = eventRepository.save(entity);
            EventModel model = entityToModel(saved);
            return Messenger.builder()
                    .code(200)
                    .message("일정 저장 성공: " + saved.getId())
                    .data(model)
                    .build();
        } catch (Exception e) {
            e.printStackTrace();
            return Messenger.builder()
                    .code(500)
                    .message("일정 저장 중 오류가 발생했습니다: " + e.getMessage())
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger saveAll(List<EventModel> eventModelList) {
        List<Event> entities = eventModelList.stream()
                .map(this::modelToEntity)
                .collect(Collectors.toList());
        
        List<Event> saved = eventRepository.saveAll(entities);
        List<EventModel> modelList = saved.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .code(200)
                .message("일정 일괄 저장 성공: " + saved.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger update(EventModel eventModel) {
        if (eventModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (eventModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Event> optionalEntity = eventRepository.findById(eventModel.getId());
        if (optionalEntity.isPresent()) {
            Event existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 일정은 수정 불가
            if (!existing.getUserId().equals(eventModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 일정은 수정할 수 없습니다.")
                        .build();
            }
            
            Event updated = Event.builder()
                    .id(existing.getId())
                    .userId(existing.getUserId()) // userId는 변경 불가
                    .text(eventModel.getText() != null ? eventModel.getText() : existing.getText())
                    .date(eventModel.getDate() != null ? eventModel.getDate() : existing.getDate())
                    .time(eventModel.getTime() != null ? eventModel.getTime() : existing.getTime())
                    .description(eventModel.getDescription() != null ? eventModel.getDescription() : existing.getDescription())
                    .isAllDay(eventModel.getIsAllDay() != null ? eventModel.getIsAllDay() : existing.getIsAllDay())
                    .alarmOn(eventModel.getAlarmOn() != null ? eventModel.getAlarmOn() : existing.getAlarmOn())
                    .notification(eventModel.getNotification() != null ? eventModel.getNotification() : existing.getNotification())
                    .createdAt(existing.getCreatedAt())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            Event saved = eventRepository.save(updated);
            EventModel model = entityToModel(saved);
            return Messenger.builder()
                    .code(200)
                    .message("일정 수정 성공: " + eventModel.getId())
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("수정할 일정을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(EventModel eventModel) {
        if (eventModel.getId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        if (eventModel.getUserId() == null) {
            return Messenger.builder()
                    .code(400)
                    .message("사용자 ID가 필요합니다.")
                    .build();
        }
        Optional<Event> optionalEntity = eventRepository.findById(eventModel.getId());
        if (optionalEntity.isPresent()) {
            Event existing = optionalEntity.get();
            
            // userId 검증: 다른 사용자의 일정은 삭제 불가
            if (!existing.getUserId().equals(eventModel.getUserId())) {
                return Messenger.builder()
                        .code(403)
                        .message("다른 사용자의 일정은 삭제할 수 없습니다.")
                        .build();
            }
            
            eventRepository.deleteById(eventModel.getId());
            return Messenger.builder()
                    .code(200)
                    .message("일정 삭제 성공: " + eventModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .code(404)
                    .message("삭제할 일정을 찾을 수 없습니다.")
                    .build();
        }
    }
}

