package site.aiion.api.account;

import java.util.List;
import site.aiion.api.account.common.domain.Messenger;

public interface AccountService {
    public Messenger findById(AccountModel accountModel);
    public Messenger findAll();
    public Messenger findByUserId(Long userId);
    public Messenger save(AccountModel accountModel);
    public Messenger saveAll(List<AccountModel> accountModelList);
    public Messenger update(AccountModel accountModel);
    public Messenger delete(AccountModel accountModel);
}

