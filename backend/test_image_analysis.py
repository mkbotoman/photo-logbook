import asyncio
from pathlib import Path
from services.image_analyzer import ImageAnalyzer
import sys
import json

async def test_image_analysis(image_path: str):
    try:
        # Create an instance of ImageAnalyzer
        analyzer = ImageAnalyzer()
        
        # Convert string path to Path object
        path = Path(image_path)
        
        if not path.exists():
            print(f"❌ Error: Image file not found at {image_path}")
            return
        
        print(f"Testing image analysis for: {path.name}")
        print("Analyzing image...")
        
        # Analyze the image
        result = await analyzer.analyze_image(path)
        
        # Pretty print the results
        print("\n✅ Analysis completed successfully!")
        print("\nMetadata:")
        print(json.dumps(result["metadata"], indent=2))
        print("\nContent Analysis:")
        print(json.dumps(result["content_analysis"], indent=2))
        
    except Exception as e:
        print(f"❌ Error during analysis: {str(e)}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_image_analysis.py <path_to_image>")
        sys.exit(1)
        
    image_path = sys.argv[1]
    asyncio.run(test_image_analysis(image_path)) 