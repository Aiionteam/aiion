import cv2
import os
import tempfile
import shutil
import numpy as np

class FaceDetect:

    def __init__(self):
        # 현재 파일의 디렉토리를 기준으로 경로 설정
        current_dir = os.path.dirname(os.path.abspath(__file__))
        self._cascade = os.path.join(current_dir, 'data', 'haarcascade_frontalface_alt.xml')
        self._image = os.path.join(current_dir, 'data', 'lena.jpg')
        
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


    def read_file(self):
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
        
        # 이미지 전처리
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        equalized = cv2.equalizeHist(gray)
        
        # 얼굴 검출 (최적화된 파라미터)
        faces = cascade.detectMultiScale(
            equalized,
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(25, 25),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        print(f"검출된 얼굴 수: {len(faces)}")
        
        if len(faces) == 0:
            print("no face")
            quit()
        
        # static method를 사용하여 원본 이미지를 보존하면서 사각형 그리기
        result_img = FaceDetect.draw_faces(img, faces)
        
        # 저장 디렉토리 생성 및 저장
        current_dir = os.path.dirname(os.path.abspath(__file__))
        save_dir = os.path.join(current_dir, 'save')
        save_path = os.path.join(save_dir, 'lena_face.jpg')
        FaceDetect.save_image(result_img, save_path)
        
        cv2.imshow("Face Detection", result_img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()
        
        # 임시 파일 정리
        self._cleanup()
    
    
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
    
    @staticmethod
    def draw_faces(img, faces, color=(0, 0, 255), thickness=2):
        """
        이미지에 얼굴 영역을 사각형으로 그리는 static method
        원본 이미지를 보존하기 위해 복사본을 사용
        
        Args:
            img: 입력 이미지 (numpy array)
            faces: 얼굴 좌표 리스트 [(x, y, w, h), ...]
            color: 사각형 색상 (B, G, R)
            thickness: 사각형 두께
        
        Returns:
            사각형이 그려진 이미지 (원본 이미지는 변경되지 않음)
        """
        result_img = img.copy()  # 원본 이미지 복사
        for (x, y, w, h) in faces:
            cv2.rectangle(result_img, (x, y), (x + w, y + h), color, thickness)
        return result_img
    
    @staticmethod
    def apply_grayscale_to_faces(img, faces):
        """
        얼굴 검출된 부분만 그레이스케일로 변환하는 static method
        
        Args:
            img: 입력 이미지 (numpy array)
            faces: 얼굴 좌표 리스트 [(x, y, w, h), ...]
        
        Returns:
            얼굴 부분만 그레이스케일로 변환된 이미지
        """
        result_img = img.copy()
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        for (x, y, w, h) in faces:
            # 얼굴 영역만 그레이스케일로 변환
            face_gray = gray[y:y+h, x:x+w]
            # 그레이스케일을 BGR로 변환 (3채널로)
            face_bgr = cv2.cvtColor(face_gray, cv2.COLOR_GRAY2BGR)
            result_img[y:y+h, x:x+w] = face_bgr
        
        return result_img
    
    def _cleanup(self):
        """임시 파일 정리"""
        if hasattr(self, '_temp_cascade') and os.path.exists(self._temp_cascade):
            try:
                os.remove(self._temp_cascade)
            except Exception as e:
                print(f"임시 파일 삭제 실패 (무시 가능): {e}")
    
    def excute(self):
        """
        오리지널, 디텍트, 디텍트된 부분만 그레이스케일 3개 이미지를 표시하는 메서드
        """
        # Cascade Classifier 로드
        cascade = cv2.CascadeClassifier(self._temp_cascade)
        if cascade.empty():
            raise ValueError(f"Cascade Classifier를 로드할 수 없습니다: {self._temp_cascade}")
        
        # 이미지 로드 (한글 경로 문제 해결을 위해 numpy 사용)
        try:
            img_array = np.fromfile(self._image, np.uint8)
            original = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
            if original is None:
                raise ValueError(f"이미지를 디코딩할 수 없습니다: {self._image}")
        except Exception as e:
            raise ValueError(f"이미지를 로드할 수 없습니다: {self._image}, 오류: {e}")
        
        # 이미지 전처리
        gray = cv2.cvtColor(original, cv2.COLOR_BGR2GRAY)
        equalized = cv2.equalizeHist(gray)
        
        # 얼굴 검출
        faces = cascade.detectMultiScale(
            equalized,
            scaleFactor=1.05,
            minNeighbors=3,
            minSize=(25, 25),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        print(f"검출된 얼굴 수: {len(faces)}")
        
        if len(faces) == 0:
            print("no face")
            quit()
        
        # 1. 오리지널 이미지
        original_img = original.copy()
        
        # 2. 디텍트된 이미지 (사각형 그려진 것)
        detected_img = FaceDetect.draw_faces(original, faces)
        
        # 3. 디텍트된 부분만 그레이스케일
        gray_faces_img = FaceDetect.apply_grayscale_to_faces(original, faces)
        
        # 저장 디렉토리 생성
        current_dir = os.path.dirname(os.path.abspath(__file__))
        save_dir = os.path.join(current_dir, 'save')
        os.makedirs(save_dir, exist_ok=True)
        
        # 3개 이미지 저장
        FaceDetect.save_image(original_img, os.path.join(save_dir, 'lena_original.jpg'))
        FaceDetect.save_image(detected_img, os.path.join(save_dir, 'lena_detected.jpg'))
        FaceDetect.save_image(gray_faces_img, os.path.join(save_dir, 'lena_gray_faces.jpg'))
        
        # 3개 이미지 표시
        cv2.imshow('Original', original_img)
        cv2.imshow('Detected', detected_img)
        cv2.imshow('Gray Faces', gray_faces_img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()  # 윈도우 종료

if __name__ == "__main__":
    face_detect = FaceDetect()
    try:
        face_detect.excute()
    finally:
        face_detect._cleanup()


