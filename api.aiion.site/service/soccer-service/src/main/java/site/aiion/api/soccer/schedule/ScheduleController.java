package site.aiion.api.soccer.schedule;

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
@RequestMapping("/schedules")
public class ScheduleController {

    private final ScheduleService scheduleService;

    @PostMapping("/findById")
    public Messenger findById(@RequestBody ScheduleModel scheduleModel) {
        return scheduleService.findById(scheduleModel);
    }

    @GetMapping
    public Messenger findAll() {
        return scheduleService.findAll();
    }

    @PostMapping
    public Messenger save(@RequestBody ScheduleModel scheduleModel) {
        return scheduleService.save(scheduleModel);
    }

    @PostMapping("/saveAll")
    public Messenger saveAll(@RequestBody List<ScheduleModel> scheduleModelList) {
        return scheduleService.saveAll(scheduleModelList);
    }

    @PutMapping
    public Messenger update(@RequestBody ScheduleModel scheduleModel) {
        return scheduleService.update(scheduleModel);
    }

    @DeleteMapping
    public Messenger delete(@RequestBody ScheduleModel scheduleModel) {
        return scheduleService.delete(scheduleModel);
    }

}
