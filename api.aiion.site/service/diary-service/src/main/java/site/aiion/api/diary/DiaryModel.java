package site.aiion.api.diary;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class DiaryModel {
    private Long id;
    
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate diaryDate;
    
    private String title;
    private String content;
    private Long userId;
}

