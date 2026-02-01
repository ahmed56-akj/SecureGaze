let isTracking = false;
let lastX = 0.5, lastY = 0.5;

// --- SENSITIVITY & SMOOTHING SETTINGS ---
// Isko maine 0.15 kar diya hai taake "Lag" khatam ho jaye aur reaction instant ho
const smoothness = 0.15; 
const blinkThreshold = 0.015; 

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.interimResults = false;
recognition.lang = 'en-US';

recognition.onend = () => { if (isTracking) recognition.start(); };

window.onload = () => {
    const videoElement = document.getElementById('input_video');
    const toggle = document.getElementById('control-toggle');
    const statusDot = document.getElementById('status-dot');
    const infoText = document.getElementById('info');

    async function enablePiP() {
        try {
            if (videoElement !== document.pictureInPictureElement) {
                await videoElement.requestPictureInPicture();
            }
        } catch (error) {
            console.log("PiP failed, but tracking will continue.");
        }
    }

    toggle.addEventListener('change', async () => {
        isTracking = toggle.checked;
        if (isTracking) {
            statusDot.classList.add('online');
            infoText.innerText = "SYSTEM ONLINE: TRACKING + VOICE";
            await enablePiP(); 
            try { recognition.start(); } catch(e) {}
        } else {
            statusDot.classList.remove('online');
            infoText.innerText = "SYSTEM STANDBY";
            if (document.pictureInPictureElement) document.exitPictureInPicture();
            recognition.stop();
        }
    });

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        sendAction('voice', { command: transcript });
    };

    const faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7
    });

    faceMesh.onResults((results) => {
        if (!isTracking || !results.multiFaceLandmarks || !results.multiFaceLandmarks[0]) return;

        const landmarks = results.multiFaceLandmarks[0];
        const nose = landmarks[1]; 
        
        // --- HIGH-SPEED SMOOTHING LOGIC ---
        // Pehle value 0.05 thi (Slow), ab 0.15 hai (Fast)
        // Is se mouse aapke nose ke saath "Magnet" ki tarah chipak kar chalega
        lastX = lastX + (nose.x - lastX) * smoothness;
        lastY = lastY + (nose.y - lastY) * smoothness;

        sendAction('move', { x: lastX, y: lastY });

        const eyeTop = landmarks[159].y;
        const eyeBottom = landmarks[145].y;
        if (Math.abs(eyeTop - eyeBottom) < blinkThreshold) {
            sendAction('click', {});
        }
    });

    function sendAction(type, payload) {
        fetch('http://127.0.0.1:5000/api/control', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, ...payload })
        }).catch(() => {});
    }

    const camera = new Camera(videoElement, {
        onFrame: async () => { 
            await faceMesh.send({image: videoElement}); 
        },
        width: 640, height: 480
    });
    camera.start();
};