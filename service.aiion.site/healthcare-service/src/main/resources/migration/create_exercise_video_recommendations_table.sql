-- 운동 영상 추천 테이블 생성
-- 실행 날짜: 2025-12-04

CREATE TABLE IF NOT EXISTS exercise_video_recommendations (
    rec_id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    exercise_type VARCHAR(50),
    youtube_query VARCHAR(100),
    video_id VARCHAR(50),
    recommended_at TIMESTAMP NOT NULL
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_exercise_video_recommendations_user_id ON exercise_video_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_video_recommendations_recommended_at ON exercise_video_recommendations(recommended_at);
CREATE INDEX IF NOT EXISTS idx_exercise_video_recommendations_user_id_recommended_at ON exercise_video_recommendations(user_id, recommended_at);
CREATE INDEX IF NOT EXISTS idx_exercise_video_recommendations_exercise_type ON exercise_video_recommendations(exercise_type);
CREATE INDEX IF NOT EXISTS idx_exercise_video_recommendations_video_id ON exercise_video_recommendations(video_id);

-- 코멘트 추가
COMMENT ON TABLE exercise_video_recommendations IS '운동 영상 추천 테이블';
COMMENT ON COLUMN exercise_video_recommendations.rec_id IS '추천 ID';
COMMENT ON COLUMN exercise_video_recommendations.user_id IS '사용자 ID (users 테이블의 id와 매핑)';
COMMENT ON COLUMN exercise_video_recommendations.exercise_type IS '운동 종류';
COMMENT ON COLUMN exercise_video_recommendations.youtube_query IS '검색 쿼리';
COMMENT ON COLUMN exercise_video_recommendations.video_id IS '유튜브 영상 ID';
COMMENT ON COLUMN exercise_video_recommendations.recommended_at IS '추천 시각';

