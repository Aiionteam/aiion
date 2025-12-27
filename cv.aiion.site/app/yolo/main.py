import shutil
import time
from pathlib import Path
import sys

# 현재 디렉토리를 경로에 추가하여 yolo_detection 모듈 import
current_dir = Path(__file__).parent.absolute()
sys.path.insert(0, str(current_dir))

from yolo_detection import process_image_file
from yolo_class import classify_image
from yolo_segment import segment_image
from yolo_pose import estimate_pose

def get_portfolio_dir():
    """
    포트폴리오 저장 디렉토리 경로를 반환합니다.
    cv.aiion.site/app/yolo/data
    """
    current_dir = Path(__file__).parent.absolute()
    # cv.aiion.site/app/yolo -> cv.aiion.site/app/yolo/data
    portfolio_dir = current_dir / "data"
    portfolio_dir.mkdir(parents=True, exist_ok=True)
    return portfolio_dir

def save_file_to_portfolio(file_path: str, file_name: str = None):
    """
    파일을 포트폴리오 디렉토리에 저장합니다.
    
    Args:
        file_path: 저장할 파일의 경로
        file_name: 저장할 파일명 (None이면 원본 파일명 사용)
    
    Returns:
        저장된 파일의 전체 경로
    """
    portfolio_dir = get_portfolio_dir()
    
    if file_name is None:
        file_name = Path(file_path).name
    
    target_file = portfolio_dir / file_name
    
    # 같은 이름의 파일이 이미 존재하는지 확인
    if target_file.exists():
        base_name = Path(file_name).stem
        extension = Path(file_name).suffix
        counter = 1
        while target_file.exists():
            new_name = f"{base_name}_{counter}{extension}"
            target_file = portfolio_dir / new_name
            counter += 1
    
    # 파일 복사
    shutil.copy2(file_path, target_file)
    print(f"✓ 포트폴리오에 저장 완료: {target_file.name}")
    return str(target_file)

def move_images_from_downloads():
    """
    Downloads 폴더 경로의 이미지 파일을
    www.study.site/public/yolo로 이동합니다.
    """
    # Downloads 폴더 경로
    downloads_path = Path(r"C:\Users\jhh72\Downloads")
    
    # 현재 파일의 디렉토리를 기준으로 프로젝트 루트 찾기
    current_dir = Path(__file__).parent.absolute()
    # cv.aiion.site/app/yolo -> aiion/project로 이동
    project_root = current_dir.parent.parent.parent
    
    # 대상 디렉토리 경로 (Next.js public 디렉토리)
    target_dir = project_root / "www.study.site" / "public" / "yolo"
    
    # 대상 디렉토리 생성 (없으면 생성)
    target_dir.mkdir(parents=True, exist_ok=True)
    
    # 지원하는 이미지 파일 확장자
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.ico', '.tiff', '.tif'}
    
    # Downloads 폴더에서 이미지 파일 찾기
    moved_count = 0
    skipped_count = 0
    
    if not downloads_path.exists():
        print(f"경고: Downloads 폴더를 찾을 수 없습니다: {downloads_path}")
        return
    
    print(f"Downloads 폴더에서 이미지 파일 검색 중: {downloads_path}")
    print(f"대상 디렉토리: {target_dir}")
    print("-" * 60)
    
    for file_path in downloads_path.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in image_extensions:
            target_file = target_dir / file_path.name
            
            # 같은 이름의 파일이 이미 존재하는지 확인
            if target_file.exists():
                # 파일명에 번호 추가 (예: image.jpg -> image_1.jpg)
                base_name = file_path.stem
                extension = file_path.suffix
                counter = 1
                while target_file.exists():
                    new_name = f"{base_name}_{counter}{extension}"
                    target_file = target_dir / new_name
                    counter += 1
            
            try:
                # 파일 이동
                shutil.move(str(file_path), str(target_file))
                print(f"✓ 이동 완료: {file_path.name} -> {target_file.name}")
                moved_count += 1
            except Exception as e:
                print(f"✗ 이동 실패: {file_path.name} - {str(e)}")
                skipped_count += 1
    
    print("-" * 60)
    print(f"이동 완료: {moved_count}개 파일")
    if skipped_count > 0:
        print(f"이동 실패: {skipped_count}개 파일")
    print(f"대상 디렉토리: {target_dir}")


