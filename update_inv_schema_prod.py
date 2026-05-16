import paramiko

hostname = '46.224.144.166'
username = 'root'
password = 'Zid@n2026'

sql = "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS lcy_fx_rate NUMERIC(15,4);"

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)
    
    cmd = f"docker exec erp-db psql -U postgres -d erp_db -c \"{sql}\""
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    client.close()
    print("Production inventory_items schema updated.")
except Exception as e:
    print(f"Error: {e}")
