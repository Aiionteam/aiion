package site.aiion.api.soccer.schedule;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import site.aiion.api.soccer.common.domain.Messenger;
import site.aiion.api.soccer.stadium.StadiumRepository;
import site.aiion.api.soccer.team.TeamRepository;
import site.aiion.api.soccer.stadium.Stadium;
import site.aiion.api.soccer.team.Team;

@Service
@RequiredArgsConstructor
public class ScheduleServiceImpl implements ScheduleService {

    private final ScheduleRepository scheduleRepository;
    private final StadiumRepository stadiumRepository;
    private final TeamRepository teamRepository;

    private ScheduleModel entityToModel(Schedule entity) {
        return ScheduleModel.builder()
                .id(entity.getId())
                .sche_date(entity.getSche_date())
                .stadium_uk(entity.getStadium_uk())
                .gubun(entity.getGubun())
                .hometeam_uk(entity.getHometeam_uk())
                .awayteam_uk(entity.getAwayteam_uk())
                .home_score(entity.getHome_score())
                .away_score(entity.getAway_score())
                .build();
    }

    private Schedule modelToEntity(ScheduleModel model) {
        Stadium stadium = null;
        Team hometeam = null;
        Team awayteam = null;
        
        if (model.getStadium_uk() != null) {
            stadium = stadiumRepository.findByStadium_uk(model.getStadium_uk()).orElse(null);
        }
        if (model.getHometeam_uk() != null) {
            hometeam = teamRepository.findByTeam_uk(model.getHometeam_uk()).orElse(null);
        }
        if (model.getAwayteam_uk() != null) {
            awayteam = teamRepository.findByTeam_uk(model.getAwayteam_uk()).orElse(null);
        }
        
        return Schedule.builder()
                .id(model.getId())
                .sche_date(model.getSche_date())
                .stadium_uk(model.getStadium_uk())
                .gubun(model.getGubun())
                .hometeam_uk(model.getHometeam_uk())
                .awayteam_uk(model.getAwayteam_uk())
                .home_score(model.getHome_score())
                .away_score(model.getAway_score())
                .stadium(stadium)
                .hometeam(hometeam)
                .awayteam(awayteam)
                .build();
    }

