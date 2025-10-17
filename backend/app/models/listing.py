from sqlalchemy import Column, Integer,String,Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base

class Listing(Base):
    __tablename__="listings"
    id = Column(Integer, primary_key=True,index = True)
    commodity = Column(String)
    quantity = Column(Float)
    price = Column(Float)
    location = Column(String)
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User")