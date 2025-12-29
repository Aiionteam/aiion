import json
import uuid
from datetime import datetime
from PIL import Image

from app.diffusers.core.config import IMAGES_DIR, META_DIR, PUBLIC_IMAGE_BASE, PUBLIC_META_BASE

def ensure_dirs():
    """출력 디렉토리 생성"""
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    META_DIR.mkdir(parents=True, exist_ok=True)

def save_image_and_meta(image: Image.Image, meta: dict) -> dict:
    """
    생성된 이미지와 메타데이터를 저장
    
    Args:
        image: PIL Image 객체
        meta: 메타데이터 딕셔너리
    
    Returns:
        dict: 저장된 파일 정보 (id, URLs, 메타데이터)
    """
    ensure_dirs()

    # 고유 ID 생성
    uid = uuid.uuid4().hex
    ts = datetime.utcnow().isoformat() + "Z"

    image_name = f"{uid}.png"
    meta_name = f"{uid}.json"

    image_path = IMAGES_DIR / image_name
    meta_path = META_DIR / meta_name

    # 이미지 저장 (PNG, 무손실)
    image.save(image_path, format="PNG")

    # 메타데이터 저장
    meta_out = {
        "id": uid,
        "created_at": ts,
        **meta,
        "image_file": image_name,
        "meta_file": meta_name,
    }
    meta_path.write_text(json.dumps(meta_out, ensure_ascii=False, indent=2), encoding="utf-8")

    # 응답 데이터
    return {
        "id": uid,
        "image_url": f"{PUBLIC_IMAGE_BASE}/{image_name}",
        "meta_url": f"{PUBLIC_META_BASE}/{meta_name}",
        "meta": meta_out,
    }
