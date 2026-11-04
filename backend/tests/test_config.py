from app.config import asyncpg_url


def test_neon_style_url_is_made_asyncpg_friendly():
    url = "postgresql://u:p@ep-x.ap-southeast-1.aws.neon.tech/db?sslmode=require&channel_binding=require"
    assert (
        asyncpg_url(url)
        == "postgresql+asyncpg://u:p@ep-x.ap-southeast-1.aws.neon.tech/db?ssl=require"
    )


def test_postgres_scheme_and_plain_url():
    assert asyncpg_url("postgres://u:p@h:5432/db") == "postgresql+asyncpg://u:p@h:5432/db"
    local = "postgresql+asyncpg://pingkhana:pingkhana@localhost:54532/pingkhana"
    assert asyncpg_url(local) == local
