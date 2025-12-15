package site.aiion.api.user;

import java.util.List;
import site.aiion.api.user.common.domain.Messenger;

public interface UserService {
    public Messenger findById(UserModel userModel);
    public Messenger findByEmailAndProvider(String email, String provider);
    public Messenger findAll();
    public Messenger save(UserModel userModel);
    public Messenger saveAll(List<UserModel> userModelList);
    public Messenger update(UserModel userModel);
    public Messenger delete(UserModel userModel);
}
