# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\Activate

# Install requirements
pip install -r requirements.txt

# Copy environment variables
Copy-Item ..\hedge-fund-ai\.env .env

Write-Host "Setup complete! You can now run the backend with: python main.py" 