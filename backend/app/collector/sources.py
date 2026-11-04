from pathlib import Path
from typing import Literal

import yaml
from pydantic import BaseModel

SOURCES_FILE = Path(__file__).with_name("sources.yaml")


class ListSelectors(BaseModel):
    item: str
    link: str = "a"
    title: str | None = None  # defaults to the link text
    date: str | None = None


class DetailSelectors(BaseModel):
    content: str
    title: str | None = None
    date: str | None = None
    # Elements removed from the content before reading its text (share buttons, related posts...)
    drop: list[str] = []


class SourceConfig(BaseModel):
    id: str
    name: str
    url: str
    kind: Literal["html", "rss"] = "html"
    enabled: bool = True
    listing: ListSelectors | None = None
    detail: DetailSelectors | None = None
    # Only keep list items whose URL contains one of these (skips menu links etc.)
    link_must_contain: list[str] = []
    # Regex with named groups y, m, d to read the publish date from the post URL
    date_from_url: str | None = None
    title_strip_suffix: str | None = None
    # Rewrite http:// links to https:// (some sites link to http and then redirect)
    force_https: bool = False
    max_new_per_run: int = 15


def load_sources(path: Path = SOURCES_FILE) -> list[SourceConfig]:
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return [SourceConfig.model_validate(s) for s in data.get("sources", [])]
