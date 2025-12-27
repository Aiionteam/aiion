import cv2
import os
import tempfile
import shutil
import numpy as np

class FaceMosaic:

    def __init__(self):
        # 현재 파일의 디렉토리를 기준으로 경로 설정
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self._cascade = os.path.join(current_dir, 'data', 'haarcascade_frontalface_alt.xml')
        self._girl = os.path.join(current_dir, 'data', 'girl.jpg')
        
        # 파일 존재 여부 확인
        if not os.path.exists(self._cascade):
            raise FileNotFoundError(f"Cascade 파일을 찾을 수 없습니다: {self._cascade}")
        if not os.path.exists(self._girl):
            raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {self._girl}")
        
        # 한글 경로 문제 해결: Cascade 파일을 임시 디렉토리에 영문 이름으로 복사
        # OpenCV의 CascadeClassifier는 한글 경로를 처리하지 못함
        temp_dir = tempfile.gettempdir()
        self._temp_cascade = os.path.join(temp_dir, 'haarcascade_frontalface_alt.xml')
        try:
            shutil.copy2(self._cascade, self._temp_cascade)
        except Exception as e:
            raise RuntimeError(f"임시 파일 생성 실패: {e}")


    def apply_mosaic(self, mosaic_size=15):
        # Cascade Classifier 로드 (임시 파일 사용 - 한글 경로 문제 해결)
        cascade = cv2.CascadeClassifier(self._temp_cascade)
        if cascade.empty():
            raise ValueError(f"Cascade Classifier를 로드할 수 없습니다: {self._temp_cascade}")
        
        # 이미지 로드 (한글 경로 문제 해결을 위해 numpy 사용)
        img = cv2.imread(self._girl)
        if img is None:
            # 한글 경로 문제일 경우 대안 방법 시도
            img_array = np.fromfile(self._girl, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError(f"이미지를 로드할 수 없습니다: {self._girl}")
        
        # 얼굴 검출
        faces = cascade.detectMultiScale(img, minSize=(150, 150))
        if len(faces) == 0:
            print("no face")
            quit()
        
        # 각 얼굴에 모자이크 적용
        img = FaceMosaic.apply_mosaic_to_faces(img, faces, mosaic_size)
        
        # 저장 디렉토리 생성
        current_dir = os.path.dirname(os.path.abspath(__file__))
        save_dir = os.path.join(current_dir, 'save')
        os.makedirs(save_dir, exist_ok=True)
        
        save_path = os.path.join(save_dir, 'girl_mosaic.jpg')
        # 한글 경로 문제 해결을 위해 numpy 사용
        is_success, im_buf_arr = cv2.imencode('.jpg', img)
        if is_success:
            im_buf_arr.tofile(save_path)
            print(f"이미지 저장 완료: {save_path}")
        else:
            raise ValueError(f"이미지 저장 실패: {save_path}")
        cv2.imshow("Face Mosaic", img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
        # 임시 파일 정리
        self._cleanup()
    
    @staticmethod
    def apply_mosaic_to_faces(img, faces, mosaic_size=15):
        """
        이미지의 얼굴 영역에 모자이크를 적용하는 static method
        
        Args:
            img: 입력 이미지 (numpy array)
            faces: 얼굴 좌표 리스트 [(x, y, w, h), ...]
            mosaic_size: 모자이크 블록 크기 (작을수록 더 세밀한 모자이크)
        
        Returns:
            모자이크가 적용된 이미지
        """
        result_img = img.copy()
        for (x, y, w, h) in faces:
            # 얼굴 영역 추출
            face_roi = result_img[y:y+h, x:x+w]
            
            # 모자이크 처리: 얼굴 영역을 작게 축소한 후 다시 확대
            small = cv2.resize(face_roi, (w//mosaic_size, h//mosaic_size), interpolation=cv2.INTER_LINEAR)
            mosaic = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)
            
            # 원본 이미지에 모자이크 적용
            result_img[y:y+h, x:x+w] = mosaic
        
        return result_img
    
    def _cleanup(self):
        """임시 파일 정리"""
        if hasattr(self, '_temp_cascade') and os.path.exists(self._temp_cascade):
            try:
                os.remove(self._temp_cascade)
            except Exception as e:
                print(f"임시 파일 삭제 실패 (무시 가능): {e}")

if __name__ == "__main__":
    face_mosaic = FaceMosaic()
    try:
        face_mosaic.apply_mosaic()
    finally:
        face_mosaic._cleanup()
