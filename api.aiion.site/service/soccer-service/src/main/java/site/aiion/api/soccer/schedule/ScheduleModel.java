package site.aiion.api.soccer.schedule;

import java.io.Serializable;
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
public class ScheduleModel implements Serializable {
    private Long id;
    private String sche_date;
    private String stadium_uk;
    private String gubun;
    private String hometeam_uk;
    private String awayteam_uk;
    private String home_score;
    private String away_score;
}

