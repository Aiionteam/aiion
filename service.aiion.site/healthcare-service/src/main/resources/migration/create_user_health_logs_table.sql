-- 건강 기록 테이블 생성
-- 실행 날짜: 2025-12-04

CREATE TABLE IF NOT EXISTS user_health_logs (
    log_id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    date DATE NOT NULL,
    health_type VARCHAR(50),
    value VARCHAR(100),
    recommendation TEXT,
    notes TEXT
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_health_logs_user_id ON user_health_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_health_logs_date ON user_health_logs(date);
CREATE INDEX IF NOT EXISTS idx_user_health_logs_user_id_date ON user_health_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_health_logs_health_type ON user_health_logs(health_type);

-- 코멘트 추가
COMMENT ON TABLE user_health_logs IS '건강 기록 테이블';
COMMENT ON COLUMN user_health_logs.log_id IS '건강 기록 고유 ID';
COMMENT ON COLUMN user_health_logs.user_id IS '사용자 ID (users 테이블의 id와 매핑)';
COMMENT ON COLUMN user_health_logs.date IS '기록 날짜';
COMMENT ON COLUMN user_health_logs.health_type IS '건강 항목 (예: 수면, 식사, 스트레스)';
COMMENT ON COLUMN user_health_logs.value IS '수치 또는 상태 (예: 2시간 감소, 800kcal 초과)';
COMMENT ON COLUMN user_health_logs.recommendation IS 'AI가 생성한 조언 또는 경고';
COMMENT ON COLUMN user_health_logs.notes IS '일기에서 추출된 맥락';

