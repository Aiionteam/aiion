-- Healthcare 테이블에 CSV 데이터 기반 필드 추가
-- 실행 날짜: 2025-01-XX

-- user_id 컬럼 추가 (사용자 ID)
ALTER TABLE healthcare_records 
ADD COLUMN IF NOT EXISTS user_id BIGINT;

-- type 컬럼 추가 (기록 유형: 건강, 운동, 운동/건강 등)
ALTER TABLE healthcare_records 
ADD COLUMN IF NOT EXISTS type VARCHAR(50);

-- sleep_hours 컬럼 추가 (수면 시간)
ALTER TABLE healthcare_records 
ADD COLUMN IF NOT EXISTS sleep_hours DOUBLE PRECISION;

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_healthcare_records_user_id ON healthcare_records(user_id);
CREATE INDEX IF NOT EXISTS idx_healthcare_records_type ON healthcare_records(type);
CREATE INDEX IF NOT EXISTS idx_healthcare_records_user_id_type ON healthcare_records(user_id, type);

-- 코멘트 추가
COMMENT ON COLUMN healthcare_records.user_id IS '사용자 ID';
COMMENT ON COLUMN healthcare_records.type IS '기록 유형 (건강, 운동, 운동/건강 등)';
COMMENT ON COLUMN healthcare_records.sleep_hours IS '수면 시간 (시간)';

