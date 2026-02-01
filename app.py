import pyautogui
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 
from flask_cors import CORS

app = Flask(__name__)
CORS(app) 

# --- CRITICAL FIX: OS Level Speed & Stability ---
pyautogui.PAUSE = 0
pyautogui.FAILSAFE = False  
SCREEN_W, SCREEN_H = pyautogui.size()

@app.route('/')
def home():
    return f"SecureGaze Server: {SCREEN_W}x{SCREEN_H} Active"

@app.route('/api/control', methods=['POST'])
def control_system():
    data = request.json
    if not data:
        return jsonify({"error": "No data"}), 400

    action_type = data.get('type')

    try:
        # 1. EXTREME-SENSITIVITY MOVEMENT
        if action_type == 'move':
            x, y = data.get('x'), data.get('y')
            
            # --- SENSITIVITY UPGRADE ---
            # Pehle 2.5 tha, ab 6.5 kar diya hai. 
            # Iska matlab hai thoda sa sar hilane par mouse 6 guna door jayega.
            multiplier = 6.5 
            offset = (multiplier - 1.0) / 2.0

            target_x = (1 - x) * SCREEN_W * multiplier - (SCREEN_W * offset)
            target_y = y * SCREEN_H * multiplier - (SCREEN_H * offset)
            
            # Boundary Logic: Mouse ko screen ke edges par stuck hone se rokna
            target_x = max(5, min(SCREEN_W - 5, target_x))
            target_y = max(5, min(SCREEN_H - 5, target_y))
            
            # Direct System Move (No lag)
            pyautogui.moveTo(target_x, target_y, _pause=False)

        # 2. CLICK ACTION
        elif action_type == 'click':
            pyautogui.click()
            print(">>> [MOUSE] Clicked")

        # 3. VOICE COMMANDS
        elif action_type == 'voice':
            command = data.get('command', '').lower().strip()
            print(f">>> [VOICE]: {command}")

            if "type" in command:
                text = command.replace("type", "").strip()
                pyautogui.write(text + " ", interval=0.01)
            elif any(w in command for w in ["enter", "ok", "confirm"]):
                pyautogui.press('enter')
            elif any(w in command for w in ["delete", "backspace"]):
                pyautogui.press('backspace')
            elif "space" in command:
                pyautogui.press('space')
            elif "up" in command:
                pyautogui.scroll(500)
            elif "down" in command:
                pyautogui.scroll(-500)
            else:
                pyautogui.write(command + " ", interval=0.01)

    except Exception as e:
        print(f"System Warning: {e}")

    return jsonify({"status": "success"}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)