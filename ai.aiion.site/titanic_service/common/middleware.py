"""
공통 미들웨어
"""
import time
import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp


class LoggingMiddleware(BaseHTTPMiddleware):
    """요청/응답 로깅 미들웨어"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = logging.getLogger("Titanic Service")
    
    async def dispatch(self, request: Request, call_next):
        # 요청 시작 시간
        start_time = time.time()
        
        # 요청 정보 로깅
        self.logger.info(
            f"Request: {request.method} {request.url.path} - "
            f"Client: {request.client.host if request.client else 'Unknown'}"
        )
        
        try:
            # 다음 미들웨어/엔드포인트 실행
            response = await call_next(request)
            
            # 처리 시간 계산
            process_time = time.time() - start_time
            
            # 응답 정보 로깅
            self.logger.info(
                f"Response: {request.method} {request.url.path} - "
                f"Status: {response.status_code} - "
                f"Time: {process_time:.3f}s"
            )
            
            # 처리 시간을 헤더에 추가
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            # 오류 발생 시 로깅
            process_time = time.time() - start_time
            self.logger.error(
                f"Error: {request.method} {request.url.path} - "
                f"Exception: {str(e)} - "
                f"Time: {process_time:.3f}s"
            )
            raise