    @Override
    public Messenger findById(ScheduleModel scheduleModel) {
        Optional<Schedule> entity = scheduleRepository.findById(scheduleModel.getId());
        if (entity.isPresent()) {
            ScheduleModel dto = entityToModel(entity.get());
            return Messenger.builder()
                    .Code(200)
                    .message("조회 성공")
                    .data(dto)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("일정을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findAll() {
        List<Schedule> entities = scheduleRepository.findAll();
        List<ScheduleModel> modelList = entities.stream()
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
    public Messenger save(ScheduleModel scheduleModel) {
        Schedule entity = modelToEntity(scheduleModel);
        Schedule saved = scheduleRepository.save(entity);
        ScheduleModel dto = entityToModel(saved);
        return Messenger.builder()
                .Code(200)
                .message("저장 성공: " + saved.getId())
                .data(dto)
                .build();
    }

    @Override
    @Transactional
    public Messenger saveAll(List<ScheduleModel> scheduleModelList) {
        List<Schedule> entities = scheduleModelList.stream()
                .map(model -> {
                    Stadium stadium = null;
                    Team hometeam = null;
                    Team awayteam = null;
                    
                    if (model.getStadium_uk() != null) {
                        stadium = stadiumRepository.findByStadium_uk(model.getStadium_uk()).orElse(null);
                    }
                    if (model.getHometeam_uk() != null) {
                        hometeam = teamRepository.findByTeam_uk(model.getHometeam_uk()).orElse(null);
                    }
                    if (model.getAwayteam_uk() != null) {
                        awayteam = teamRepository.findByTeam_uk(model.getAwayteam_uk()).orElse(null);
                    }
                    
                    return Schedule.builder()
                            .id(model.getId())
                            .sche_date(model.getSche_date())
                            .stadium_uk(model.getStadium_uk())
                            .gubun(model.getGubun())
                            .hometeam_uk(model.getHometeam_uk())
                            .awayteam_uk(model.getAwayteam_uk())
                            .home_score(model.getHome_score())
                            .away_score(model.getAway_score())
                            .stadium(stadium)
                            .hometeam(hometeam)
                            .awayteam(awayteam)
                            .build();
                })
                .collect(Collectors.toList());
        
        List<Schedule> saved = scheduleRepository.saveAll(entities);
        List<ScheduleModel> modelList = saved.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        return Messenger.builder()
                .Code(200)
                .message("일괄 저장 성공: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

    @Override
    @Transactional
    public Messenger update(ScheduleModel scheduleModel) {
        Optional<Schedule> optionalEntity = scheduleRepository.findById(scheduleModel.getId());
        if (optionalEntity.isPresent()) {
            Schedule existing = optionalEntity.get();
            
            Stadium stadium = scheduleModel.getStadium_uk() != null 
                    ? stadiumRepository.findByStadium_uk(scheduleModel.getStadium_uk()).orElse(existing.getStadium()) 
                    : existing.getStadium();
            Team hometeam = scheduleModel.getHometeam_uk() != null 
                    ? teamRepository.findByTeam_uk(scheduleModel.getHometeam_uk()).orElse(existing.getHometeam()) 
                    : existing.getHometeam();
            Team awayteam = scheduleModel.getAwayteam_uk() != null 
                    ? teamRepository.findByTeam_uk(scheduleModel.getAwayteam_uk()).orElse(existing.getAwayteam()) 
                    : existing.getAwayteam();
            
            Schedule updated = Schedule.builder()
                    .id(existing.getId())
                    .sche_date(scheduleModel.getSche_date() != null ? scheduleModel.getSche_date() : existing.getSche_date())
                    .stadium_uk(scheduleModel.getStadium_uk() != null ? scheduleModel.getStadium_uk() : existing.getStadium_uk())
                    .gubun(scheduleModel.getGubun() != null ? scheduleModel.getGubun() : existing.getGubun())
                    .hometeam_uk(scheduleModel.getHometeam_uk() != null ? scheduleModel.getHometeam_uk() : existing.getHometeam_uk())
                    .awayteam_uk(scheduleModel.getAwayteam_uk() != null ? scheduleModel.getAwayteam_uk() : existing.getAwayteam_uk())
                    .home_score(scheduleModel.getHome_score() != null ? scheduleModel.getHome_score() : existing.getHome_score())
                    .away_score(scheduleModel.getAway_score() != null ? scheduleModel.getAway_score() : existing.getAway_score())
                    .stadium(stadium)
                    .hometeam(hometeam)
                    .awayteam(awayteam)
                    .build();
            
            Schedule saved = scheduleRepository.save(updated);
            ScheduleModel dto = entityToModel(saved);
            return Messenger.builder()
                    .Code(200)
                    .message("수정 성공: " + scheduleModel.getId())
                    .data(dto)
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("수정할 일정을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    @Transactional
    public Messenger delete(ScheduleModel scheduleModel) {
        Optional<Schedule> optionalEntity = scheduleRepository.findById(scheduleModel.getId());
        if (optionalEntity.isPresent()) {
            scheduleRepository.deleteById(scheduleModel.getId());
            return Messenger.builder()
                    .Code(200)
                    .message("삭제 성공: " + scheduleModel.getId())
                    .build();
        } else {
            return Messenger.builder()
                    .Code(404)
                    .message("삭제할 일정을 찾을 수 없습니다.")
                    .build();
        }
    }

    @Override
    public Messenger findByWord(ScheduleModel scheduleModel) {
        String keyword = scheduleModel.getSche_date();
        if (keyword == null || keyword.trim().isEmpty()) {
            return Messenger.builder()
                    .Code(400)
                    .message("검색어를 입력해주세요.")
                    .data(null)
                    .build();
        }
        
        List<Schedule> schedules = scheduleRepository.findAll().stream()
                .filter(s -> (s.getSche_date() != null && s.getSche_date().contains(keyword)) ||
                            (s.getHometeam_uk() != null && s.getHometeam_uk().contains(keyword)) ||
                            (s.getAwayteam_uk() != null && s.getAwayteam_uk().contains(keyword)))
                .collect(Collectors.toList());
        
        List<ScheduleModel> modelList = schedules.stream()
                .map(this::entityToModel)
                .collect(Collectors.toList());
        
        return Messenger.builder()
                .Code(200)
                .message("검색 완료: " + modelList.size() + "개")
                .data(modelList)
                .build();
    }

}

