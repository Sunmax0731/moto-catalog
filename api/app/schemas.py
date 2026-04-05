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
    max_power: float | None
    max_torque: float | None
    seat_height: int | None
    description: str | None
    image_url: str | None
    status: str | None
    tags: list[TagOut]
    model_config = {"from_attributes": True}
