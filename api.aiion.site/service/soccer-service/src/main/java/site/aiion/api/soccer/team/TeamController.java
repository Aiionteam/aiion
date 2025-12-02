package site.aiion.api.soccer.team;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import site.aiion.api.soccer.common.domain.Messenger;

@RestController
@RequiredArgsConstructor
@RequestMapping("/team")
public class TeamController {

    private final TeamService teamService;

    @PostMapping("/findById")
    public Messenger findById(@RequestBody TeamModel teamModel) {
        return teamService.findById(teamModel);
    }

    @GetMapping
    public Messenger findAll() {
        return teamService.findAll();
    }

    @PostMapping
    public Messenger save(@RequestBody TeamModel teamModel) {
        return teamService.save(teamModel);
    }

    @PostMapping("/saveAll")
    public Messenger saveAll(@RequestBody List<TeamModel> teamModelList) {
        return teamService.saveAll(teamModelList);
    }

    @PutMapping
    public Messenger update(@RequestBody TeamModel teamModel) {
        return teamService.update(teamModel);
    }

    @DeleteMapping
    public Messenger delete(@RequestBody TeamModel teamModel) {
        return teamService.delete(teamModel);
    }

}
