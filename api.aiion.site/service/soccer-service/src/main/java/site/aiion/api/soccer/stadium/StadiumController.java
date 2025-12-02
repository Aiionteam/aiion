package site.aiion.api.soccer.stadium;

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
@RequestMapping("/stadiums")
public class StadiumController {

    private final StadiumService stadiumService;

    @PostMapping("/findById")
    public Messenger findById(@RequestBody StadiumModel stadiumModel) {
        return stadiumService.findById(stadiumModel);
    }

    @GetMapping
    public Messenger findAll() {
        return stadiumService.findAll();
    }

    @PostMapping
    public Messenger save(@RequestBody StadiumModel stadiumModel) {
        return stadiumService.save(stadiumModel);
    }

    @PostMapping("/all")
    public Messenger saveAll(@RequestBody List<StadiumModel> stadiumModelList) {
        return stadiumService.saveAll(stadiumModelList);
    }

    @PutMapping
    public Messenger update(@RequestBody StadiumModel stadiumModel) {
        return stadiumService.update(stadiumModel);
    }

    @DeleteMapping
    public Messenger delete(@RequestBody StadiumModel stadiumModel) {
        return stadiumService.delete(stadiumModel);
    }

}
