package site.aiion.api.healthcare;

import java.util.List;
import site.aiion.api.healthcare.common.domain.Messenger;

public interface HealthcareService {
    public Messenger findById(HealthcareModel healthcareModel);

    public Messenger findAll();

    public Messenger findByUserId(Long userId);

    public Messenger findByUserIdAndType(Long userId, String type);

    public Messenger save(HealthcareModel healthcareModel);

    public Messenger saveAll(List<HealthcareModel> healthcareModelList);

    public Messenger update(HealthcareModel healthcareModel);

    public Messenger delete(HealthcareModel healthcareModel);

    public Messenger getComprehensiveAnalysis(Long userId);
}
