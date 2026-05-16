import paramiko

hostname = '46.224.144.166'
username = 'root'
password = 'Zid@n2026'

sql = """
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS lcy_fx_rate NUMERIC(15,4);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS lcy_total NUMERIC(15,2);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS unit_cost_after_ddp NUMERIC(15,2);
"""

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)
    
    cmd = f"docker exec erp-db psql -U postgres -d erp_db -c \"{sql}\""
    stdin, stdout, stderr = client.exec_command(cmd)
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    client.close()
    print("Production purchase_orders schema updated.")
except Exception as e:
    print(f"Error: {e}")
