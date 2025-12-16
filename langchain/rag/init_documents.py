"""Initialize documents in the vector store."""

import os

import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Documents to add
documents = [
    {
        "content": "LangChain은 LLM 애플리케이션을 구축하기 위한 강력한 프레임워크입니다.",
        "metadata": {"source": "demo"},
    },
    {
        "content": "RAG는 Retrieval-Augmented Generation의 약자로, 검색과 생성을 결합한 기술입니다.",
        "metadata": {"source": "demo"},
    },
    {
        "content": "pgvector는 PostgreSQL에서 벡터 유사도 검색을 가능하게 하는 확장입니다.",
        "metadata": {"source": "demo"},
    },
    {
        "content": "OpenAI는 GPT 모델을 제공하는 인공지능 연구 기업입니다.",
        "metadata": {"source": "demo"},
    },
    {
        "content": "벡터 데이터베이스는 임베딩을 저장하고 유사도 검색을 수행합니다.",
        "metadata": {"source": "demo"},
    },
]


def init_documents():
    """Add initial documents to the vector store."""
    print("[INIT] Initializing documents...")

    try:
        response = requests.post(
            "http://localhost:8000/documents/batch",
            json={"documents": documents},
            timeout=30,
        )

        if response.status_code == 200:
            result = response.json()
            print(f"[OK] Successfully added {result['count']} documents!")
        else:
            print(f"[ERROR] Status: {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"[ERROR] Failed to add documents: {e}")
        print("\n[TIP] Make sure the API server is running:")
        print("   cd rag")
        print("   conda activate torch313")
        print("   python api_server.py")


if __name__ == "__main__":
    init_documents()
