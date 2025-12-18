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
        # Add connection pool parameters to prevent connection closed errors
        # pool_size: number of connections in pool
        # max_overflow: additional connections beyond pool_size
        # pool_timeout: seconds to wait for connection from pool
        # pool_recycle: seconds before recycling connection (prevent stale connections)
        connection_string = (
            f"postgresql+asyncpg://{postgres_user}:{postgres_password}"
            f"@{postgres_host}:{postgres_port}/{postgres_db}"
            f"?pool_size=5&max_overflow=10&pool_timeout=30&pool_recycle=3600"
        )
        print(f"Using cloud PostgreSQL with asyncpg: {postgres_host}")
        print("Connection pool: size=5, max_overflow=10, timeout=30s, recycle=3600s")
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
            f"?pool_size=5&max_overflow=10&pool_timeout=30&pool_recycle=3600"
        )
        print(f"Using local PostgreSQL with asyncpg: {postgres_host}:{postgres_port}")
        print("Connection pool: size=5, max_overflow=10, timeout=30s, recycle=3600s")

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
    print("Configuring connection pool settings for stability...")

    # Connection pool settings to prevent connection closed errors
    # These settings help maintain connections longer and handle reconnections
    store = PGVector(
        embeddings=embeddings,
        connection=connection_string,
        collection_name=collection_name,
        async_mode=True,  # Enable async mode for asyncpg
        create_extension=False,  # Neon cloud already has pgvector extension installed
        # Connection pool settings (if supported by langchain-postgres)
        # Note: These may need to be set via connection string or environment variables
    )

    print("✅ PGVector initialized with async mode and connection pool")
    return store
