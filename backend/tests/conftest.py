import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.db.session as db_session_module
from app.db.base import Base
from app.db.session import get_db
from app.main import app as fastapi_app

# Import all models so Base.metadata is populated
import app.models  # noqa: F401

# StaticPool ensures all sessions share the same in-memory SQLite connection
test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(autouse=True)
def setup_db():
    """Create tables, redirect app session to test DB, tear down after each test."""
    Base.metadata.create_all(bind=test_engine)

    # Patch the module-level engine and SessionLocal so lifespan uses the test DB
    original_engine = db_session_module.engine
    original_session_local = db_session_module.SessionLocal
    db_session_module.engine = test_engine
    db_session_module.SessionLocal = TestingSessionLocal

    yield

    db_session_module.engine = original_engine
    db_session_module.SessionLocal = original_session_local
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    fastapi_app.dependency_overrides[get_db] = override_get_db
    with TestClient(fastapi_app) as c:
        yield c
    fastapi_app.dependency_overrides.clear()


@pytest.fixture
def chase_csv_bytes() -> bytes:
    return (
        b"Transaction Date,Post Date,Description,Category,Type,Amount,Memo\n"
        b"01/15/2026,01/16/2026,STARBUCKS #123,Food & Drink,Sale,-5.75,\n"
        b"01/16/2026,01/17/2026,AMAZON.COM,Shopping,Sale,-29.99,\n"
        b"01/17/2026,01/18/2026,WHOLE FOODS,Groceries,Sale,-45.00,\n"
    )


@pytest.fixture
def bofa_csv_bytes() -> bytes:
    return (
        b"Bank of America Export\n"
        b"Account: Checking ****1234\n"
        b"\n"
        b"Date,Description,Amount,Running Bal.\n"
        b"01/15/2026,STARBUCKS #456,-6.25,1000.00\n"
        b"01/16/2026,WALMART,-54.32,945.68\n"
        b"01/17/2026,DIRECT DEPOSIT,3000.00,3945.68\n"
    )
