-- 운동 기록 테이블 생성
-- 실행 날짜: 2025-12-04

CREATE TABLE IF NOT EXISTS user_exercise_logs (
    log_id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    date DATE NOT NULL,
    exercise_type VARCHAR(50),
    duration_minutes INT,
    intensity VARCHAR(20),
    mood VARCHAR(50),
    notes TEXT
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_exercise_logs_user_id ON user_exercise_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exercise_logs_date ON user_exercise_logs(date);
CREATE INDEX IF NOT EXISTS idx_user_exercise_logs_user_id_date ON user_exercise_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_exercise_logs_exercise_type ON user_exercise_logs(exercise_type);

-- 코멘트 추가
COMMENT ON TABLE user_exercise_logs IS '운동 기록 테이블';
COMMENT ON COLUMN user_exercise_logs.log_id IS '운동 기록 고유 ID';
COMMENT ON COLUMN user_exercise_logs.user_id IS '사용자 ID (users 테이블의 id와 매핑)';
COMMENT ON COLUMN user_exercise_logs.date IS '운동 날짜';
COMMENT ON COLUMN user_exercise_logs.exercise_type IS '운동 종류 (예: 러닝, 요가)';
COMMENT ON COLUMN user_exercise_logs.duration_minutes IS '운동 시간';
COMMENT ON COLUMN user_exercise_logs.intensity IS '강도 (예: 낮음, 중간, 높음)';
COMMENT ON COLUMN user_exercise_logs.mood IS '운동 후 기분';
COMMENT ON COLUMN user_exercise_logs.notes IS '일기에서 추출된 맥락';

