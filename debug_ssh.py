import paramiko
import sys
import logging

logging.basicConfig(level=logging.DEBUG)

hostname = '46.224.144.166'
username = 'root'
password = 'Zid@n2026'

try:
    print(f"Connecting to {hostname} as {username}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, 
                   look_for_keys=False, allow_agent=False)
    
    print("Success! Connection established.")
    client.close()
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
