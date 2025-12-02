package site.aiion.api.soccer.player;

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
@RequestMapping("/players")
public class PlayerController {

    private final PlayerService playerService;

    @PostMapping("/findById")
    public Messenger findById(@RequestBody PlayerModel playerModel) {
        return playerService.findById(playerModel);
    }

    @GetMapping
    public Messenger findAll() {
        return playerService.findAll();
    }

    @PostMapping
    public Messenger save(@RequestBody PlayerModel playerModel) {
        return playerService.save(playerModel);
    }

    @PostMapping("/saveAll")
    public Messenger saveAll(@RequestBody List<PlayerModel> playerModelList) {
        return playerService.saveAll(playerModelList);
    }

    @PutMapping
    public Messenger update(@RequestBody PlayerModel playerModel) {
        return playerService.update(playerModel);
    }

    @DeleteMapping
    public Messenger delete(@RequestBody PlayerModel playerModel) {
        return playerService.delete(playerModel);
    }

}
