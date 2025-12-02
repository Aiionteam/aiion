package site.aiion.api.soccer.player;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import site.aiion.api.soccer.team.Team;

@Entity
@Table(name = "players")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Player {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
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
    
    @ManyToOne
    @JoinColumn(name = "team_uk", referencedColumnName = "team_uk", insertable = false, updatable = false)
    private Team team;
}

