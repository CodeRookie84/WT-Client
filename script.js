// script.js - WITH TAP-TO-TOGGLE MICROPHONE

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(registration => {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, err => {
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}

// --- CONFIGURATION ---
const SERVER_URL = "https://wt-server-od9g.onrender.com";
const CHANNELS = ["Cakewala 1", "Cakewala 2", "Cakewala 3", "Cakewala 4"];
const STORAGE_KEY = 'walkie_talkie_channels';

// --- DOM ELEMENTS & STATE ---
const statusTextElement = document.getElementById('status-text');
const statusLightElement = document.getElementById('status-light');
const channelsListElement = document.getElementById('channels-list');
const socket = io(SERVER_URL);
let mediaRecorder;
let audioChunks = [];
let isRecording = false;
let activeRecordingButton = null;

// --- INITIALIZATION ---
function initialize() {
    populateChannels();
    setupSocketListeners();
    initializeMediaRecorder();
}

function populateChannels() {
    const savedChannels = getSavedChannels();
    CHANNELS.forEach(channel => {
        const isChecked = savedChannels.includes(channel);
        const item = document.createElement('li');
        item.className = 'channel-item';
        if (isChecked) item.classList.add('active');
        item.id = `channel-${channel}`;
        item.innerHTML = `
            <span class="channel-name">${channel}</span>
            <label class="switch">
                <input type="checkbox" class="channel-toggle" data-channel="${channel}" ${isChecked ? 'checked' : ''}>
                <span class="slider"></span>
            </label>
            <button class="talk-button" data-channel="${channel}" ${!isChecked ? 'disabled' : ''}>
                <i class="fa-solid fa-microphone"></i>
            </button>
        `;
        channelsListElement.appendChild(item);
    });
    // This function below is the only one we are changing
    setupActionListeners();
}

// --- SOCKET.IO LISTENERS (UNCHANGED) ---
function setupSocketListeners() {
    socket.on('connect', () => {
        statusTextElement.textContent = 'Connected';
        statusLightElement.className = 'status-light connected';
        getSavedChannels().forEach(channel => socket.emit('join-channel', channel));
    });

    socket.on('disconnect', () => {
        statusTextElement.textContent = 'Disconnected';
        statusLightElement.className = 'status-light disconnected';
        if (isRecording) stopRecording(); 
    });

    socket.on('audio-message-from-server', (data) => {
        if (data.senderId === socket.id) {
            return; 
        }
        const audioBlob = new Blob([data.audioChunk]);
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        const channelItem = document.getElementById(`channel-${data.channel}`);
        if(channelItem) {
            channelItem.classList.add('receiving');
            statusLightElement.classList.add('receiving');
            audio.onended = () => {
                channelItem.classList.remove('receiving');
                statusLightElement.classList.remove('receiving');
            };
        }
    });
}

// --- MEDIA RECORDER LOGIC (UNCHANGED) ---
async function initializeMediaRecorder() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        mediaRecorder.ondataavailable = event => audioChunks.push(event.data);

        mediaRecorder.onstop = () => {
            if (!activeRecordingButton) return; 

            const channel = activeRecordingButton.dataset.channel;
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            if (audioBlob.size > 0) {
                socket.emit('audio-message', {
                    channel: channel,
                    audioChunk: audioBlob
                });
            }

            audioChunks = [];

            if (activeRecordingButton) {
                activeRecordingButton.classList.remove('recording');
                activeRecordingButton.querySelector('i').className = 'fa-solid fa-microphone';
            }
            isRecording = false;
            activeRecordingButton = null;
        };
    } catch (error) {
        console.error("Error accessing microphone:", error);
        statusTextElement.textContent = 'Microphone access denied.';
    }
}


// --- *** THE ONLY SECTION WITH CHANGES *** ---

// We create a new handler function for the button logic
function handleTalkButtonClick(button) {
    // If we are already recording...
    if (isRecording) {
        // ...and the button we clicked is the SAME one that's active...
        if (button === activeRecordingButton) {
            // ...then stop the recording.
            stopRecording();
        } else {
            // Otherwise, do nothing. This prevents starting a new recording while another is active.
            console.warn("Another channel is active. Please stop it first.");
        }
    } else {
        // If we are NOT recording, start a new one.
        if (!button.disabled) {
            startRecording(button);
        }
    }
}

// We replace the old mousedown/mouseup/touchstart/touchend listeners with a single 'click' listener.
function setupActionListeners() {
    // Listen for channel toggles (no change here)
    channelsListElement.addEventListener('change', e => {
        if (e.target.classList.contains('channel-toggle')) handleChannelToggle(e.target);
    });

    // A single click listener for the talk buttons
    channelsListElement.addEventListener('click', e => {
        const button = e.target.closest('.talk-button');
        if (button) {
            handleTalkButtonClick(button);
        }
    });
}

// --- END OF CHANGED SECTION ---


// --- HELPER FUNCTIONS (UNCHANGED) ---

function handleChannelToggle(toggle) {
    const channel = toggle.dataset.channel;
    const channelItem = toggle.closest('.channel-item');
    const talkButton = channelItem.querySelector('.talk-button');

    if (toggle.checked) {
        socket.emit('join-channel', channel);
        talkButton.disabled = false;
        channelItem.classList.add('active');
    } else {
        socket.emit('leave-channel', channel);
        talkButton.disabled = true;
        channelItem.classList.remove('active');
        // If we are recording on the channel we just disabled, stop it.
        if (isRecording && activeRecordingButton === talkButton) {
            stopRecording();
        }
    }
    saveActiveChannels();
}

function startRecording(button) {
    if (isRecording || !mediaRecorder || button.disabled) return;
    isRecording = true;
    activeRecordingButton = button;
    mediaRecorder.start();
    button.classList.add('recording');
    button.querySelector('i').className = 'fa-solid fa-record-vinyl';
}

function stopRecording() {
    if (!isRecording) return;
    if (mediaRecorder.state === "recording") {
        mediaRecorder.stop();
    }
}

function saveActiveChannels() {
    const activeChannels = Array.from(document.querySelectorAll('.channel-toggle:checked'))
                                .map(toggle => toggle.dataset.channel);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeChannels));
}

function getSavedChannels() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
}

initialize();
