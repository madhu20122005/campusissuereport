# Backend Setup Instructions

## Prerequisites
- Python 3.8 or higher
- pip package manager
- Google Cloud account
- Firebase project

## Step 1: Install Python Dependencies
```bash
cd backend
pip install -r requirements.txt
```

## Step 2: Get Google Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the API key
4. Add to `.env` file

## Step 3: Setup Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Go to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file as `firebase-credentials.json` in backend folder
6. Update path in `.env`

## Step 4: Configure Environment Variables

Edit `.env` file:
```env
GEMINI_API_KEY=your_actual_gemini_api_key
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
```

## Step 5: Run the Backend
```bash
python app.py
```

Server will start on http://localhost:5000

## Testing the API

### Health Check
```bash
curl http://localhost:5000/api/health
```

### Test Classification
```bash
curl -X POST http://localhost:5000/api/classify \
  -H "Content-Type: application/json" \
  -d '{"description": "water leak in bathroom", "photos": []}'
```

## Troubleshooting

### Issue: ModuleNotFoundError
**Solution**: Run `pip install -r requirements.txt`

### Issue: Firebase credentials error
**Solution**: Check that firebase-credentials.json path is correct in .env

### Issue: Gemini API error
**Solution**: Verify API key is correct and has no restrictions