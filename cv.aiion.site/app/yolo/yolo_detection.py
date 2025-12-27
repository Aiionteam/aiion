from ultralytics import YOLO
import cv2
import numpy as np
from pathlib import Path

def detect_faces_in_image(image_path: str, model_path: str = None, save_dir: str = None, save_to_data: bool = False, output_filename: str = None, detect_all_objects: bool = True):
    """
    YOLO를 사용하여 이미지에서 객체를 디텍팅합니다.
    
    Args:
        image_path: 디텍팅할 이미지 파일 경로
        model_path: YOLO 모델 파일 경로 (None이면 기본 경로 사용)
        save_dir: 결과 저장 디렉토리 (None이면 기본 경로 사용)
        save_to_data: True이면 결과를 data 디렉토리에 저장하고 파일명에 -detected 접미사 추가
        output_filename: 저장할 파일명 (None이면 자동 생성)
        detect_all_objects: True이면 모든 객체 검출, False이면 사람만 검출
    
    Returns:
        디텍팅된 객체 정보 리스트
    """
    # 현재 파일의 디렉토리를 기준으로 경로 설정
    current_dir = Path(__file__).parent.absolute()
    data_dir = current_dir / 'data'
    
    # 모델 경로 설정
    if model_path is None:
        model_path = str(data_dir / 'yolo11n.pt')
    
    # 저장 디렉토리 설정
    if save_to_data:
        # data 디렉토리에 저장
        save_dir = data_dir
    elif save_dir is None:
        save_dir = current_dir / 'save' / 'detected'
    else:
        save_dir = Path(save_dir).resolve()
        # save_dir이 이미 'detected' 폴더가 아닌 경우에만 추가
        # 절대 경로로 변환하여 정확히 확인
        save_root_abs = (current_dir / 'save').resolve()
        detected_abs = (current_dir / 'save' / 'detected').resolve()
        
        # save_dir이 save 루트인 경우 detected 추가
        if save_dir == save_root_abs:
            save_dir = save_dir / 'detected'
        # save_dir이 이미 detected 폴더가 아닌 경우에만 추가
        elif save_dir != detected_abs and save_dir.name != 'detected':
            save_dir = save_dir / 'detected'
    
    # 저장 디렉토리 생성
    save_dir.mkdir(parents=True, exist_ok=True)
    
    # YOLO 모델 로드
    print(f"YOLO 모델 로딩 중: {model_path}")
    model = YOLO(model_path)
    
    # 이미지 파일 경로 확인
    image_path = Path(image_path)
    if not image_path.exists():
        raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {image_path}")
    
    print(f"이미지 디텍팅 시작: {image_path}")
    
    # 이미지에서 객체 검출
    results = model(str(image_path))
    
    # 원본 이미지 로드 (얼굴 영역 추출용)
    original_image = cv2.imread(str(image_path))
    if original_image is None:
        raise ValueError(f"이미지를 읽을 수 없습니다: {image_path}")
    
    # 객체 디텍션 결과 저장
    objects_detected = []
    
    for result in results:
        boxes = result.boxes
        
        if len(boxes) == 0:
            print("검출된 객체가 없습니다.")
            continue
        
        # 결과 이미지 생성
        annotated_image = original_image.copy()
        
        # 검출할 인덱스 결정
        if detect_all_objects:
            # 모든 객체 검출
            indices = range(len(boxes))
        else:
            # person 클래스만 필터링 (클래스 ID: 0)
            indices = np.where(boxes.cls.cpu().numpy() == 0)[0]
            if len(indices) == 0:
                print("사람이 검출되지 않았습니다.")
                continue
        
        for idx in indices:
            # 바운딩 박스 좌표 추출
            box = boxes.xyxy[idx].cpu().numpy()
            x1, y1, x2, y2 = map(int, box)
            
            # 신뢰도 추출
            confidence = float(boxes.conf[idx].cpu().numpy())
            
            # 클래스 정보 추출
            class_id = int(boxes.cls[idx].cpu().numpy())
            class_name = model.names[class_id]
            
            # 객체 정보 저장
            object_info = {
                'class': class_name,
                'class_id': class_id,
                'bbox': [x1, y1, x2, y2],
                'confidence': confidence
            }
            objects_detected.append(object_info)
            
            # 클래스별로 다른 색상 사용
            color = (
                int((class_id * 50) % 255),
                int((class_id * 100) % 255),
                int((class_id * 150) % 255)
            )
            
            # 바운딩 박스 그리기
            cv2.rectangle(annotated_image, (x1, y1), (x2, y2), color, 2)
            
            # 라벨 표시
            label = f"{class_name} {confidence:.2f}"
            
            # 라벨 배경
            label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)
            cv2.rectangle(annotated_image, (x1, y1 - 20), (x1 + label_size[0], y1), color, -1)
            
            # 라벨 텍스트
            cv2.putText(annotated_image, label, (x1, y1 - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
        
        # 결과 이미지 저장
        image_name = image_path.stem
        image_ext = image_path.suffix
        
        # 저장 파일명 결정
        if output_filename:
            save_filename = output_filename
        elif save_to_data:
            save_filename = f"{image_name}-detected{image_ext}"
        else:
            save_filename = f"{image_name}-detected{image_ext}"
        
        save_path = save_dir / save_filename
        cv2.imwrite(str(save_path), annotated_image)
        print(f"결과 저장 완료: {save_path}")
        print(f"검출된 객체 개수: {len(objects_detected)}")
        
        # 검출된 객체 정보 출력
        if objects_detected:
            print("\n검출된 객체 목록:")
            for i, obj in enumerate(objects_detected):
                print(f"  {i+1}. {obj['class']} (신뢰도: {obj['confidence']:.2%})")
        
        # 각 객체 영역을 개별 이미지로 저장 (save_to_data가 False일 때만, person 클래스만)
        if not save_to_data:
            face_count = 0
            for i, obj_info in enumerate(objects_detected):
                if obj_info['class'] == 'person':
                    face_count += 1
                    x1, y1, x2, y2 = obj_info['bbox']
                    # 얼굴 영역 (상단 40%)
                    face_height = int((y2 - y1) * 0.4)
                    face_y2 = y1 + face_height
                    face_crop = original_image[y1:face_y2, x1:x2]
                    
                    face_save_path = save_dir / f"{image_name}_face_{face_count}.jpg"
                    cv2.imwrite(str(face_save_path), face_crop)
                    print(f"  얼굴 {face_count} 저장: {face_save_path}")
    
    return objects_detected


def process_image_file(image_path: str, save_to_save_dir: bool = True, detect_all_objects: bool = True):
    """
    단일 이미지 파일을 처리하여 객체 디텍팅하고 결과를 save 디렉토리에 저장합니다.
    
    Args:
        image_path: 처리할 이미지 파일 경로
        save_to_save_dir: True이면 save/ 디렉토리에 저장, False이면 data/ 디렉토리에 저장
        detect_all_objects: True이면 모든 객체 검출, False이면 사람만 검출
    """
    try:
        image_path = Path(image_path)
        if not image_path.exists():
            print(f"파일을 찾을 수 없습니다: {image_path}")
            return
        
        # 이미 -detected 접미사가 있는 파일은 건너뛰기
        if '-detected' in image_path.stem:
            return
        
        print(f"객체 디텍팅 시작: {image_path.name}")
        
        # save/ 디렉토리에 저장할지 결정
        if save_to_save_dir:
            # __file__을 기준으로 정확한 경로 계산
            current_dir = Path(__file__).parent.absolute()
            save_dir = current_dir / 'save' / 'detected'  # 직접 detected 폴더 경로 지정
            objects = detect_faces_in_image(
                str(image_path), 
                save_dir=str(save_dir), 
                save_to_data=False,
                detect_all_objects=detect_all_objects
            )
            print(f"✓ 처리 완료: {image_path.name} → save/detected/{image_path.stem}-detected{image_path.suffix}")
        else:
            objects = detect_faces_in_image(
                str(image_path), 
                save_to_data=True,
                detect_all_objects=detect_all_objects
            )
            print(f"✓ 처리 완료: {image_path.name} → {image_path.stem}-detected{image_path.suffix}")
    except Exception as e:
        print(f"✗ 처리 실패: {image_path.name} - {str(e)}")


def detect_faces_in_directory(data_dir: str = None, save_dir: str = None, detect_all_objects: bool = True):
    """
    data 디렉토리 내의 모든 이미지에서 객체를 디텍팅합니다.
    
    Args:
        data_dir: 이미지가 있는 디렉토리 (None이면 기본 경로 사용)
        save_dir: 결과 저장 디렉토리 (None이면 기본 경로 사용)
        detect_all_objects: True이면 모든 객체 검출, False이면 사람만 검출
    """
    # 현재 파일의 디렉토리를 기준으로 경로 설정
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
                   and f.name != 'yolo11n.pt']  # 모델 파일 제외
    
    if len(image_files) == 0:
        print(f"디렉토리에 이미지 파일이 없습니다: {data_dir}")
        return
    
    print(f"총 {len(image_files)}개의 이미지 파일을 찾았습니다.")
    print("-" * 60)
    
    # 각 이미지에서 객체 디텍팅
    for image_file in image_files:
        try:
            print(f"\n처리 중: {image_file.name}")
            objects = detect_faces_in_image(
                str(image_file), 
                save_dir=save_dir,
                detect_all_objects=detect_all_objects
            )
            print(f"  → {len(objects)}개의 객체 검출됨")
        except Exception as e:
            print(f"  ✗ 오류 발생: {str(e)}")
    
    print("\n" + "-" * 60)
    print("모든 이미지 처리 완료!")


if __name__ == "__main__":
    # 현재 파일의 디렉토리를 기준으로 경로 설정
    current_dir = Path(__file__).parent.absolute()
    data_dir = current_dir / 'data'
    
    # data 디렉토리 내의 모든 이미지에서 객체 디텍팅 (모든 객체)
    print("=== 모든 객체 검출 모드 ===")
    detect_faces_in_directory(data_dir=str(data_dir), detect_all_objects=True)
    
    # 또는 사람만 검출:
    # print("=== 사람만 검출 모드 ===")
    # detect_faces_in_directory(data_dir=str(data_dir), detect_all_objects=False)
    
    # 또는 특정 이미지만 처리하려면:
    # image_path = data_dir / 'bus.jpg'
    # if image_path.exists():
    #     objects = detect_faces_in_image(str(image_path), detect_all_objects=True)
    #     print(f"\n검출된 객체 정보:")
    #     for i, obj in enumerate(objects):
    #         print(f"  {i+1}. {obj['class']}: bbox={obj['bbox']}, confidence={obj['confidence']:.2f}")

