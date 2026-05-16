$env:DATABASE_URL = $null
$env:PYTHONIOENCODING = 'utf-8'
.\venv\Scripts\activate
litellm --model ollama/qwen2.5-coder:32b --port 4040 --drop_params
