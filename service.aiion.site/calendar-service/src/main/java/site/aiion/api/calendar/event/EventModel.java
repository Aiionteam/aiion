package site.aiion.api.calendar.event;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class EventModel {
    private Long id;
    private Long userId;
    private String text;
    private LocalDate date;
    private LocalTime time;
    private String description;
    private Boolean isAllDay;
    private Boolean alarmOn;
    private Boolean notification;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

