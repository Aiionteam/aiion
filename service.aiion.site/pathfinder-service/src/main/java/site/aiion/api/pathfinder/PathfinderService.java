package site.aiion.api.pathfinder;

import java.util.List;
import site.aiion.api.pathfinder.common.domain.Messenger;

public interface PathfinderService {
    public Messenger findById(PathfinderModel pathfinderModel);
    public Messenger findAll();
    public Messenger findByUserId(Long userId);
    public Messenger save(PathfinderModel pathfinderModel);
    public Messenger saveAll(List<PathfinderModel> pathfinderModelList);
    public Messenger update(PathfinderModel pathfinderModel);
    public Messenger delete(PathfinderModel pathfinderModel);
}

