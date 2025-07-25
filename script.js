// --- SETUP ---
const SERVER_URL = "https://walkie-talkie-server-9yu3.onrender.com";
const socket = io(SERVER_URL);

const statusElement = document.getElementById('status');
const talkButton = document.getElementById('talk-button');

let mediaRecorder;
let audioChunks = [];

// --- SOCKET.IO EVENT HANDLERS ---
socket.on('connect', () => {
    statusElement.textContent = 'Connected. Hold button to talk.';
    console.log('Connected to server!');
    initializeMediaRecorder();
});

socket.on('disconnect', () => {
    statusElement.textContent = 'Disconnected';
    console.log('Disconnected from server.');
});

// Listen for audio coming FROM the server
socket.on('audio-message-from-server', (audioChunk) => {
    const audioBlob = new Blob([audioChunk]);
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
    statusElement.textContent = 'Receiving audio...';
    audio.onended = () => {
        statusElement.textContent = 'Connected. Hold button to talk.';
    }
});


// --- MEDIA RECORDER LOGIC ---
async function initializeMediaRecorder() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = event => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            // Send the complete audio blob to the server
            socket.emit('audio-message', audioBlob);
            audioChunks = []; // Clear the chunks for the next recording
            statusElement.textContent = 'Connected. Hold button to talk.';
        };
        
        talkButton.disabled = false; // Enable the button now that we have permission
        statusElement.textContent = 'Ready. Hold button to talk.';

    } catch (error) {
        console.error("Error accessing microphone:", error);
        statusElement.textContent = 'Microphone access denied.';
        talkButton.disabled = true;
    }
}


// --- BUTTON EVENT LISTENERS ---
// Using mousedown and mouseup to simulate "push-and-hold"
talkButton.addEventListener('mousedown', () => {
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
        statusElement.textContent = 'Recording...';
    }
});

talkButton.addEventListener('mouseup', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
});

// Add touch events for mobile users
talkButton.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling and other default actions
    if (mediaRecorder && mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
        statusElement.textContent = 'Recording...';
    }
});

talkButton.addEventListener('touchend', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
});
