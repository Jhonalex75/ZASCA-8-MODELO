import urllib.request
import json

def test_api(url, method='GET', data=None):
    print(f"Testing {url}...")
    try:
        req = urllib.request.Request(url, method=method)
        if data:
            req.add_header('Content-Type', 'application/json')
            data = json.dumps(data).encode('utf-8')
        
        with urllib.request.urlopen(req, data=data) as response:
            res_data = response.read().decode('utf-8')
            if 'application/json' in response.getheader('Content-Type', ''):
                return json.loads(res_data)
            return res_data[:100] + "..."
    except Exception as e:
        return f"Error: {e}"

print("\n--- API VERIFICATION ---")
analysis = test_api("http://localhost:5000/api/get_analysis", method='POST', data={"type": "von_mises"})
print("Analysis Data:", json.dumps(analysis, indent=2))

transmision = test_api("http://localhost:5000/api/get_transmision")
print("Transmision Data:", json.dumps(transmision, indent=2))
