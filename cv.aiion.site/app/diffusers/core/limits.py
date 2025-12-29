import asyncio
from app.diffusers.core.config import MAX_CONCURRENCY

_semaphore = asyncio.Semaphore(MAX_CONCURRENCY)

def get_semaphore() -> asyncio.Semaphore:
    return _semaphore