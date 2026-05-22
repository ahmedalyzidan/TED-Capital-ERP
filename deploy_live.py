import paramiko
import sys

hostname = '46.224.144.166'
username = 'root'
password = 'Zid@n2026'

commands = [
    'cd /root/TED-Capital-ERP && bash update-erp.sh'
]

try:
    print(f"Connecting to {hostname} via SSH...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password, timeout=30)
    
    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        while True:
            line = stdout.readline()
            if not line:
                break
            try:
                print(f"STDOUT: {line.strip()}")
            except UnicodeEncodeError:
                print(f"STDOUT: {line.encode('ascii', 'ignore').decode().strip()} (Filtered Unicode)")
                
        while True:
            line = stderr.readline()
            if not line:
                break
            try:
                print(f"STDERR: {line.strip()}")
            except UnicodeEncodeError:
                print(f"STDERR: {line.encode('ascii', 'ignore').decode().strip()} (Filtered Unicode)")
            
    client.close()
    print("Deployment successful: The live server at 46.224.144.166 has been updated.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
