package site.aiion.api.healthcare;

import java.util.List;
import site.aiion.api.healthcare.common.domain.Messenger;

public interface UserExerciseLogService {
    public Messenger findById(UserExerciseLogModel userExerciseLogModel);

    public Messenger findByUserId(Long userId);

    public Messenger save(UserExerciseLogModel userExerciseLogModel);

    public Messenger saveAll(List<UserExerciseLogModel> userExerciseLogModelList);

    public Messenger update(UserExerciseLogModel userExerciseLogModel);

    public Messenger delete(UserExerciseLogModel userExerciseLogModel);
}