def watch_data_directory(interval: float = 1.0):
    """
    data 디렉토리를 감시하여 새로운 이미지 파일이 추가되면 자동으로 객체 디텍팅을 실행합니다.
    
    Args:
        interval: 디렉토리 체크 간격 (초)
    """
    data_dir = get_portfolio_dir()
    processed_files = set()
    
    # 지원하는 이미지 파일 확장자
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'}
    
    print(f"📁 데이터 디렉토리 감시 시작: {data_dir}")
    print(f"⏱️  체크 간격: {interval}초")
    print("=" * 60)
    
    try:
        while True:
            # 디렉토리 내 파일 목록 확인
            if data_dir.exists():
                for file_path in data_dir.iterdir():
                    if not file_path.is_file():
                        continue
                    
                    # 이미지 파일인지 확인
                    if file_path.suffix.lower() not in image_extensions:
                        continue
                    
                    # 모델 파일은 제외
                    if file_path.name == 'yolo11n.pt':
                        continue
                    
                    # 이미 처리된 파일인지 확인
                    file_key = (file_path.name, file_path.stat().st_mtime)
                    if file_key in processed_files:
                        continue
                    
                    # -detected 접미사가 있는 파일은 건너뛰기
                    if '-detected' in file_path.stem:
                        continue
                    
                    # 이미 결과 파일이 있는지 확인 (save/detected 디렉토리)
                    save_dir_base = data_dir.parent / 'save'
                    result_file = save_dir_base / 'detected' / f"{file_path.stem}-detected{file_path.suffix}"
                    if result_file.exists():
                        processed_files.add(file_key)
                        continue
                    
                    # 새 파일 발견 - 모든 YOLO 기능 실행
                    print(f"\n🆕 새 이미지 파일 발견: {file_path.name}")
                    processed_files.add(file_key)
                    
                    image_path_str = str(file_path)
                    
                    # 1. Detection (객체 검출)
                    try:
                        print("  🔍 [1/4] Detection 실행 중...")
                        process_image_file(image_path_str, save_to_save_dir=True, detect_all_objects=True)
                        print("  ✅ Detection 완료!")
                    except Exception as e:
                        print(f"  ❌ Detection 오류: {str(e)}")
                        import traceback
                        traceback.print_exc()
                    
                    # 2. Classification (이미지 분류)
                    try:
                        print("  📊 [2/4] Classification 실행 중...")
                        classify_image(image_path_str, save_dir=str(save_dir_base / 'class'))
                        print("  ✅ Classification 완료!")
                    except Exception as e:
                        print(f"  ❌ Classification 오류: {str(e)}")
                        import traceback
                        traceback.print_exc()
                    
                    # 3. Segmentation (세그멘테이션)
                    try:
                        print("  ✂️  [3/4] Segmentation 실행 중...")
                        segment_image(image_path_str, save_dir=str(save_dir_base / 'segment'))
                        print("  ✅ Segmentation 완료!")
                    except Exception as e:
                        print(f"  ❌ Segmentation 오류: {str(e)}")
                        import traceback
                        traceback.print_exc()
                    
                    # 4. Pose (자세 추정)
                    try:
                        print("  🧍 [4/4] Pose 추정 실행 중...")
                        estimate_pose(image_path_str, save_dir=str(save_dir_base / 'pose'))
                        print("  ✅ Pose 추정 완료!")
                    except Exception as e:
                        print(f"  ❌ Pose 추정 오류: {str(e)}")
                        import traceback
                        traceback.print_exc()
                    
                    print(f"  ✅ {file_path.name} 모든 분석 완료!")
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\n\n⏹️  파일 감시를 중지합니다.")
    except Exception as e:
        print(f"\n❌ 오류 발생: {str(e)}")


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "watch":
        # 파일 감시 모드
        watch_data_directory()
    else:
        # 기본 동작: Downloads 폴더에서 이미지 이동
        move_images_from_downloads()

