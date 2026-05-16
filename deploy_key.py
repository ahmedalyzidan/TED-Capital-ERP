import paramiko
import sys
import os

hostname = '46.224.144.166'
username = 'root'
key_path = os.path.expanduser("~/.ssh/id_ed25519")

try:
    print(f"Attempting key-based authentication for {username}@{hostname}...")
    key = paramiko.Ed25519Key.from_private_key_file(key_path)
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, pkey=key, timeout=10)
    
    print("SUCCESS: Authenticated using SSH Key!")
    command = 'cd /root && git pull origin main && bash deploy.sh'
    print(f"Executing: {command}")
    stdin, stdout, stderr = client.exec_command(command)
    
    for line in stdout:
        print(f"STDOUT: {line.strip()}")
    for line in stderr:
        print(f"STDERR: {line.strip()}")
        
    client.close()
    print("Deployment finished.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
