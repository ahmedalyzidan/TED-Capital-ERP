import paramiko

hostname = '46.224.144.166'
username = 'root'
password = 'Zid@n2026'

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)
    
    cmd = "docker exec erp-db psql -U postgres -d erp_db -c \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'inventory_items';\""
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    client.close()
except Exception as e:
    print(f"Error: {e}")
