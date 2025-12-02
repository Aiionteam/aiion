package site.aiion.api.healthcare;

import java.time.LocalDate;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@NoArgsConstructor
@AllArgsConstructor
@Builder
@Data
public class HealthcareModel {
    private Long id;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate recordDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate weatherDate;
    private String weather;
    private String weatherDescription;
    private String weatherIcon;
    private String weatherTemperature;
    private String weatherHumidity;
    private String weatherPressure;
    private String weatherWindSpeed;
    private String weatherWindDirection;
    private String weatherCloudCover;
    private String weatherPrecipitation;
    private String weatherPrecipitationProbability;

    // 식사/영양 정보
    private String nutrition;

    // 걸음수
    private Integer steps;

    // 체중 (kg)
    private Double weight;

    // 혈압 (예: "120/80")
    private String bloodPressure;

    // 컨디션 (1-5 점수 또는 텍스트)
    private String condition;

    // 주간 요약
    private String weeklySummary;

    // 추천 루틴
    private String recommendedRoutine;
}
