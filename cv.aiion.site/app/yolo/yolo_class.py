from ultralytics import YOLO
from pathlib import Path

def classify_image(image_path: str, model_path: str = None, save_dir: str = None):
    """
    YOLO를 사용하여 이미지를 분류합니다.
    전체 이미지가 어떤 클래스(카테고리)에 속하는지 판단합니다.
    
    Args:
        image_path: 분류할 이미지 파일 경로
        model_path: YOLO 분류 모델 파일 경로 (None이면 기본 경로 사용)
        save_dir: 결과 저장 디렉토리 (None이면 기본 경로 사용)
    
    Returns:
        분류 결과 딕셔너리 (클래스명, 신뢰도)
    """
    # 현재 파일의 디렉토리를 기준으로 경로 설정
    current_dir = Path(__file__).parent.absolute()
    data_dir = current_dir / 'data'
    
    # 모델 경로 설정 (분류 모델)
    if model_path is None:
        # YOLO 분류 모델 (yolo11n-cls.pt)
        model_path = str(data_dir / 'yolo11n-cls.pt')
    
    # 저장 디렉토리 설정
    if save_dir is None:
        save_dir = current_dir / 'save' / 'class'
    else:
        save_dir = Path(save_dir)
        # 이미 class 폴더가 아닌 경우에만 추가
        if save_dir.name != 'class':
            save_dir = save_dir / 'class'
    
    save_dir.mkdir(parents=True, exist_ok=True)
    
    # YOLO 모델 로드
    print(f"YOLO 분류 모델 로딩 중: {model_path}")
    model = YOLO(model_path)
    
    # 이미지 파일 경로 확인
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")
    
    print(f"이미지 분류 시작: {image_path}")
    
    # 이미지 분류
    results = model(str(image_path))
    
    # 결과 추출
    classification_results = []
    
    for result in results:
        # 상위 5개 클래스 가져오기
        probs = result.probs  # 확률 객체
        top5_indices = probs.top5  # 상위 5개 인덱스
        top5_conf = probs.top5conf.cpu().numpy()  # 상위 5개 신뢰도
        
        print(f"\n[분류 결과]")
        print(f"이미지: {image_path.name}")
        print("-" * 60)
        
        for i, (idx, conf) in enumerate(zip(top5_indices, top5_conf)):
            class_name = model.names[int(idx)]
            confidence = float(conf)
            
            classification_results.append({
                'rank': i + 1,
                'class': class_name,
                'confidence': confidence
            })
            
            print(f"  {i+1}. {class_name}: {confidence:.2%}")
        
        # 결과를 텍스트 파일로 저장
        image_name = image_path.stem
        result_file = save_dir / f"{image_name}-classification.txt"
        
        with open(result_file, 'w', encoding='utf-8') as f:
            f.write(f"이미지: {image_path.name}\n")
            f.write("=" * 60 + "\n\n")
            f.write("분류 결과 (상위 5개):\n")
            f.write("-" * 60 + "\n")
            for res in classification_results:
                f.write(f"{res['rank']}. {res['class']}: {res['confidence']:.2%}\n")
        
        print(f"\n결과 저장 완료: {result_file}")
    
    return classification_results


def classify_images_in_directory(data_dir: str = None, save_dir: str = None):
    """
    data 디렉토리 내의 모든 이미지를 분류합니다.
    
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
                   and not f.name.endswith('.pt')]  # 모델 파일 제외
    
    if len(image_files) == 0:
        print(f"디렉토리에 이미지 파일이 없습니다: {data_dir}")
        return
    
    print(f"총 {len(image_files)}개의 이미지 파일을 찾았습니다.")
    print("=" * 60)
    
    # 각 이미지 분류
    for image_file in image_files:
        try:
            classify_image(str(image_file), save_dir=save_dir)
            print()
        except Exception as e:
            print(f"  ✗ 오류 발생: {str(e)}\n")
    
    print("=" * 60)
    print("모든 이미지 분류 완료!")


if __name__ == "__main__":
    # 현재 파일의 디렉토리를 기준으로 경로 설정
    current_dir = Path(__file__).parent.absolute()
    data_dir = current_dir / 'data'
    
    # data 디렉토리 내의 모든 이미지 분류
    classify_images_in_directory(data_dir=str(data_dir))
    
    # 또는 특정 이미지만 분류:
    # image_path = data_dir / 'bus.jpg'
    # if image_path.exists():
    #     results = classify_image(str(image_path))

