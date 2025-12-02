package site.aiion.api.soccer.stadium;

import java.util.List;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import site.aiion.api.soccer.schedule.Schedule;
import site.aiion.api.soccer.team.Team;

@Entity
@Table(name = "stadiums")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Stadium {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String stadium_uk;
    
    private String stadium_name;
    
    private String hometeam_uk;
    
    private String seat_count;
    
    private String address;
    
    private String ddd;
    
    private String tel;
    
    @OneToMany(mappedBy = "stadium")
    private List<Schedule> schedules;
    
    @OneToMany(mappedBy = "stadium")
    private List<Team> teams;
}

