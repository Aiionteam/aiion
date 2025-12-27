from ultralytics import YOLO
import cv2
import numpy as np
from pathlib import Path

def estimate_pose(image_path: str, model_path: str = None, save_dir: str = None):
    """
    YOLO를 사용하여 사람의 자세(포즈)를 추정합니다.
    관절 위치(키포인트)를 추출하여 스켈레톤을 표시합니다.
    
    Args:
        image_path: 포즈 추정할 이미지 파일 경로
        model_path: YOLO 포즈 모델 파일 경로 (None이면 기본 경로 사용)
        save_dir: 결과 저장 디렉토리 (None이면 기본 경로 사용)
    
    Returns:
        포즈 추정 결과 리스트
    """
    # 현재 파일의 디렉토리를 기준으로 경로 설정
    current_dir = Path(__file__).parent.absolute()
    data_dir = current_dir / 'data'
    
    # 모델 경로 설정 (포즈 모델)
    if model_path is None:
        # YOLO 포즈 모델 (yolo11n-pose.pt)
        model_path = str(data_dir / 'yolo11n-pose.pt')
    
    # 저장 디렉토리 설정
    if save_dir is None:
        save_dir = current_dir / 'save' / 'pose'
    else:
        save_dir = Path(save_dir)
        # 이미 pose 폴더가 아닌 경우에만 추가
        if save_dir.name != 'pose':
            save_dir = save_dir / 'pose'
    
    save_dir.mkdir(parents=True, exist_ok=True)
    
    # YOLO 모델 로드
    print(f"YOLO 포즈 모델 로딩 중: {model_path}")
    model = YOLO(model_path)
    
    # 이미지 파일 경로 확인
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")
    
    print(f"포즈 추정 시작: {image_path}")
    
    # 원본 이미지 로드
    original_image = cv2.imread(str(image_path))
    if original_image is None:
        raise ValueError(f"이미지를 읽을 수 없습니다: {image_path}")
    
    # 포즈 추정 수행
    results = model(str(image_path))
    
    pose_results = []
    
    # 키포인트 이름 (COCO 포맷)
    keypoint_names = [
        "nose", "left_eye", "right_eye", "left_ear", "right_ear",
        "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
        "left_wrist", "right_wrist", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle"
    ]
    
    # 스켈레톤 연결 (관절 간 연결)
    skeleton = [
        [16, 14], [14, 12], [17, 15], [15, 13], [12, 13],  # 다리
        [6, 12], [7, 13],  # 몸통-다리
        [6, 7],  # 어깨
        [6, 8], [7, 9], [8, 10], [9, 11],  # 팔
        [2, 3], [1, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7]  # 얼굴-어깨
    ]
    
    for result in results:
        if result.keypoints is None:
            print("키포인트를 찾을 수 없습니다.")
            continue
        
        keypoints = result.keypoints.xy.cpu().numpy()  # 키포인트 좌표
        confidences = result.keypoints.conf.cpu().numpy()  # 키포인트 신뢰도
        
        print(f"\n검출된 사람 수: {len(keypoints)}")
        
        # 결과 이미지 생성
        annotated_image = original_image.copy()
        
        # 각 사람의 포즈 처리
        for person_idx, (person_kpts, person_confs) in enumerate(zip(keypoints, confidences)):
            person_result = {
                'person_id': person_idx + 1,
                'keypoints': {}
            }
            
            print(f"\n사람 {person_idx + 1}:")
            
            # 키포인트 그리기
            for kpt_idx, (kpt, conf) in enumerate(zip(person_kpts, person_confs)):
                x, y = map(int, kpt)
                confidence = float(conf)
                
                if confidence > 0.5:  # 신뢰도가 높은 키포인트만 표시
                    # 키포인트 원 그리기
                    cv2.circle(annotated_image, (x, y), 5, (0, 255, 0), -1)
                    
                    # 키포인트 이름 저장
                    kpt_name = keypoint_names[kpt_idx]
                    person_result['keypoints'][kpt_name] = {
                        'x': x,
                        'y': y,
                        'confidence': confidence
                    }
                    
                    # 주요 키포인트 출력
                    if kpt_name in ['nose', 'left_shoulder', 'right_shoulder', 'left_wrist', 'right_wrist']:
                        print(f"  {kpt_name}: ({x}, {y}), 신뢰도: {confidence:.2%}")
            
            # 스켈레톤 그리기 (관절 연결)
            for connection in skeleton:
                kpt1_idx, kpt2_idx = connection[0] - 1, connection[1] - 1
                
                if kpt1_idx < len(person_kpts) and kpt2_idx < len(person_kpts):
                    kpt1, kpt2 = person_kpts[kpt1_idx], person_kpts[kpt2_idx]
                    conf1, conf2 = person_confs[kpt1_idx], person_confs[kpt2_idx]
                    
                    if conf1 > 0.5 and conf2 > 0.5:
                        x1, y1 = map(int, kpt1)
                        x2, y2 = map(int, kpt2)
                        cv2.line(annotated_image, (x1, y1), (x2, y2), (255, 0, 0), 2)
            
            pose_results.append(person_result)
        
        # 결과 저장
        image_name = image_path.stem
        image_ext = image_path.suffix
        pose_save_path = save_dir / f"{image_name}-pose{image_ext}"
        cv2.imwrite(str(pose_save_path), annotated_image)
        print(f"\n포즈 결과 저장: {pose_save_path}")
        
        # 키포인트 정보를 텍스트 파일로 저장
        result_file = save_dir / f"{image_name}-pose-keypoints.txt"
        with open(result_file, 'w', encoding='utf-8') as f:
            f.write(f"이미지: {image_path.name}\n")
            f.write("=" * 60 + "\n\n")
            
            for person in pose_results:
                f.write(f"사람 {person['person_id']}의 키포인트:\n")
                f.write("-" * 60 + "\n")
                for kpt_name, kpt_data in person['keypoints'].items():
                    f.write(f"  {kpt_name}: ({kpt_data['x']}, {kpt_data['y']}), "
                           f"신뢰도: {kpt_data['confidence']:.2%}\n")
                f.write("\n")
        
        print(f"키포인트 정보 저장: {result_file}")
    
    return pose_results


