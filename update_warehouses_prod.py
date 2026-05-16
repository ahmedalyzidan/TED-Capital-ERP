import paramiko

hostname = '46.224.144.166'
username = 'root'
password = 'Zid@n2026'

warehouses = [
    "Main Store",
    "branch 1",
    "branch 2",
    "branch 3",
    "branch 4",
    "branch 5",
    "branch 6",
    "branch 7",
    "branch 8"
]

sql_commands = [
    "TRUNCATE TABLE warehouses RESTART IDENTITY CASCADE;"
]

for w in warehouses:
    sql_commands.append(f"INSERT INTO warehouses (name) VALUES ('{w}');")

try:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname, username=username, password=password)
    
    for cmd in sql_commands:
        print(f"Executing: {cmd}")
        # Run inside docker container
        docker_cmd = f"docker exec erp-db psql -U postgres -d erp_db -c \"{cmd}\""
        stdin, stdout, stderr = client.exec_command(docker_cmd)
        print(stdout.read().decode())
        print(stderr.read().decode())
        
    client.close()
    print("Warehouse list updated on Production.")
except Exception as e:
    print(f"Error: {e}")
