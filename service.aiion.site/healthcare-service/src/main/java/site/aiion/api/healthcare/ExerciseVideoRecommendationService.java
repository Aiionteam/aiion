package site.aiion.api.healthcare;

import java.util.List;
import site.aiion.api.healthcare.common.domain.Messenger;

public interface ExerciseVideoRecommendationService {
    public Messenger findById(ExerciseVideoRecommendationModel exerciseVideoRecommendationModel);

    public Messenger findByUserId(Long userId);

    public Messenger save(ExerciseVideoRecommendationModel exerciseVideoRecommendationModel);

    public Messenger saveAll(List<ExerciseVideoRecommendationModel> exerciseVideoRecommendationModelList);

    public Messenger update(ExerciseVideoRecommendationModel exerciseVideoRecommendationModel);

    public Messenger delete(ExerciseVideoRecommendationModel exerciseVideoRecommendationModel);
}

