import cv2
import os
import tempfile
import shutil
import numpy as np

class FaceMosaic:
    """
    얼굴을 검출하여 모자이크 처리를 하는 클래스
    """

    def __init__(self, image_path=None):
        # 현재 파일의 디렉토리를 기준으로 경로 설정
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self._cascade = os.path.join(current_dir, 'data', 'haarcascade_frontalface_alt.xml')
        
        # 이미지 경로 설정
        if image_path is None:
            self._image = os.path.join(current_dir, 'data', 'lena.jpg')
        else:
            self._image = image_path
        
        # 파일 존재 여부 확인
        if not os.path.exists(self._cascade):
            raise FileNotFoundError(f"Cascade 파일을 찾을 수 없습니다: {self._cascade}")
        if not os.path.exists(self._image):
            raise FileNotFoundError(f"이미지 파일을 찾을 수 없습니다: {self._image}")
        
        # 한글 경로 문제 해결: Cascade 파일을 임시 디렉토리에 영문 이름으로 복사
        # OpenCV의 CascadeClassifier는 한글 경로를 처리하지 못함
        temp_dir = tempfile.gettempdir()
        self._temp_cascade = os.path.join(temp_dir, 'haarcascade_frontalface_alt.xml')
        try:
            shutil.copy2(self._cascade, self._temp_cascade)
        except Exception as e:
            raise RuntimeError(f"임시 파일 생성 실패: {e}")

    def apply_mosaic(self, mosaic_size=15):
        """
        얼굴을 검출하여 모자이크 처리
        
        Args:
            mosaic_size: 모자이크 블록 크기 (작을수록 더 세밀한 모자이크)
        """
        # Cascade Classifier 로드 (임시 파일 사용 - 한글 경로 문제 해결)
        cascade = cv2.CascadeClassifier(self._temp_cascade)
        if cascade.empty():
            raise ValueError(f"Cascade Classifier를 로드할 수 없습니다: {self._temp_cascade}")
        
        # 이미지 로드 (한글 경로 문제 해결을 위해 numpy 사용)
        # cv2.imread는 한글 경로를 처리하지 못하므로 바로 numpy 방법 사용
        try:
            img_array = np.fromfile(self._image, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if img is None:
                raise ValueError(f"이미지를 디코딩할 수 없습니다: {self._image}")
        except Exception as e:
            raise ValueError(f"이미지를 로드할 수 없습니다: {self._image}, 오류: {e}")
        
        # 이미지 전처리 (face_detect.py와 동일)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        equalized = cv2.equalizeHist(gray)
        
        # 얼굴 검출 (face_detect.py와 동일한 파라미터)
        faces = cascade.detectMultiScale(
            equalized,
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(25, 25),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        print(f"검출된 얼굴 수: {len(faces)}")
        
        if len(faces) == 0:
            print("얼굴을 찾을 수 없습니다.")
            return img
        
        # 각 얼굴에 모자이크 적용
        return FaceMosaic.apply_mosaic_to_faces(img, faces, mosaic_size)
    
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

    def save_result(self, output_path=None):
        """
        모자이크 처리된 이미지를 저장
        
        Args:
            output_path: 저장할 파일 경로 (None이면 기본 경로 사용)
        """
        result_img = self.apply_mosaic()
        
        # 저장 경로 설정
        if output_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            save_dir = os.path.join(current_dir, 'save')
            output_path = os.path.join(save_dir, 'lena_mosaic.jpg')
        
        # static method를 사용하여 이미지 저장
        FaceMosaic.save_image(result_img, output_path)
        
        return result_img
    
    @staticmethod
    def save_image(img, save_path):
        """
        이미지를 저장하는 static method
        한글 경로 문제를 해결하기 위해 numpy를 사용
        
        Args:
            img: 저장할 이미지 (numpy array)
            save_path: 저장할 파일 경로
        """
        # 저장 디렉토리 생성
        save_dir = os.path.dirname(save_path)
        if save_dir:
            os.makedirs(save_dir, exist_ok=True)
        
        # 한글 경로 문제 해결을 위해 numpy 사용
        ext = os.path.splitext(save_path)[1] or '.jpg'
        is_success, im_buf_arr = cv2.imencode(ext, img)
        if is_success:
            im_buf_arr.tofile(save_path)
            print(f"이미지 저장 완료: {save_path}")
        else:
            raise ValueError(f"이미지 저장 실패: {save_path}")

    def show_result(self):
        """
        모자이크 처리된 이미지를 화면에 표시
        """
        result_img = self.apply_mosaic()
        cv2.imshow("Face Mosaic", result_img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
        # 임시 파일 정리
        self._cleanup()
    
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
        # 모자이크 처리 및 저장
        face_mosaic.save_result()
        # 화면에 표시
        face_mosaic.show_result()
    finally:
        face_mosaic._cleanup()

