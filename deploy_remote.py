import paramiko
import sys

hostname = '46.224.144.166'
username = 'root'
password = 'Zid@n2026'

commands = [
    'cd /root/TED-Capital-ERP && git fetch origin && git reset --hard origin/main',
    'cd /root/TED-Capital-ERP && bash deploy.sh',
    'docker exec erp-backend node backend/sync_existing_payroll.js',
    'mkdir -p ~/.ssh && echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIHG5S7FmOyFaeerBeWuJAs6mRpYoUaPugZCZ90nJaHxP ahmedalyzidan2013@gmail.com" >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys'
]

try:
    print(f"Connecting to {hostname}...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)
    
    for cmd in commands:
        print(f"Executing: {cmd}")
        stdin, stdout, stderr = client.exec_command(cmd)
        
        # Use a more robust way to print remote output to avoid encoding errors on Windows
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
    print("Deployment and Key Authorization Finished.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
