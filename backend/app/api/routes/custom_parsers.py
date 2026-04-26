import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.custom_parser_schema import (
    CustomParserConfigCreate,
    CustomParserConfigRead,
    CustomParserConfigUpdate,
    DetectResponse,
    PreviewRequest,
    PreviewResponse,
)
from app.services import custom_parser_service

router = APIRouter(prefix="/custom-parsers", tags=["custom-parsers"])


@router.get("", response_model=list[CustomParserConfigRead])
def list_custom_parsers(
    ledger_id: int | None = Query(None),
    db: Session = Depends(get_db),
) -> list[CustomParserConfigRead]:
    configs = custom_parser_service.list_configs(db, ledger_id=ledger_id)
    return [CustomParserConfigRead.model_validate(c) for c in configs]


@router.post("", response_model=CustomParserConfigRead, status_code=status.HTTP_201_CREATED)
def create_custom_parser(
    payload: CustomParserConfigCreate,
    db: Session = Depends(get_db),
) -> CustomParserConfigRead:
    config = custom_parser_service.create_config(db, payload)
    return CustomParserConfigRead.model_validate(config)


@router.get("/{config_id}", response_model=CustomParserConfigRead)
def get_custom_parser(config_id: int, db: Session = Depends(get_db)) -> CustomParserConfigRead:
    config = custom_parser_service.get_config(db, config_id)
    if not config:
        raise HTTPException(status_code=404, detail=f"Custom parser {config_id} not found")
    return CustomParserConfigRead.model_validate(config)


@router.put("/{config_id}", response_model=CustomParserConfigRead)
def update_custom_parser(
    config_id: int,
    payload: CustomParserConfigUpdate,
    db: Session = Depends(get_db),
) -> CustomParserConfigRead:
    config = custom_parser_service.update_config(db, config_id, payload)
    if not config:
        raise HTTPException(status_code=404, detail=f"Custom parser {config_id} not found")
    return CustomParserConfigRead.model_validate(config)


@router.delete("/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_parser(config_id: int, db: Session = Depends(get_db)) -> None:
    if not custom_parser_service.delete_config(db, config_id):
        raise HTTPException(status_code=404, detail=f"Custom parser {config_id} not found")


@router.post("/preview", response_model=PreviewResponse)
async def preview_custom_parser(
    file: UploadFile = File(...),
    config: str = Form(...),  # JSON-encoded PreviewRequest
) -> PreviewResponse:
    """Stateless preview — does not touch the DB. Returns up to 10 parsed rows."""
    try:
        request = PreviewRequest.model_validate_json(config)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid config: {e}")

    content = await file.read()
    return custom_parser_service.preview_parse(content, request)


@router.post("/detect", response_model=DetectResponse)
async def detect_parser(
    file: UploadFile = File(...),
    ledger_id: int | None = Form(None),
    skip_rows: int = Form(0),
    db: Session = Depends(get_db),
) -> DetectResponse:
    """Upload a CSV and find a saved parser whose column signature matches."""
    content = await file.read()
    headers, preview_rows = custom_parser_service._read_csv_preview(content, skip_rows=skip_rows)
    match = custom_parser_service.find_matching_config(db, headers, ledger_id=ledger_id)
    return DetectResponse(
        match=CustomParserConfigRead.model_validate(match) if match else None,
        headers=headers,
        preview_rows=preview_rows,
    )
