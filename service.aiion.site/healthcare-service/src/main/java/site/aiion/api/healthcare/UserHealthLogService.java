package site.aiion.api.healthcare;

import java.util.List;
import site.aiion.api.healthcare.common.domain.Messenger;

public interface UserHealthLogService {
    public Messenger findById(UserHealthLogModel userHealthLogModel);

    public Messenger findByUserId(Long userId);

    public Messenger save(UserHealthLogModel userHealthLogModel);

    public Messenger saveAll(List<UserHealthLogModel> userHealthLogModelList);

    public Messenger update(UserHealthLogModel userHealthLogModel);

    public Messenger delete(UserHealthLogModel userHealthLogModel);
}

