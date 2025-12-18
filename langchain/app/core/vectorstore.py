"""Vector store initialization with pgvector and HuggingFace embeddings (async)."""

import os
from urllib.parse import urlparse

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_postgres import PGVector


async def init_vector_store() -> PGVector:
    """Initialize vector store with pgvector and Korean embeddings (async).

    Returns:
        PGVector instance connected to PostgreSQL (async mode).
    """
    # Check if DATABASE_URL is provided (for cloud PostgreSQL like Neon)
    database_url = os.getenv("DATABASE_URL")

    if database_url:
        # Parse the connection string and convert to asyncpg format
        # Example: postgresql://user:pass@host:port/db?sslmode=require
        parsed = urlparse(database_url)

        # Extract components
        postgres_user = parsed.username or "langchain"
        postgres_password = parsed.password or "langchain"
        postgres_host = parsed.hostname or "localhost"
        postgres_port = parsed.port or 5432
        postgres_db = parsed.path.lstrip("/") or "langchain"

        # Build connection string for asyncpg (postgresql+asyncpg://)
        # asyncpg doesn't use query params in the same way - handle SSL separately
        connection_string = (
            f"postgresql+asyncpg://{postgres_user}:{postgres_password}"
            f"@{postgres_host}:{postgres_port}/{postgres_db}"
        )
        print(f"Using cloud PostgreSQL with asyncpg: {postgres_host}")
    else:
        # Fallback to individual environment variables (for backward compatibility)
        postgres_user = os.getenv("PGVECTOR_USER", "langchain")
        postgres_password = os.getenv("PGVECTOR_PASSWORD", "langchain")
        postgres_host = os.getenv("PGVECTOR_HOST", "localhost")
        postgres_port = int(os.getenv("PGVECTOR_PORT", "5432"))
        postgres_db = os.getenv("PGVECTOR_DATABASE", "langchain")

        connection_string = (
            f"postgresql+asyncpg://{postgres_user}:{postgres_password}"
            f"@{postgres_host}:{postgres_port}/{postgres_db}"
        )
        print(f"Using local PostgreSQL with asyncpg: {postgres_host}:{postgres_port}")

    # Use HuggingFace Korean embeddings
    print("Using HuggingFace Korean embeddings (jhgan/ko-sroberta-multitask)")
    embeddings = HuggingFaceEmbeddings(
        model_name="jhgan/ko-sroberta-multitask",
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    collection_name = os.getenv("COLLECTION_NAME", "rag_collection")

    # Create PGVector with async mode enabled
    print("Creating PGVector with async mode...")
    store = PGVector(
        embeddings=embeddings,
        connection=connection_string,
        collection_name=collection_name,
        async_mode=True,  # Enable async mode for asyncpg
        create_extension=False,  # Neon cloud already has pgvector extension installed
    )

    return store
