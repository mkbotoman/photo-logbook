from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class ImageGroup(Base):
    __tablename__ = "image_groups"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    directory_name = Column(String, unique=True)  # The actual directory name on disk
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationship to images
    images = relationship("Image", back_populates="group", cascade="all, delete-orphan")

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("image_groups.id"))
    original_filename = Column(String)
    stored_filename = Column(String)  # The filename on disk
    content_type = Column(String)
    file_size = Column(Integer)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Image metadata
    width = Column(Integer)
    height = Column(Integer)
    format = Column(String)
    camera_make = Column(String, nullable=True)
    camera_model = Column(String, nullable=True)
    date_taken = Column(DateTime, nullable=True)
    gps_latitude = Column(String, nullable=True)
    gps_longitude = Column(String, nullable=True)
    
    # AI Analysis results stored as JSON
    content_analysis = Column(JSON, nullable=True)
    
    # Relationship to group
    group = relationship("ImageGroup", back_populates="images") 