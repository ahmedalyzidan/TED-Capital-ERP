import os
import time
import subprocess
import sys
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Force UTF-8 for stdout if possible
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except:
        pass

# Settings
SOURCE_DIR = "." 
OUTPUT_CONTEXT = "project_context.txt"
EXTENSIONS = {'.py', '.js', '.jsx', '.sql'}
EXCLUDE_DIRS = {'node_modules', '__pycache__', '.git', 'venv', 'tests'}

def update_ai_context():
    """Aggregate code for AI context"""
    print("[INFO] Updating AI Context...")
    try:
        with open(OUTPUT_CONTEXT, 'w', encoding='utf-8') as f:
            for root, dirs, files in os.walk(SOURCE_DIR):
                dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
                for file in files:
                    if any(file.endswith(ext) for ext in EXTENSIONS):
                        full_path = os.path.join(root, file)
                        f.write(f"\n\n--- FILE: {full_path} ---\n")
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as c:
                            f.write(c.read())
        print("[SUCCESS] Context updated.")
    except Exception as e:
        print(f"[ERROR] Failed to update context: {e}")

def run_tests():
    """Run financial, UI, and E2E tests"""
    print("\n[TEST] Running Financial Tests...")
    try:
        res = subprocess.run(["pytest", "-m", "finance"], capture_output=True, text=True, encoding='utf-8', errors='ignore')
        print(res.stdout)
        
        if res.returncode == 0:
            print("[OK] Finance Logic OK. Running UI Tests...")
            ui_res = subprocess.run(["pytest", "-m", "ui"], capture_output=True, text=True, encoding='utf-8', errors='ignore')
            print(ui_res.stdout)
            
            if ui_res.returncode == 0:
                print("[OK] UI Tests Passed. Running E2E Tests...")
                run_e2e_tests()
            else:
                print("[WARN] UI Tests Failed. Skipping E2E.")
        else:
            print("[CRITICAL] Financial Calculation Error Detected!")
    except Exception as e:
        print(f"[ERROR] Failed to run tests: {e}")

def run_e2e_tests():
    """Run Playwright E2E tests"""
    print("\n[E2E] Starting Playwright E2E Test Suite...")
    try:
        # Set base URL from environment or use default
        env = os.environ.copy()
        env['BASE_URL'] = env.get('BASE_URL', 'http://127.0.0.1:4000')
        
        # Run playwright tests
        res = subprocess.run(
            ["npx", "playwright", "test", "--project=chromium", "--reporter=list"],
            cwd="backend/playwright-e2e-tests",
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='ignore',
            env=env
        )
        
        print(res.stdout)
        if res.stderr:
            print("[WARN] Playwright stderr:", res.stderr)
        
        if res.returncode == 0:
            print("[SUCCESS] ✅ All E2E Tests Passed!")
            return True
        else:
            print("[WARN] ⚠️ Some E2E Tests Failed. Review logs above.")
            return False
    except FileNotFoundError:
        print("[WARN] Playwright not installed. Install with: npm install")
        return False
    except Exception as e:
        print(f"[ERROR] E2E Test Execution Failed: {e}")
        return False

class MasterHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if not event.is_directory and any(event.src_path.endswith(ext) for ext in EXTENSIONS):
            print(f"\n[CHANGE] Detected: {event.src_path}")
            update_ai_context()
            run_tests()

if __name__ == "__main__":
    update_ai_context()
    run_tests()
    observer = Observer()
    observer.schedule(MasterHandler(), SOURCE_DIR, recursive=True)
    observer.start()
    print("[START] Antigravity Orchestrator is watching your ERP...")
    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()