import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ.get("GEMINI_API_KEY")
model_name = os.environ.get("GEMINI_MODEL")

print(f"Testing with model: {model_name}")

try:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    response = model.generate_content("Say hello concisely")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
