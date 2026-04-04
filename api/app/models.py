from sqlalchemy import Column, Integer, String, Text, Table, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

motorcycle_tag = Table(
    "motorcycle_tag",
    Base.metadata,
    Column("motorcycle_id", Integer, ForeignKey("motorcycles.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=False)  # "maker", "type", "displacement", "feature"


class Motorcycle(Base):
    __tablename__ = "motorcycles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    maker = Column(String, nullable=False)
    displacement = Column(Integer)
    year = Column(Integer)
    description = Column(Text)
    image_url = Column(String)
    tags = relationship("Tag", secondary=motorcycle_tag, backref="motorcycles")
