import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.core.security import check_ledger_access, get_current_user
from app.db.session import get_db
from app.models.custom_parser_config_model import CustomParserConfig
from app.models.import_model import Import
from app.models.import_row_model import ImportRow
from app.models.user_model import User
from app.parsers import registry
from app.parsers.dynamic_parser import DynamicParser
from app.schemas.import_schema import FailedRowRead, ImportListResponse, ImportRead
from app.services import custom_parser_service, import_service

router = APIRouter(prefix="/imports", tags=["imports"])

_builtin_display = {s["key"]: s["display_name"] for s in registry.list_sources()}


def _to_import_read(db: Session, record: Import) -> ImportRead:
    read = ImportRead.model_validate(record)
    source = record.source_name
    if source.startswith("custom_"):
        try:
            config_id = int(source.removeprefix("custom_"))
            config = db.query(CustomParserConfig).filter_by(id=config_id).first()
            read.source_display_name = config.name if config else source
        except ValueError:
            read.source_display_name = source
    else:
        read.source_display_name = _builtin_display.get(source, source)
    return read


def _check_import_access(import_id: int, user_id: int, db: Session) -> Import:
    record = import_service.get_import(db, import_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Import {import_id} not found")
    if record.ledger_id is not None:
        check_ledger_access(record.ledger_id, user_id, db)
    return record


@router.post("", response_model=ImportRead, status_code=status.HTTP_201_CREATED)
async def upload_import(
    source_name: str = Form(...),
    file: UploadFile = File(...),
    ledger_id: int | None = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportRead:
    if ledger_id is not None:
        check_ledger_access(ledger_id, current_user.id, db)

    if source_name.startswith("custom_"):
        try:
            config_id = int(source_name.removeprefix("custom_"))
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid custom parser key: {source_name!r}")
        config = custom_parser_service.get_config(db, config_id)
        if not config:
            raise HTTPException(status_code=400, detail=f"Custom parser config {config_id} not found")
        parser = DynamicParser(config)
    else:
        try:
            parser = registry.get(source_name)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    content = await file.read()
    file_name = file.filename or "upload.csv"

    import_record = import_service.create_import(db, source_name=source_name, file_name=file_name, ledger_id=ledger_id)

    try:
        parse_results = parser.parse_csv(content)
    except Exception as e:
        import_record.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail=f"Failed to read CSV: {e}")

    import_service.store_raw_rows(db, import_record.id, parse_results)

    db.refresh(import_record)
    return _to_import_read(db, import_record)


@router.get("", response_model=ImportListResponse)
def list_imports(
    ledger_id: int | None = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportListResponse:
    if ledger_id is not None:
        check_ledger_access(ledger_id, current_user.id, db)
    imports = import_service.list_imports(db, ledger_id=ledger_id)
    return ImportListResponse(items=[_to_import_read(db, i) for i in imports], total=len(imports))


@router.get("/{import_id}", response_model=ImportRead)
def get_import(
    import_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportRead:
    record = _check_import_access(import_id, current_user.id, db)
    return _to_import_read(db, record)


@router.get("/{import_id}/failed-rows", response_model=list[FailedRowRead])
def get_failed_rows(
    import_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[FailedRowRead]:
    _check_import_access(import_id, current_user.id, db)
    rows = (
        db.query(ImportRow)
        .filter(ImportRow.import_id == import_id, ImportRow.parse_status == "failed")
        .order_by(ImportRow.row_index)
        .all()
    )
    return [
        FailedRowRead(row_index=r.row_index, raw_data=json.loads(r.raw_json), error=r.parse_error or "")
        for r in rows
    ]


@router.delete("/{import_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_import(
    import_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    _check_import_access(import_id, current_user.id, db)
    try:
        import_service.delete_import(db, import_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{import_id}/process", response_model=ImportRead)
def process_import(
    import_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ImportRead:
    _check_import_access(import_id, current_user.id, db)
    try:
        import_record = import_service.process_import(db, import_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _to_import_read(db, import_record)