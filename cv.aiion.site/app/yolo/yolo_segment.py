from ultralytics import YOLO
import cv2
import numpy as np
from pathlib import Path

def segment_image(image_path: str, model_path: str = None, save_dir: str = None):
    """
    YOLO를 사용하여 이미지를 픽셀 단위로 세그멘테이션합니다.
    객체의 정확한 경계를 추출하여 마스크를 생성합니다.
    
    Args:
        image_path: 세그멘테이션할 이미지 파일 경로
        model_path: YOLO 세그멘테이션 모델 파일 경로 (None이면 기본 경로 사용)
        save_dir: 결과 저장 디렉토리 (None이면 기본 경로 사용)
    
    Returns:
        세그멘테이션 결과 리스트
    """
    # 현재 파일의 디렉토리를 기준으로 경로 설정
    current_dir = Path(__file__).parent.absolute()
    data_dir = current_dir / 'data'
    
    # 모델 경로 설정 (세그멘테이션 모델)
    if model_path is None:
        # YOLO 세그멘테이션 모델 (yolo11n-seg.pt)
        model_path = str(data_dir / 'yolo11n-seg.pt')
    
    # 저장 디렉토리 설정
    if save_dir is None:
        save_dir = current_dir / 'save' / 'segment'
    else:
        save_dir = Path(save_dir)
        # 이미 segment 폴더가 아닌 경우에만 추가
        if save_dir.name != 'segment':
            save_dir = save_dir / 'segment'
    
    save_dir.mkdir(parents=True, exist_ok=True)
    
    # YOLO 모델 로드
    print(f"YOLO 세그멘테이션 모델 로딩 중: {model_path}")
    model = YOLO(model_path)
    
    # 이미지 파일 경로 확인
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")
    
    print(f"이미지 세그멘테이션 시작: {image_path}")
    
    # 원본 이미지 로드
    original_image = cv2.imread(str(image_path))
    if original_image is None:
        raise ValueError(f"이미지를 읽을 수 없습니다: {image_path}")
    
    # 세그멘테이션 수행
    results = model(str(image_path))
    
    segmentation_results = []
    
    for result in results:
        if result.masks is None:
            print("세그멘테이션 마스크를 찾을 수 없습니다.")
            continue
        
        masks = result.masks.data.cpu().numpy()  # 마스크 데이터
        boxes = result.boxes
        
        print(f"\n검출된 객체 수: {len(masks)}")
        
        # 결과 이미지 생성
        annotated_image = original_image.copy()
        
        # 배경을 grayscale로 변환
        gray_background = cv2.cvtColor(original_image, cv2.COLOR_BGR2GRAY)
        gray_background = cv2.cvtColor(gray_background, cv2.COLOR_GRAY2BGR)
        
        # 마스크 오버레이 초기화 (grayscale 배경으로 시작)
        mask_overlay = gray_background.copy()
        
        # 모든 마스크를 합칠 마스크 생성
        combined_mask = np.zeros((original_image.shape[0], original_image.shape[1]), dtype=np.uint8)
        
        # 각 마스크 처리
        for i, (mask, box) in enumerate(zip(masks, boxes)):
            # 클래스 정보
            class_id = int(box.cls.cpu().numpy()[0])
            class_name = model.names[class_id]
            confidence = float(box.conf.cpu().numpy()[0])
            
            # 마스크 크기를 원본 이미지 크기에 맞춤
            mask_resized = cv2.resize(mask, (original_image.shape[1], original_image.shape[0]))
            mask_binary = (mask_resized > 0.5).astype(np.uint8)
            
            # 랜덤 색상 생성 (바운딩 박스용)
            color = np.random.randint(100, 255, (3,), dtype=np.uint8)
            
            # 마스크 영역에 원본 컬러 적용 (배경은 grayscale 유지)
            # 마스크가 1인 곳은 원본 컬러, 0인 곳은 grayscale 유지
            for c in range(3):
                mask_overlay[:, :, c] = np.where(
                    mask_binary == 1,
                    original_image[:, :, c],  # 마스크 영역은 원본 컬러
                    mask_overlay[:, :, c]     # 배경은 grayscale 유지
                )
            
            # combined_mask에 추가
            combined_mask = np.maximum(combined_mask, mask_binary * 255)
            
            # 바운딩 박스 그리기
            x1, y1, x2, y2 = map(int, box.xyxy[0].cpu().numpy())
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), color.tolist(), 2)
            
            # 라벨 표시
            label = f"{class_name} {confidence:.2f}"
            cv2.putText(annotated_image, label, (x1, y1 - 10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, color.tolist(), 2)
            
            # 결과 저장
            segmentation_results.append({
                'class': class_name,
                'confidence': confidence,
                'bbox': [x1, y1, x2, y2],
                'mask_area': int(np.sum(mask_binary))
            })
            
            print(f"  {i+1}. {class_name} (신뢰도: {confidence:.2%}, 마스크 영역: {np.sum(mask_binary)} 픽셀)")
        
        # 결과 저장
        image_name = image_path.stem
        image_ext = image_path.suffix
        
        # 마스크만 저장 (grayscale 배경 + 컬러 객체)
        mask_save_path = save_dir / f"{image_name}-segmentation-mask{image_ext}"
        cv2.imwrite(str(mask_save_path), mask_overlay)
        print(f"\n마스크 저장: {mask_save_path}")
    
    return segmentation_results


def segment_images_in_directory(data_dir: str = None, save_dir: str = None):
    """
    data 디렉토리 내의 모든 이미지를 세그멘테이션합니다.
    
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
    
    # 각 이미지 세그멘테이션
    for image_file in image_files:
        try:
            segment_image(str(image_file), save_dir=save_dir)
            print()
        except Exception as e:
            print(f"  ✗ 오류 발생: {str(e)}\n")
    
    print("=" * 60)
    print("모든 이미지 세그멘테이션 완료!")


if __name__ == "__main__":
    # 현재 파일의 디렉토리를 기준으로 경로 설정
    current_dir = Path(__file__).parent.absolute()
    data_dir = current_dir / 'data'
    
    # data 디렉토리 내의 모든 이미지 세그멘테이션
    segment_images_in_directory(data_dir=str(data_dir))
    
    # 또는 특정 이미지만 처리:
    # image_path = data_dir / 'bus.jpg'
    # if image_path.exists():
    #     results = segment_image(str(image_path))

