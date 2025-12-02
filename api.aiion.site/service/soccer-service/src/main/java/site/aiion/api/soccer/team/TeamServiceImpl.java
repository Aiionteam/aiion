package site.aiion.api.soccer.team;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import site.aiion.api.soccer.common.domain.Messenger;
import site.aiion.api.soccer.stadium.StadiumRepository;
import site.aiion.api.soccer.stadium.Stadium;

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final StadiumRepository stadiumRepository;

    private TeamModel entityToModel(Team entity) {
        return TeamModel.builder()
                .id(entity.getId())
                .team_uk(entity.getTeam_uk())
                .region_name(entity.getRegion_name())
                .team_name(entity.getTeam_name())
                .e_team_name(entity.getE_team_name())
                .orig_yyyy(entity.getOrig_yyyy())
                .zip_code1(entity.getZip_code1())
                .zip_code2(entity.getZip_code2())
                .address(entity.getAddress())
                .ddd(entity.getDdd())
                .tel(entity.getTel())
                .fax(entity.getFax())
                .homepage(entity.getHomepage())
                .owner(entity.getOwner())
                .stadium_uk(entity.getStadium_uk())
                .build();
    }

    private Team modelToEntity(TeamModel model) {
        Stadium stadium = null;
        if (model.getStadium_uk() != null) {
            stadium = stadiumRepository.findByStadium_uk(model.getStadium_uk()).orElse(null);
        }
        return Team.builder()
                .id(model.getId())
                .team_uk(model.getTeam_uk())
                .region_name(model.getRegion_name())
                .team_name(model.getTeam_name())
                .e_team_name(model.getE_team_name())
                .orig_yyyy(model.getOrig_yyyy())
                .zip_code1(model.getZip_code1())
                .zip_code2(model.getZip_code2())
                .address(model.getAddress())
                .ddd(model.getDdd())
                .tel(model.getTel())
                .fax(model.getFax())
                .homepage(model.getHomepage())
                .owner(model.getOwner())
                .stadium_uk(model.getStadium_uk())
                .stadium(stadium)
                .build();
    }

    @Override
    public Messenger findById(TeamModel teamModel) {
        Optional<Team> entity = teamRepository.findById(teamModel.getId());
        if (entity.isPresent()) {
            TeamModel model = entityToModel(entity.get());
            return Messenger.builder()
                    .Code(200)
                    .message("조회 성공")
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("팀을 찾을 수 없습니다.")
                    .build();
        }
    }


    @Override
    public Messenger findAll() {
        List<Team> entities = teamRepository.findAll();
        List<TeamModel> modelList = entities.stream()
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
    public Messenger save(TeamModel teamModel) {
        Team entity = modelToEntity(teamModel);
        Team saved = teamRepository.save(entity);
        TeamModel model = entityToModel(saved);
        return Messenger.builder()
                .Code(200)
                .message("저장 성공: " + saved.getId())
                .data(model)
                .build();
    }

    @Override
    @Transactional
    public Messenger saveAll(List<TeamModel> teamModelList) {
        List<Team> entities = teamModelList.stream()
                .map(this::modelToEntity)
                .collect(Collectors.toList());
        
        List<Team> saved = teamRepository.saveAll(entities);
        return Messenger.builder()
                .Code(200)
                .message("일괄 저장 성공: " + saved.size() + "개")
                .build();
    }

    @Override
    @Transactional
    public Messenger update(TeamModel teamModel) {
        Optional<Team> optionalEntity = teamRepository.findById(teamModel.getId());
        if (optionalEntity.isPresent()) {
            Team existing = optionalEntity.get();
            Stadium stadium = teamModel.getStadium_uk() != null 
                    ? stadiumRepository.findByStadium_uk(teamModel.getStadium_uk()).orElse(existing.getStadium()) 
                    : existing.getStadium();
            
            Team updated = Team.builder()
                    .id(existing.getId())
                    .team_uk(teamModel.getTeam_uk() != null ? teamModel.getTeam_uk() : existing.getTeam_uk())
                    .region_name(teamModel.getRegion_name() != null ? teamModel.getRegion_name() : existing.getRegion_name())
                    .team_name(teamModel.getTeam_name() != null ? teamModel.getTeam_name() : existing.getTeam_name())
                    .e_team_name(teamModel.getE_team_name() != null ? teamModel.getE_team_name() : existing.getE_team_name())
                    .orig_yyyy(teamModel.getOrig_yyyy() != null ? teamModel.getOrig_yyyy() : existing.getOrig_yyyy())
                    .zip_code1(teamModel.getZip_code1() != null ? teamModel.getZip_code1() : existing.getZip_code1())
                    .zip_code2(teamModel.getZip_code2() != null ? teamModel.getZip_code2() : existing.getZip_code2())
                    .address(teamModel.getAddress() != null ? teamModel.getAddress() : existing.getAddress())
                    .ddd(teamModel.getDdd() != null ? teamModel.getDdd() : existing.getDdd())
                    .tel(teamModel.getTel() != null ? teamModel.getTel() : existing.getTel())
                    .fax(teamModel.getFax() != null ? teamModel.getFax() : existing.getFax())
                    .homepage(teamModel.getHomepage() != null ? teamModel.getHomepage() : existing.getHomepage())
                    .owner(teamModel.getOwner() != null ? teamModel.getOwner() : existing.getOwner())
                    .stadium_uk(teamModel.getStadium_uk() != null ? teamModel.getStadium_uk() : existing.getStadium_uk())
                    .stadium(stadium)
                    .players(existing.getPlayers())
                    .build();
            
            Team saved = teamRepository.save(updated);
            TeamModel model = entityToModel(saved);
            return Messenger.builder()
                    .Code(200)
                    .message("수정 성공: " + teamModel.getId())
                    .data(model)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("수정할 팀을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(TeamModel teamModel) {
        Optional<Team> optionalEntity = teamRepository.findById(teamModel.getId());
        if (optionalEntity.isPresent()) {
            teamRepository.deleteById(teamModel.getId());
            return Messenger.builder()
                    .Code(200)
                    .message("삭제 성공: " + teamModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("삭제할 팀을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findByWord(TeamModel teamModel) {
        String keyword = teamModel.getTeam_name();
        if (keyword == null || keyword.trim().isEmpty()) {
            return Messenger.builder()
                    .Code(400)
                    .message("검색어를 입력해주세요.")
                    .data(null)
                    .build();
        }
        
        List<Team> teams = teamRepository.findAll().stream()
                .filter(t -> t.getTeam_name() != null && 
                            (t.getTeam_name().contains(keyword) || 
                             (t.getE_team_name() != null && t.getE_team_name().contains(keyword)) ||
                             (t.getRegion_name() != null && t.getRegion_name().contains(keyword))))
                .collect(Collectors.toList());
        
        List<TeamModel> modelList = teams.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        
        return Messenger.builder()
                .Code(200)
                .message("검색 완료: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

}

