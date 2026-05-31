import paramiko

c = paramiko.SSHClient()
c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
c.connect('46.224.144.166', username='root', password='Zid@n2026')

commands = [
    # Get the last 10 rows in the boq table of erp_ted_capital
    'docker exec erp-db psql -U postgres -d erp_ted_capital -c "SELECT id, project_name, item_name, est_qty, est_unit_price, company_id FROM boq ORDER BY id DESC LIMIT 10;"',
]

for cmd in commands:
    print(f"\n=== Executing: {cmd} ===")
    stdin, stdout, stderr = c.exec_command(cmd)
    print(stdout.read().decode().strip() or stderr.read().decode().strip() or "(no output)")

c.close()
print("\n✅ Done!")
