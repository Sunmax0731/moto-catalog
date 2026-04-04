from pydantic import BaseModel


class TagOut(BaseModel):
    id: int
    name: str
    category: str
    model_config = {"from_attributes": True}


class MotorcycleOut(BaseModel):
    id: int
    name: str
    maker: str
    displacement: int | None
    year: int | None
    description: str | None
    image_url: str | None
    tags: list[TagOut]
    model_config = {"from_attributes": True}
