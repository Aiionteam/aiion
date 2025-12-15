package site.aiion.api.healthcare;

import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class ExerciseVideoRecommendationModel {
    private Long recId;

    private Long userId;

    private String exerciseType;

    private String youtubeQuery;

    private String videoId;

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime recommendedAt;
}

