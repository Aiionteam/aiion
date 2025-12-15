package site.aiion.api.calendar.task;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
public class TaskModel {
    private Long id;
    private Long userId;
    private String text;
    private LocalDate date;
    private Boolean completed;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

