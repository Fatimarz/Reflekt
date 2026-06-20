from datetime import timedelta, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette import status

from database import SessionLocal
from models import Users

from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from jose import jwt, JWTError


router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

# Security config
secret = "k8d93!xQ@pL0mZ9#vR2tY7uI1oP5sA8d"
algorithm = "HS256"

bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth_bearer = OAuth2PasswordBearer(tokenUrl="auth/token")


# ---------------- DB ----------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]


# ---------------- Schemas ----------------
class CreateUserRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


# ---------------- Auth Helpers ----------------
def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    payload = {
        "sub": username,
        "id": user_id,
        "exp": datetime.now(timezone.utc) + expires_delta
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def authenticate_user(username: str, password: str, db):
    user = db.query(Users).filter(Users.username == username).first()
    if not user:
        return False
    if not bcrypt_context.verify(password, user.hashed_password):
        return False
    return user


# ---------------- Routes ----------------

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def create_user(
    db: db_dependency,
    create_user_request: CreateUserRequest
):

    # prevent duplicate users
    existing = db.query(Users).filter(
        Users.username == create_user_request.username
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    password = create_user_request.password.strip()[:72]

    user_model = Users(
        username=create_user_request.username,
        hashed_password=bcrypt_context.hash(password)
    )

    db.add(user_model)
    db.commit()


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: db_dependency
):

    user = authenticate_user(form_data.username, form_data.password, db)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    token = create_access_token(
        user.username,
        user.id,
        timedelta(minutes=20)
    )

    return {"access_token": token, "token_type": "bearer"}


@router.post("/demo-login", response_model=Token)
async def demo_login(db: db_dependency):

    DEMO_USERNAME = "demo_user"

    user = db.query(Users).filter(
        Users.username == DEMO_USERNAME
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Demo account not found. Seed it first."
        )

    token = create_access_token(
        user.username,
        user.id,
        timedelta(minutes=20)
    )

    return {"access_token": token, "token_type": "bearer"}


# ---------------- Current User ----------------
async def get_current_user(
    token: Annotated[str, Depends(oauth_bearer)]
):

    try:
        payload = jwt.decode(token, secret, algorithms=[algorithm])

        username = payload.get("sub")
        user_id = payload.get("id")

        if username is None or user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

        return {"username": username, "id": user_id}

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )