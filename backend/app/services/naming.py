import random
import re
import string


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "event"


def generate_access_code(prefix: str = "EVT") -> str:
    chunk = "".join(random.choices(string.ascii_uppercase + string.digits, k=8))
    return f"{prefix}-{chunk}"