def estimate_pose_in_directory(data_dir: str = None, save_dir: str = None):
    """
    data 디렉토리 내의 모든 이미지에서 포즈를 추정합니다.
    
    Args:
        data_dir: 이미지가 있는 디렉토리 (None이면 기본 경로 사용)
        save_dir: 결과 저장 디렉토리 (None이면 기본 경로 사용)
    """
    current_dir = Path(__file__).parent.absolute()
    
    if data_dir is None:
        data_dir = current_dir / 'data'
    else:
        data_dir = Path(data_dir)
    
    # 지원하는 이미지 파일 확장자
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    
    # 이미지 파일 찾기
    image_files = [f for f in data_dir.iterdir() 
                   if f.is_file() and f.suffix.lower() in image_extensions
                   and not f.name.endswith('.pt')]
    
    if len(image_files) == 0:
        print(f"디렉토리에 이미지 파일이 없습니다: {data_dir}")
        return
    
    print(f"총 {len(image_files)}개의 이미지 파일을 찾았습니다.")
    print("=" * 60)
    
    # 각 이미지에서 포즈 추정
    for image_file in image_files:
        try:
            estimate_pose(str(image_file), save_dir=save_dir)
            print()
        except Exception as e:
            print(f"  ✗ 오류 발생: {str(e)}\n")
    
    print("=" * 60)
    print("모든 이미지 포즈 추정 완료!")


if __name__ == "__main__":
    # 현재 파일의 디렉토리를 기준으로 경로 설정
    current_dir = Path(__file__).parent.absolute()
    data_dir = current_dir / 'data'
    
    # data 디렉토리 내의 모든 이미지에서 포즈 추정
    estimate_pose_in_directory(data_dir=str(data_dir))
    
    # 또는 특정 이미지만 처리:
    # image_path = data_dir / 'bus.jpg'
    # if image_path.exists():
    #     results = estimate_pose(str(image_path))

