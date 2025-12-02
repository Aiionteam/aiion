package site.aiion.api.soccer.schedule;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import site.aiion.api.soccer.stadium.Stadium;
import site.aiion.api.soccer.team.Team;

@Entity
@Table(name = "schedules")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Schedule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String sche_date;
    
    private String stadium_uk;
    
    private String gubun;
    
    private String hometeam_uk;
    
    private String awayteam_uk;
    
    private String home_score;
    
    private String away_score;

    @ManyToOne
    @JoinColumn(name = "stadium_uk", referencedColumnName = "stadium_uk", insertable = false, updatable = false)
    private Stadium stadium;
    
    @ManyToOne
    @JoinColumn(name = "hometeam_uk", referencedColumnName = "team_uk", insertable = false, updatable = false)
    private Team hometeam;
    
    @ManyToOne
    @JoinColumn(name = "awayteam_uk", referencedColumnName = "team_uk", insertable = false, updatable = false)
    private Team awayteam;
}

