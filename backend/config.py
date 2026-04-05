from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "./data/a2a-ui.db"
    host: str = "0.0.0.0"
    port: int = 8000
    base_path: str = ""
    kibana_url: str = ""
    elasticsearch_api_key: str = ""

    @property
    def elastic_enabled(self) -> bool:
        return bool(self.kibana_url and self.elasticsearch_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
