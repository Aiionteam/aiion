package site.aiion.api.user;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import site.aiion.api.user.common.domain.Messenger;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    private UserModel entityToModel(User entity) {
        return UserModel.builder()
                .id(entity.getId())
                .name(entity.getName())
                .email(entity.getEmail())
                .nickname(entity.getNickname())
                .provider(entity.getProvider())
                .providerId(entity.getProviderId())
                .build();
    }

    private User modelToEntity(UserModel model) {
        // nickname이 없으면 name과 동일하게 설정
        String nickname = model.getNickname();
        if (nickname == null || nickname.trim().isEmpty()) {
            nickname = model.getName();
        }
        
        return User.builder()
                .id(model.getId())
                .name(model.getName())
                .email(model.getEmail())
                .nickname(nickname)
                .provider(model.getProvider())
                .providerId(model.getProviderId())
                .build();
    }

    @Override
    public Messenger findById(UserModel userModel) {
        if (userModel.getId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        Optional<User> entity = userRepository.findById(userModel.getId());
        if (entity.isPresent()) {
            UserModel model = entityToModel(entity.get());
            return Messenger.builder()
                    .Code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("사용자를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findByEmailAndProvider(String email, String provider) {
        if (email == null || email.trim().isEmpty()) {
            return Messenger.builder()
                    .Code(400)
                    .message("이메일이 필요합니다.")
                    .build();
        }
        if (provider == null || provider.trim().isEmpty()) {
            return Messenger.builder()
                    .Code(400)
                    .message("제공자 정보가 필요합니다.")
                    .build();
        }
        
        Optional<User> entity = userRepository.findByEmailAndProvider(email, provider);
        if (entity.isPresent()) {
            UserModel model = entityToModel(entity.get());
            return Messenger.builder()
                    .Code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("사용자를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findAll() {
        List<User> entities = userRepository.findAll();
        List<UserModel> modelList = entities.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .Code(200)
                .message("전체 조회 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger save(UserModel userModel) {
        // save 전에 먼저 조회 시도 (중복 키 에러 방지)
        if (userModel.getEmail() != null && userModel.getProvider() != null) {
            Optional<User> existingUser = userRepository.findByEmailAndProvider(
                userModel.getEmail(), 
                userModel.getProvider()
            );
            if (existingUser.isPresent()) {
                // 이미 존재하는 사용자 - 기존 사용자 정보 반환
                UserModel model = entityToModel(existingUser.get());
                return Messenger.builder()
                        .Code(200)
                        .message("이미 존재하는 사용자: " + existingUser.get().getId())
                        .data(model)
                        .build();
            }
        }
        
        // 사용자가 없으면 새로 저장
        try {
            User entity = modelToEntity(userModel);
            User saved = userRepository.save(entity);
            UserModel model = entityToModel(saved);
            return Messenger.builder()
                    .Code(200)
                    .message("저장 성공: " + saved.getId())
                    .data(model)
                    .build();
        } catch (DataIntegrityViolationException e) {
            // 예외적으로 중복 키 에러가 발생한 경우 (동시성 문제 등)
            // 기존 사용자 다시 조회 시도
            if (userModel.getEmail() != null && userModel.getProvider() != null) {
                Optional<User> existingUser = userRepository.findByEmailAndProvider(
                    userModel.getEmail(), 
                    userModel.getProvider()
                );
                if (existingUser.isPresent()) {
                    UserModel model = entityToModel(existingUser.get());
                    return Messenger.builder()
                            .Code(200)
                            .message("이미 존재하는 사용자: " + existingUser.get().getId())
                            .data(model)
                            .build();
                }
            }
            // 조회 실패 시 에러 반환
            return Messenger.builder()
                    .Code(409)
                    .message("이미 존재하는 사용자입니다. 이메일: " + userModel.getEmail())
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger saveAll(List<UserModel> userModelList) {
        List<User> entities = userModelList.stream()
                .map(this::modelToEntity)
                .collect(Collectors.toList());
        
        List<User> saved = userRepository.saveAll(entities);
        return Messenger.builder()
                .Code(200)
                .message("일괄 저장 성공: " + saved.size() + "개")
                .build();
    }

    @Override
    @Transactional
    public Messenger update(UserModel userModel) {
        if (userModel.getId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        Optional<User> optionalEntity = userRepository.findById(userModel.getId());
        if (optionalEntity.isPresent()) {
            User existing = optionalEntity.get();
            
            User updated = User.builder()
                    .id(existing.getId())
                    .name(userModel.getName() != null ? userModel.getName() : existing.getName())
                    .email(userModel.getEmail() != null ? userModel.getEmail() : existing.getEmail())
                    .nickname(userModel.getNickname() != null ? userModel.getNickname() : existing.getNickname())
                    .provider(userModel.getProvider() != null ? userModel.getProvider() : existing.getProvider())
                    .providerId(userModel.getProviderId() != null ? userModel.getProviderId() : existing.getProviderId())
                    .build();
            
            User saved = userRepository.save(updated);
            UserModel model = entityToModel(saved);
            return Messenger.builder()
                    .Code(200)
                    .message("수정 성공: " + userModel.getId())
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("수정할 사용자를 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(UserModel userModel) {
        if (userModel.getId() == null) {
            return Messenger.builder()
                    .Code(400)
                    .message("ID가 필요합니다.")
                    .build();
        }
        Optional<User> optionalEntity = userRepository.findById(userModel.getId());
        if (optionalEntity.isPresent()) {
            userRepository.deleteById(userModel.getId());
            return Messenger.builder()
                    .Code(200)
                    .message("삭제 성공: " + userModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("삭제할 사용자를 찾을 수 없습니다.")
                    .build();
        }
    }

}
