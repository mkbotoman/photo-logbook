from pathlib import Path
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from exif import Image as ExifImage
from datetime import datetime
import os
from typing import Dict, Any, Optional, Tuple
import base64
import openai
from dotenv import load_dotenv

load_dotenv()

class ImageAnalyzer:
    def __init__(self):
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        if self.openai_api_key:
            openai.api_key = self.openai_api_key

    def _convert_to_degrees(self, value: tuple) -> float:
        """Helper function to convert GPS coordinates to degrees."""
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)

    def _get_gps_data(self, exif_data: dict) -> Optional[Dict[str, float]]:
        """Extract GPS coordinates from EXIF data."""
        if not exif_data:
            return None

        gps_info = {}
        for key, value in exif_data.items():
            tag = TAGS.get(key, key)
            if tag == 'GPSInfo':
                for t, v in value.items():
                    sub_tag = GPSTAGS.get(t, t)
                    gps_info[sub_tag] = v

        if not gps_info:
            return None

        try:
            lat_data = gps_info.get('GPSLatitude')
            lon_data = gps_info.get('GPSLongitude')
            lat_ref = gps_info.get('GPSLatitudeRef')
            lon_ref = gps_info.get('GPSLongitudeRef')

            if lat_data and lon_data and lat_ref and lon_ref:
                lat = self._convert_to_degrees(lat_data)
                lon = self._convert_to_degrees(lon_data)

                if lat_ref != 'N':
                    lat = -lat
                if lon_ref != 'E':
                    lon = -lon

                return {
                    'latitude': lat,
                    'longitude': lon
                }
        except Exception as e:
            print(f"Error extracting GPS data: {e}")
        
        return None

    def extract_metadata(self, image_path: Path) -> Dict[str, Any]:
        """Extract metadata from an image including EXIF data."""
        metadata = {
            'filename': image_path.name,
            'file_size': os.path.getsize(image_path),
            'file_type': image_path.suffix.lower(),
        }

        try:
            # Use PIL for basic image info
            with Image.open(image_path) as img:
                metadata.update({
                    'width': img.width,
                    'height': img.height,
                    'format': img.format,
                    'mode': img.mode,
                })

                # Extract EXIF data
                exif_data = img._getexif() if hasattr(img, '_getexif') else None
                if exif_data:
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag == 'DateTimeOriginal':
                            try:
                                metadata['date_taken'] = datetime.strptime(
                                    value, '%Y:%m:%d %H:%M:%S'
                                ).isoformat()
                            except Exception:
                                pass
                        elif tag == 'Make':
                            metadata['camera_make'] = value
                        elif tag == 'Model':
                            metadata['camera_model'] = value

                    # Extract GPS data
                    gps_data = self._get_gps_data(exif_data)
                    if gps_data:
                        metadata['gps'] = gps_data

            # Use exif library for additional metadata
            with open(image_path, 'rb') as img_file:
                exif_image = ExifImage(img_file)
                if exif_image.has_exif:
                    if hasattr(exif_image, 'datetime_original'):
                        metadata['date_taken'] = datetime.strptime(
                            exif_image.datetime_original,
                            '%Y:%m:%d %H:%M:%S'
                        ).isoformat()
                    if hasattr(exif_image, 'gps_latitude') and hasattr(exif_image, 'gps_longitude'):
                        metadata['gps'] = {
                            'latitude': float(exif_image.gps_latitude),
                            'longitude': float(exif_image.gps_longitude)
                        }

        except Exception as e:
            metadata['error'] = str(e)

        return metadata

    async def analyze_image_content(self, image_path: Path) -> Dict[str, Any]:
        """Analyze image content using OpenAI's GPT-4 Vision."""
        if not self.openai_api_key:
            raise ValueError("OpenAI API key is not set")

        try:
            # Read and encode image
            with open(image_path, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')

            response = await openai.chat.completions.create(
                model="gpt-4-vision-preview",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Analyze this image and provide: 1) A detailed description of the scene, 2) Key objects and elements, 3) The apparent location type (e.g., beach, mountain, city), 4) The apparent time of day and weather conditions, 5) Any notable activities or events captured. Format the response as JSON."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=500
            )

            return response.choices[0].message.content

        except Exception as e:
            return {
                "error": str(e),
                "description": "Failed to analyze image content"
            }

    async def analyze_image(self, image_path: Path) -> Dict[str, Any]:
        """Combine metadata extraction and content analysis."""
        metadata = self.extract_metadata(image_path)
        content_analysis = await self.analyze_image_content(image_path)
        
        return {
            "metadata": metadata,
            "content_analysis": content_analysis
        } 