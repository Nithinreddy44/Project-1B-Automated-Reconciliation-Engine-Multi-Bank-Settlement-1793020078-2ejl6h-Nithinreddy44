from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.app.core.database import init_db
from backend.app.core.seed_data import seed_database
from backend.app.api import (
    dashboard,
    reconciliation,
    ingestion,
    transactions,
    exceptions,
    banks,
    reports,
    audit,
    performance_lab,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database & seed with realistic financial operations data
    init_db()
    seed_database()
    yield

app = FastAPI(
    title="ReconOps — Settlement Guardian API",
    description="Automated Reconciliation Engine for Multi-Bank Settlement Core REST API",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local Vite dev server and production frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all operational API modules
app.include_router(dashboard.router)
app.include_router(reconciliation.router)
app.include_router(ingestion.router)
app.include_router(transactions.router)
app.include_router(exceptions.router)
app.include_router(banks.router)
app.include_router(reports.router)
app.include_router(audit.router)
app.include_router(performance_lab.router)

@app.get("/")
def root():
    return {
        "product": "ReconOps — Settlement Guardian",
        "description": "Automated Multi-Bank Settlement Reconciliation Engine",
        "status": "OPERATIONAL",
        "api_docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health")
def healthcheck():
    return {"status": "HEALTHY", "engine": "ReconOps Core v1.0.0"}
