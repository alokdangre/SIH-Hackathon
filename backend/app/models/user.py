from sqlalchemy import Column, Integer, String
from app.core.db import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index = True)
    name = Column(String, nullable = False)
    email = Column(String, unique=True, index = True)
    password = Column(String, nullable=False)
    role = Column(String, default="farmer")