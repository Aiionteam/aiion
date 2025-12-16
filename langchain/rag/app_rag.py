"""RAG (Retrieval-Augmented Generation) with LangChain, pgvector, and OpenAI. --> app_rag"""

import os
from typing import List

from dotenv import load_dotenv
from langchain_core.documents import Document
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable, RunnablePassthrough
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_postgres import PGVector

# Load environment variables
load_dotenv()


def main() -> None:
    """Main function demonstrating RAG with LangChain, pgvector, and OpenAI."""
    print("=" * 60)
    print("RAG Demo: LangChain + pgvector + OpenAI")
    print("=" * 60)

    # Database connection parameters
    postgres_user = os.getenv("PGVECTOR_USER", "langchain")
    postgres_password = os.getenv("PGVECTOR_PASSWORD", "langchain")
    postgres_host = os.getenv("PGVECTOR_HOST", "localhost")
    postgres_port = int(os.getenv("PGVECTOR_PORT", "5432"))
    postgres_db = os.getenv("PGVECTOR_DATABASE", "langchain")

    # Connection string using psycopg driver
    connection_string = (
        f"postgresql+psycopg://{postgres_user}:{postgres_password}"
        f"@{postgres_host}:{postgres_port}/{postgres_db}"
    )

    # Use OpenAI embeddings
    print("\nInitializing OpenAI embeddings...")
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

    # Collection name
    collection_name = "rag_collection"

    print("\nConnecting to PostgreSQL with pgvector...")
    print(f"Connection string: {connection_string.split('@')[0]}@...")

    try:
        # Initialize vector store
        print(f"Creating vector store (collection: {collection_name})...")
        store = PGVector(
            connection=connection_string,
            embeddings=embeddings,
            collection_name=collection_name,
        )
        print("✓ Successfully connected to pgvector!")

        # Add documents (한국어)
        documents: List[Document] = [
            Document(
                page_content="LangChain은 LLM 애플리케이션을 구축하기 위한 강력한 프레임워크입니다.",
                metadata={"source": "demo"},
            ),
            Document(
                page_content="RAG는 Retrieval-Augmented Generation의 약자로, 검색과 생성을 결합한 기술입니다.",
                metadata={"source": "demo"},
            ),
            Document(
                page_content="pgvector는 PostgreSQL에서 벡터 유사도 검색을 가능하게 하는 확장입니다.",
                metadata={"source": "demo"},
            ),
            Document(
                page_content="OpenAI는 GPT 모델을 제공하는 인공지능 연구 기업입니다.",
                metadata={"source": "demo"},
            ),
            Document(
                page_content="벡터 데이터베이스는 임베딩을 저장하고 유사도 검색을 수행합니다.",
                metadata={"source": "demo"},
            ),
        ]

        print(f"\nAdding {len(documents)} documents to vector store...")
        store.add_documents(documents)
        print("✓ Documents added successfully!")

        # Initialize OpenAI LLM
        print("\nInitializing OpenAI LLM (gpt-3.5-turbo)...")
        llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.7,
        )
        print("✓ OpenAI LLM initialized!")

        # Create RAG prompt template (한국어)
        template = """다음 컨텍스트를 바탕으로 질문에 답변해주세요.

컨텍스트:
{context}

질문: {question}

답변:"""

        prompt = ChatPromptTemplate.from_template(template)

        # Create RAG chain
        def format_docs(docs: List[Document]) -> str:
            return "\n\n".join(doc.page_content for doc in docs)

        retriever = store.as_retriever(search_kwargs={"k": 2})

        rag_chain: Runnable = (
            {"context": retriever | format_docs, "question": RunnablePassthrough()}
            | prompt
            | llm
            | StrOutputParser()
        )

        # Test RAG with queries (한국어)
        queries = [
            "LangChain이 뭐야?",
            "RAG가 무엇인가요?",
            "pgvector의 역할은?",
        ]

        print("\n" + "=" * 60)
        print("RAG Query Results")
        print("=" * 60)

        for query in queries:
            print(f"\n📝 Question: {query}")
            print("-" * 60)

            # Get retrieved documents
            retrieved_docs = store.similarity_search(query, k=2)
            print("📚 Retrieved Documents:")
            for i, doc in enumerate(retrieved_docs, 1):
                print(f"  {i}. {doc.page_content[:80]}...")

            # Get RAG answer
            print("\n🤖 RAG Answer:")
            answer = rag_chain.invoke(query)
            print(f"  {answer}")
            print()

        print("=" * 60)
        print("✓ RAG Demo completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback

        traceback.print_exc()
        raise


if __name__ == "__main__":
    main()
