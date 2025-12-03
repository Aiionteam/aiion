-- Healthcare 테이블 생성
-- Healthcare 엔티티를 기반으로 생성

CREATE TABLE IF NOT EXISTS healthcare_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    type VARCHAR(50),
    record_date DATE,
    sleep_hours DOUBLE PRECISION,
    nutrition TEXT,
    steps INTEGER,
    weight DOUBLE PRECISION,
    blood_pressure VARCHAR(20),
    condition VARCHAR(50),
    weekly_summary TEXT,
    recommended_routine TEXT
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_healthcare_records_user_id ON healthcare_records(user_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_records_type ON healthcare_records(type);
CREATE INDEX IF NOT EXISTS idx_healthcare_records_user_id_type ON healthcare_records(user_id, type);
CREATE INDEX IF NOT EXISTS idx_healthcare_records_record_date ON healthcare_records(record_date);

-- 코멘트 추가
COMMENT ON TABLE healthcare_records IS '건강 기록 테이블';
COMMENT ON COLUMN healthcare_records.id IS '기록 ID (자동 증가)';
COMMENT ON COLUMN healthcare_records.user_id IS '사용자 ID';
COMMENT ON COLUMN healthcare_records.type IS '기록 유형 (건강, 운동, 운동/건강 등)';
COMMENT ON COLUMN healthcare_records.record_date IS '기록 날짜';
COMMENT ON COLUMN healthcare_records.sleep_hours IS '수면 시간 (시간)';
COMMENT ON COLUMN healthcare_records.nutrition IS '식사/영양 정보';
COMMENT ON COLUMN healthcare_records.steps IS '걸음수';
COMMENT ON COLUMN healthcare_records.weight IS '체중 (kg)';
COMMENT ON COLUMN healthcare_records.blood_pressure IS '혈압 (예: "120/80")';
COMMENT ON COLUMN healthcare_records.condition IS '컨디션 (1-5 점수 또는 텍스트)';
COMMENT ON COLUMN healthcare_records.weekly_summary IS '주간 요약';
COMMENT ON COLUMN healthcare_records.recommended_routine IS '추천 루틴';

