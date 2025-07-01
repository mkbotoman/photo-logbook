from sqlalchemy.orm import Session
from models import ImageGroup, Image
from datetime import datetime
from typing import List, Optional
import json

def create_image_group(db: Session, title: str, directory_name: str) -> ImageGroup:
    """Create a new image group."""
    db_group = ImageGroup(
        title=title,
        directory_name=directory_name,
        created_at=datetime.utcnow()
    )
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group

def get_image_group(db: Session, group_id: int) -> Optional[ImageGroup]:
    """Get an image group by ID."""
    return db.query(ImageGroup).filter(ImageGroup.id == group_id).first()

def get_image_group_by_directory(db: Session, directory_name: str) -> Optional[ImageGroup]:
    """Get an image group by directory name."""
    return db.query(ImageGroup).filter(ImageGroup.directory_name == directory_name).first()

def get_all_image_groups(db: Session) -> List[ImageGroup]:
    """Get all image groups."""
    return db.query(ImageGroup).order_by(ImageGroup.created_at.desc()).all()

def create_image(
    db: Session,
    group_id: int,
    original_filename: str,
    stored_filename: str,
    content_type: str,
    file_size: int,
    metadata: dict,
    content_analysis: dict
) -> Image:
    """Create a new image record."""
    db_image = Image(
        group_id=group_id,
        original_filename=original_filename,
        stored_filename=stored_filename,
        content_type=content_type,
        file_size=file_size,
        uploaded_at=datetime.utcnow(),
        # Image metadata
        width=metadata.get('width'),
        height=metadata.get('height'),
        format=metadata.get('format'),
        camera_make=metadata.get('camera_make'),
        camera_model=metadata.get('camera_model'),
        date_taken=datetime.fromisoformat(metadata['date_taken']) if metadata.get('date_taken') else None,
        gps_latitude=str(metadata['gps']['latitude']) if metadata.get('gps') else None,
        gps_longitude=str(metadata['gps']['longitude']) if metadata.get('gps') else None,
        # AI Analysis
        content_analysis=content_analysis
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def get_image(db: Session, image_id: int) -> Optional[Image]:
    """Get an image by ID."""
    return db.query(Image).filter(Image.id == image_id).first()

def get_images_by_group(db: Session, group_id: int) -> List[Image]:
    """Get all images in a group."""
    return db.query(Image).filter(Image.group_id == group_id).order_by(Image.uploaded_at.desc()).all() 