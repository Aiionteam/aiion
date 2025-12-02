package site.aiion.api.soccer.team;

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
public class TeamModel {
    private Long id;
    private String team_uk;
    private String region_name;
    private String team_name;
    private String e_team_name;
    private String orig_yyyy;
    private String zip_code1;
    private String zip_code2;
    private String address;
    private String ddd;
    private String tel;
    private String fax;
    private String homepage;
    private String owner;
    private String stadium_uk;
}
