package site.aiion.api.soccer.schedule;

import java.util.List;
import site.aiion.api.soccer.common.domain.Messenger;

public interface ScheduleService {
    public Messenger findById(ScheduleModel scheduleModel);
    public Messenger findAll();
    public Messenger save(ScheduleModel scheduleModel);
    public Messenger saveAll(List<ScheduleModel> scheduleModelList);
    public Messenger update(ScheduleModel scheduleModel);
    public Messenger delete(ScheduleModel scheduleModel);
    public Messenger findByWord(ScheduleModel scheduleModel);
}

