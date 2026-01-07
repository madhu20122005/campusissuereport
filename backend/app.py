from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai
from dotenv import load_dotenv
import os
import json
import requests

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure Gemini AI
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Gemini API Key: Configured")
    
    # List available models
    try:
        print("\nAvailable Gemini models:")
        for model in genai.list_models():
            if 'generateContent' in model.supported_generation_methods:
                print(f"  - {model.name}")
    except Exception as e:
        print(f"Could not list models: {e}")
else:
    print("WARNING: GEMINI_API_KEY not found in .env file")

@app.route('/')
def home():
    return jsonify({
        "status": "running",
        "message": "Campus Issue Reporter API",
        "endpoints": {
            "/api/classify": "POST - Classify issue with AI",
            "/api/health": "GET - Health check"
        }
    })

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "gemini": "configured" if GEMINI_API_KEY else "not configured"})

@app.route('/api/classify', methods=['POST', 'OPTIONS'])
def classify_issue():
    # Handle preflight request
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        description = data.get('description', '')
        location = data.get('location', {})
        
        if not description:
            return jsonify({"error": "Description is required"}), 400
        
        print(f"Classifying issue: {description[:50]}...")
        
        # Simple rule-based classification (AI temporarily disabled)
        print("Using rule-based classification...")
        
        description_lower = description.lower()
        
        # Determine category based on keywords
        category = "other"
        if any(word in description_lower for word in ["water", "leak", "pipe", "fountain", "toilet", "sink", "drain"]):
            category = "plumbing"
        elif any(word in description_lower for word in ["light", "electric", "power", "outlet", "wire", "bulb"]):
            category = "electrical"
        elif any(word in description_lower for word in ["danger", "unsafe", "hazard", "risk", "emergency", "broken glass"]):
            category = "safety"
        elif any(word in description_lower for word in ["dirty", "trash", "garbage", "clean", "mess", "waste"]):
            category = "cleanliness"
        elif any(word in description_lower for word in ["road", "path", "sidewalk", "building", "wall", "roof", "door", "window"]):
            category = "infrastructure"
        elif any(word in description_lower for word in ["grass", "tree", "plant", "garden", "lawn", "landscape"]):
            category = "landscaping"
        
        # Determine severity based on keywords
        severity = "medium"
        if any(word in description_lower for word in ["urgent", "critical", "emergency", "danger", "unsafe", "immediate"]):
            severity = "high"
        elif any(word in description_lower for word in ["minor", "small", "slight", "cosmetic"]):
            severity = "low"
        
        result = {
            "category": category,
            "severity": severity,
            "confidence": 0.8,
            "suggestion": f"Issue categorized as {category} with {severity} priority"
        }
        
        print(f"Classification result: {result}")
        return jsonify(result)
            
    except Exception as e:
        print(f"Error in classify_issue: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("\nStarting Campus Issue Reporter Backend...")
    print(f"Gemini API Key: {'Configured' if GEMINI_API_KEY else 'NOT CONFIGURED'}")
    print("\nEndpoints:")
    print("  http://localhost:5000/")
    print("  http://localhost:5000/api/classify")
    print("  http://localhost:5000/api/health")
    print("\n")
    app.run(debug=True, port=5000)