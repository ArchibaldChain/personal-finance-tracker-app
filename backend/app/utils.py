import logging

_LEVEL_COLORS = {
    "DEBUG":    "\033[36m",   # cyan
    "INFO":     "\033[32m",   # green
    "WARNING":  "\033[33m",   # yellow
    "ERROR":    "\033[31m",   # red
    "CRITICAL": "\033[35m",   # magenta
}
_RESET = "\033[0m"


class _ColorFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        color = _LEVEL_COLORS.get(record.levelname, "")
        level = f"{color}{record.levelname}{_RESET}"
        return f"{level}:({record.filename}):{record.getMessage()}"


def get_logger(name: str, level: int = logging.DEBUG) -> logging.Logger:
    """Return a logger with colored output.

    Usage:
        from app.utils import get_logger
        logger = get_logger(__name__)
    """
    handler = logging.StreamHandler()
    handler.setFormatter(_ColorFormatter())

    logger = logging.getLogger(name)
    logger.setLevel(level)
    logger.addHandler(handler)
    logger.propagate = False
    return logger
