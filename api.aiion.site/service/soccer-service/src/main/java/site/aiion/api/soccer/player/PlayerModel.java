package site.aiion.api.soccer.player;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.format.DateTimeFormatter;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class PlayerModel {
    public static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    
    private Long id;
    
    private String player_uk;
    
    private String player_name;
    
    private String e_player_name;
    
    private String nickname;
    
    private String join_yyyy;
    
    private String position;
    
    private String back_no;
    
    private String nation;
    
    private String birth_date;
    
    private String solar;
    
    private String height;
    
    private String weight;
    
    private String team_uk;
}
