import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.custom_parser_config_model import CustomParserConfig
from app.models.import_model import Import
from app.parsers import registry
from app.parsers.dynamic_parser import DynamicParser
from app.schemas.import_schema import FailedRowRead, ImportListResponse, ImportRead
from app.models.import_row_model import ImportRow
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


@router.post("", response_model=ImportRead, status_code=status.HTTP_201_CREATED)
async def upload_import(
    source_name: str = Form(...),
    file: UploadFile = File(...),
    ledger_id: int | None = Form(None),
    db: Session = Depends(get_db),
) -> ImportRead:
    # Resolve the parser — built-in from registry, or custom from DB
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

    # Create the import record
    import_record = import_service.create_import(db, source_name=source_name, file_name=file_name, ledger_id=ledger_id)

    # Parse CSV to raw rows and store them
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
    db: Session = Depends(get_db),
) -> ImportListResponse:
    imports = import_service.list_imports(db, ledger_id=ledger_id)
    return ImportListResponse(items=[_to_import_read(db, i) for i in imports], total=len(imports))


@router.get("/{import_id}", response_model=ImportRead)
def get_import(import_id: int, db: Session = Depends(get_db)) -> ImportRead:
    import_record = import_service.get_import(db, import_id)
    if not import_record:
        raise HTTPException(status_code=404, detail=f"Import {import_id} not found")
    return _to_import_read(db, import_record)


@router.get("/{import_id}/failed-rows", response_model=list[FailedRowRead])
def get_failed_rows(import_id: int, db: Session = Depends(get_db)) -> list[FailedRowRead]:
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
def delete_import(import_id: int, db: Session = Depends(get_db)) -> None:
    try:
        import_service.delete_import(db, import_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{import_id}/process", response_model=ImportRead)
def process_import(import_id: int, db: Session = Depends(get_db)) -> ImportRead:
    try:
        import_record = import_service.process_import(db, import_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return _to_import_read(db, import_record)
