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
    """Run financial and UI tests"""
    print("\n[TEST] Running Financial Tests...")
    try:
        res = subprocess.run(["pytest", "-m", "finance"], capture_output=True, text=True, encoding='utf-8', errors='ignore')
        print(res.stdout)
        
        if res.returncode == 0:
            print("[OK] Finance Logic OK. Running UI Tests...")
            ui_res = subprocess.run(["pytest", "-m", "ui"], capture_output=True, text=True, encoding='utf-8', errors='ignore')
            print(ui_res.stdout)
        else:
            print("[CRITICAL] Financial Calculation Error Detected!")
    except Exception as e:
        print(f"[ERROR] Failed to run tests: {e}")

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