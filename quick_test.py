import requests

# API key for authentication
api_key = "cspmt3bn4dk1lgtvk3m2rwtp8m7897vm246tz9w5"

# Use the exact URL from the working curl command
url = "https://lunarcrush.com/api4/public/topics/list/v1"
headers = {
    'Authorization': f'Bearer {api_key}'
}

print("Making request to:", url)
print("Using headers:", headers)

response = requests.request("GET", url, headers=headers)
print(f"Status Code: {response.status_code}")
print(response.text.encode('utf8')) 