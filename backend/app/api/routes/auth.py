import json
import urllib.error
import urllib.request

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user_model import User
from app.schemas.ledger_schema import UserRead
from app.services.ledger_service import create_default_ledger_for_user

router = APIRouter(prefix="/auth", tags=["auth"])

_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


class GoogleCredential(BaseModel):
    access_token: str


@router.post("/google", response_model=UserRead)
def google_sign_in(body: GoogleCredential, db: Session = Depends(get_db)) -> UserRead:
    req = urllib.request.Request(
        _GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {body.access_token}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            user_info = json.loads(resp.read())
    except urllib.error.HTTPError:
        raise HTTPException(status_code=401, detail="Invalid Google access token")

    google_sub = user_info.get("sub")
    if not google_sub:
        raise HTTPException(status_code=401, detail="Google token missing sub claim")

    email = user_info.get("email", "")
    name = user_info.get("name") or (email.split("@")[0] if email else "User")
    picture = user_info.get("picture")

    user = (
        db.query(User)
        .filter(User.auth_provider == "google", User.auth_provider_user_id == google_sub)
        .first()
    )

    if user is None:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.auth_provider = "google"
            user.auth_provider_user_id = google_sub
            if picture:
                user.avatar_url = picture
            db.commit()
            db.refresh(user)
        else:
            user = User(
                auth_provider="google",
                auth_provider_user_id=google_sub,
                email=email,
                display_name=name,
                avatar_url=picture,
                is_active=True,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            create_default_ledger_for_user(db, user)
    elif picture and user.avatar_url != picture:
        user.avatar_url = picture
        db.commit()
        db.refresh(user)

    return UserRead.model_validate(user)
