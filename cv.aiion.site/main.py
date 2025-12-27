from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pathlib import Path
import shutil
import uuid
from typing import List
import os

app = FastAPI(title="YOLO Face Detection API")

# CORS 설정 - Next.js에서 접근 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5000",  # Next.js 개발 서버
        "http://localhost:3000",  # 다른 Next.js 포트
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 업로드 파일 저장 디렉토리
BASE_DIR = Path(__file__).parent.absolute()
UPLOAD_DIR = BASE_DIR / "app" / "yolo" / "data"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 분석 결과 저장 디렉토리
SAVE_DIR = BASE_DIR / "app" / "yolo" / "save"
SAVE_DIR.mkdir(parents=True, exist_ok=True)

# 허용할 이미지 확장자
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


@app.get("/")
async def root():
    """API 상태 확인"""
    return {"message": "YOLO Face Detection API", "status": "running"}


@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """
    파일 업로드 API
    - 여러 파일 동시 업로드 가능
    - data/ 디렉토리에 저장
    - 파일명 충돌 방지 (UUID 추가)
    """
    if not files:
        raise HTTPException(status_code=400, detail="파일이 없습니다.")
    
    uploaded_files = []
    
    for file in files:
        # 파일 확장자 확인
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"지원하지 않는 파일 형식입니다: {file.filename}"
            )
        
        # 파일 크기 확인
        file.file.seek(0, 2)  # 파일 끝으로 이동
        file_size = file.file.tell()  # 현재 위치(=파일 크기)
        file.file.seek(0)  # 다시 처음으로
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"파일이 너무 큽니다: {file.filename} ({file_size / 1024 / 1024:.2f}MB)"
            )
        
        # 파일명 생성 (충돌 방지)
        original_name = Path(file.filename).stem
        unique_id = str(uuid.uuid4())[:8]
        new_filename = f"{original_name}_{unique_id}{file_ext}"
        file_path = UPLOAD_DIR / new_filename
        
        # 파일 저장
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            uploaded_files.append({
                "original_name": file.filename,
                "saved_name": new_filename,
                "size": file_size,
                "path": str(file_path.relative_to(BASE_DIR))
            })
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"파일 저장 실패: {str(e)}"
            )
    
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": f"{len(uploaded_files)}개의 파일이 저장되었습니다.",
            "files": uploaded_files,
            "upload_dir": str(UPLOAD_DIR)
        }
    )


@app.get("/api/files")
async def list_files():
    """
    업로드된 파일 목록 조회
    """
    if not UPLOAD_DIR.exists():
        return {"files": [], "count": 0}
    
    files = []
    for file_path in UPLOAD_DIR.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in ALLOWED_EXTENSIONS:
            stat = file_path.stat()
            files.append({
                "name": file_path.name,
                "size": stat.st_size,
                "created_at": stat.st_ctime,
                "is_detected": "-detected" in file_path.stem
            })
    
    # 생성 시간 기준 내림차순 정렬
    files.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {
        "files": files,
        "count": len(files),
        "upload_dir": str(UPLOAD_DIR)
    }


@app.get("/api/files/{filename}")
async def get_file(filename: str):
    """
    파일 다운로드/조회
    """
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@app.delete("/api/files/{filename}")
async def delete_file(filename: str):
    """
    파일 삭제
    """
    file_path = UPLOAD_DIR / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    try:
        file_path.unlink()
        return {
            "success": True,
            "message": f"'{filename}' 파일이 삭제되었습니다."
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"파일 삭제 실패: {str(e)}"
        )


@app.get("/api/results/{category}")
async def get_results(category: str):
    """
    카테고리별 분석 결과 파일 목록 조회
    
    category: detected, class, pose, segment
    """
    valid_categories = ["detected", "class", "pose", "segment"]
    if category not in valid_categories:
        raise HTTPException(
            status_code=400,
            detail=f"유효하지 않은 카테고리입니다. 가능한 값: {', '.join(valid_categories)}"
        )
    
    category_dir = SAVE_DIR / category
    if not category_dir.exists():
        return {"files": [], "count": 0, "category": category}
    
    files = []
    for file_path in category_dir.iterdir():
        if file_path.is_file():
            stat = file_path.stat()
            files.append({
                "name": file_path.name,
                "size": stat.st_size,
                "created_at": stat.st_ctime,
                "path": f"/api/results/{category}/{file_path.name}"
            })
    
    # 생성 시간 기준 내림차순 정렬
    files.sort(key=lambda x: x["created_at"], reverse=True)
    
    return {
        "files": files,
        "count": len(files),
        "category": category
    }


@app.get("/api/results/{category}/{filename}")
async def get_result_file(category: str, filename: str):
    """
    카테고리별 분석 결과 파일 다운로드/조회
    """
    valid_categories = ["detected", "class", "pose", "segment"]
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail="유효하지 않은 카테고리입니다.")
    
    file_path = SAVE_DIR / category / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="파일을 찾을 수 없습니다.")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    )


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "upload_dir": str(UPLOAD_DIR),
        "upload_dir_exists": UPLOAD_DIR.exists(),
        "save_dir": str(SAVE_DIR),
        "save_dir_exists": SAVE_DIR.exists()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

