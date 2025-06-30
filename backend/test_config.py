import os
from dotenv import load_dotenv
import openai
from pathlib import Path

def test_openai_config():
    print("Testing OpenAI API Configuration...")
    
    # Check if .env file exists
    env_path = Path(".env")
    if not env_path.exists():
        print("❌ Error: .env file not found in current directory")
        return False
    
    # Load environment variables
    load_dotenv()
    
    # Check if API key is set
    api_key = os.getenv('OPENAI_API_KEY')
    if not api_key:
        print("❌ Error: OPENAI_API_KEY not found in .env file")
        return False
    
    if api_key == "your_openai_api_key_here":
        print("❌ Error: OPENAI_API_KEY is still set to the placeholder value")
        return False
    
    # Test OpenAI API connection
    try:
        openai.api_key = api_key
        # Make a simple API call to test the connection
        response = openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello!"}],
            max_tokens=5
        )
        print("✅ Success: OpenAI API connection test passed")
        return True
    except Exception as e:
        print(f"❌ Error: Failed to connect to OpenAI API: {str(e)}")
        return False

if __name__ == "__main__":
    test_openai_config() 