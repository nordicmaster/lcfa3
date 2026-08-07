from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict


class RunConfig(BaseModel):
    host: str = "0.0.0.0"
    port: int = 8000


class MySQLConfig(BaseModel):
    user: str
    password: str
    host: str
    database: str


class ApiV1Prefix(BaseModel):
    prefix: str = "/v1"


class ApiPrefix(BaseModel):
    prefix: str = "/api"
    v1: ApiV1Prefix = ApiV1Prefix()


class LastfmConfig(BaseModel):
    base_url: str = 'https://ws.audioscrobbler.com/2.0/'
    api_key: str = '57ee3318536b23ee81d6b27e36997cde'


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env.template", ".env"),
        case_sensitive=False,
        env_nested_delimiter="__",
        env_prefix="APP_CONFIG__",
    )
    run: RunConfig = RunConfig()
    api: ApiPrefix = ApiPrefix()
    lastfm: LastfmConfig = LastfmConfig()
    # mysql: MySQLConfig


settings = Settings()
