package site.aiion.api.healthcare;

import java.util.List;
import site.aiion.api.healthcare.common.domain.Messenger;

public interface UserScanDocumentService {
    public Messenger findById(UserScanDocumentModel userScanDocumentModel);

    public Messenger findByUserId(Long userId);

    public Messenger save(UserScanDocumentModel userScanDocumentModel);

    public Messenger saveAll(List<UserScanDocumentModel> userScanDocumentModelList);

    public Messenger update(UserScanDocumentModel userScanDocumentModel);

    public Messenger delete(UserScanDocumentModel userScanDocumentModel);
}

