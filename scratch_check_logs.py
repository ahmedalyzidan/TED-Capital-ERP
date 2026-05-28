import paramiko

hostname = '46.224.144.166'
username = 'root'
password = 'Zid@n2026'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    client.connect(hostname, username=username, password=password)
    stdin, stdout, stderr = client.exec_command('docker logs --tail 30 erp-backend')
    print("Remote backend logs:")
    print(stdout.read().decode('utf-8'))
    print("Errors:")
    print(stderr.read().decode('utf-8'))
finally:
    client.close()
