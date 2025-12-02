package site.aiion.api.soccer.stadium;

import java.util.List;
import site.aiion.api.soccer.common.domain.Messenger;

public interface StadiumService {
    public Messenger findById(StadiumModel stadiumModel);
    public Messenger findAll();
    public Messenger save(StadiumModel stadiumModel);
    public Messenger saveAll(List<StadiumModel> stadiumModelList);
    public Messenger update(StadiumModel stadiumModel);
    public Messenger delete(StadiumModel stadiumModel);
    public Messenger findByWord(StadiumModel stadiumModel);
}
