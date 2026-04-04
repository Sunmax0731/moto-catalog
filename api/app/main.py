from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import motorcycles

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Moto Catalog API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(motorcycles.router)


@app.get("/")
def root():
    return {"message": "Moto Catalog API"}
