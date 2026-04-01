# Import all models here so Alembic autogenerate can detect them
from app.models.category_model import Category, Subcategory  # noqa: F401
from app.models.classification_log_model import ClassificationLog  # noqa: F401
from app.models.import_model import Import  # noqa: F401
from app.models.import_row_model import ImportRow  # noqa: F401
from app.models.transaction_model import Transaction  # noqa: F401
