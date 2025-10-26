from sqlalchemy import Column, Date, Float, Integer, String

from app.core.db import Base


class PriceHistory(Base):
    __tablename__ = "price_history"
    id = Column(Integer, primary_key=True, index=True)
    commodity = Column(String, nullable=False)
    price_per_kg = Column(Float, nullable=False)
    recorded_on = Column(Date, nullable=False)
