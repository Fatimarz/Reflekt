from fastapi import FastAPI, status, Depends, HTTPException
import models
from database import engine, SessionLocal
from typing import Annotated
import auth
from sqlalchemy.orm import Session
from auth import get_current_user
import journal
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv() #global access


app=FastAPI()
app.include_router(auth.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
                    "https://reflekt-lac.vercel.app/"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
models.Base.metadata.create_all(bind=engine)
user_dependency=Annotated[dict, Depends(get_current_user)]

@app.get("/", status_code=status.HTTP_200_OK)
async def user(user: user_dependency):
    if user is None: 
        raise HTTPException(status_code=401, detail='Authentication Failed')
    return {'user': user}

app.include_router(journal.router )