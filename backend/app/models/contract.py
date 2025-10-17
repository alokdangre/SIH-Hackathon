from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.core.db import Base

class Contract(Base):
    __tablename__= "contracts"
    id = Column(Integer, primary_key=True,index=True)
    listing_id=Column(Integer,ForeignKey("listings.id"))
    buyer_id = Column(String, ForeignKey("users.id"))
    status = Column(String,default="pending")
    offer_price = Column(Float)
    listing = relationship("Listing")
    buyer = relationship("User")