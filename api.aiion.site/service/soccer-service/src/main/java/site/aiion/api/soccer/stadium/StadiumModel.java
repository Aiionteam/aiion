package site.aiion.api.soccer.stadium;

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
public class StadiumModel {
    private Long id;
    private String stadium_uk;
    private String stadium_name;
    private String hometeam_uk;
    private String seat_count;
    private String address;
    private String ddd;
    private String tel;
}
