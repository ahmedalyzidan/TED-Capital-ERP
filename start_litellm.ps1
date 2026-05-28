$env:DATABASE_URL = $null
$env:PYTHONIOENCODING = 'utf-8'
$env:GEMINI_API_KEY = "AIzaSyA_wxN3JtRjWK9YKIBovvx5UkjbHAWSR9A"
.\venv\Scripts\activate
litellm --model gemini/gemini-1.5-flash --port 4040 --drop_params
