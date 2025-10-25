
        // api do flaska
        const API_BASE_URL = 'http://localhost:5000';

        // Translations
        const translations = {
            pl: {
                title: 'Cześć! Jestem Twój Przyjaciel!',
                askMe: 'Zadaj mi pytanie używając mikrofonu lub wpisz wiadomość!',
                dialogTitle: 'Wpisz swoją wiadomość',
                placeholder: 'Co chcesz wiedzieć?',
                send: 'Wyślij',
                cancel: 'Anuluj',
                listening: 'Słucham...',
                processing: 'Myślę...',
                error: 'Ups! Coś poszło nie tak. Spróbuj ponownie!',
                errorMic: 'Nie mogę użyć mikrofonu. Upewnij się, że masz pozwolenie.',
                errorNoSupport: 'Twoja przeglądarka nie obsługuje rozpoznawania mowy.',
                errorBackend: 'Nie mogę połączyć się z serwerem. Sprawdź czy Flask działa.'
            },
            en: {
                title: 'Hello! I am Your Friend!',
                askMe: 'Ask me a question using the microphone or type a message!',
                dialogTitle: 'Type your message',
                placeholder: 'What do you want to know?',
                send: 'Send',
                cancel: 'Cancel',
                listening: 'Listening...',
                processing: 'Thinking...',
                error: 'Oops! Something went wrong. Try again!',
                errorMic: 'Cannot use microphone. Make sure you have permission.',
                errorNoSupport: 'Your browser does not support speech recognition.',
                errorBackend: 'Cannot connect to server. Check if Flask is running.'
            }
        };

        // State
        let currentLanguage = 'pl';
        let isRecording = false;
        let isSpeaking = false;
        let isProcessing = false;
        let recognition = null;

        // Elements
        const btnMic = document.getElementById('btnMic');
        const btnLang = document.getElementById('btnLang');
        const btnMsg = document.getElementById('btnMsg');
        const dialogOverlay = document.getElementById('dialogOverlay');
        const dialogInput = document.getElementById('dialogInput');
        const btnSend = document.getElementById('btnSend');
        const btnCancel = document.getElementById('btnCancel');
        const face = document.getElementById('face');
        const responseBox = document.getElementById('responseBox');
        const responseText = document.getElementById('responseText');
        const title = document.getElementById('title');
        const instructions = document.getElementById('instructions');
        const dialogTitle = document.getElementById('dialogTitle');
        const langText = document.getElementById('langText');
        const toast = document.getElementById('toast');

        // web speech API
        function initSpeechRecognition() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            
            if (SpeechRecognition) {
                recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                
                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    console.log('Rozpoznano:', transcript);
                    sendMessageToBackend(transcript);
                };
                
                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    isRecording = false;
                    btnMic.classList.remove('recording');
                    updateTexts();
                    showToast(translations[currentLanguage].errorMic);
                };
                
                recognition.onend = () => {  // po zakończeniu mowy resetuje się automatycznie
                    isRecording = false;
                    btnMic.classList.remove('recording');
                    updateTexts();
                };
            }
        }

        // szybkie powiadomienia trwające 3 sekundy
        function showToast(message) {
            toast.textContent = message;
            toast.classList.add('visible');
            setTimeout(() => {
                toast.classList.remove('visible');
            }, 3000);
        }

        // przesyłanie wiadomości do backendu
        async function sendMessageToBackend(userMessage) {
            isProcessing = true;
            updateTexts();
            
            try {
                const response = await fetch(`${API_BASE_URL}/api/message`, { //endpoint do backendu
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: userMessage,
                        language: currentLanguage
                    })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const responseMessage = data.response || data.message || 'Otrzymałem twoją wiadomość!';
                
                displayResponse(responseMessage);
                
            } catch (error) {
                console.error('Error sending message to backend:', error);
                showToast(translations[currentLanguage].errorBackend);
                
                // Fallback response
                const fallbackMessage = currentLanguage === 'pl' 
                    ? 'Przepraszam, nie mogę teraz odpowiedzieć. Sprawdź czy serwer Flask działa.'
                    : 'Sorry, I cannot answer right now. Check if Flask server is running.';
                displayResponse(fallbackMessage);
            } finally {
                isProcessing = false;
                updateTexts();
            }
        }

        // odpowiedż z efektem pisania
        function displayResponse(message) {
            isSpeaking = true;
            face.classList.add('speaking');
            responseBox.classList.add('visible');
            
            // efekt pisania
            let index = 0;
            responseText.textContent = '';
            
            const typingInterval = setInterval(() => {
                if (index < message.length) {
                    responseText.textContent += message[index];
                    index++;
                } else {
                    clearInterval(typingInterval);
                    isSpeaking = false;
                    face.classList.remove('speaking');

                    // czytanie odpowiedzi 
                    speakText(message);
                }
            }, 50);
        }

        function speakText(text) {
            if (!('speechSynthesis' in window)) {
                console.warn('Speech synthesis not supported in this browser.');
                return;
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = currentLanguage === 'pl' ? 'pl-PL' : 'en-US';
            utterance.rate = 1;  
            utterance.pitch = 1;  
            utterance.volume = 1; 

            
            utterance.onstart = () => face.classList.add('speaking');
            utterance.onend = () => face.classList.remove('speaking');

            window.speechSynthesis.cancel(); 
            window.speechSynthesis.speak(utterance);
        }


        // updatowanie tekstów w UI na podstawie języka i stanu
        function updateTexts() {
            const t = translations[currentLanguage];
            title.textContent = t.title;
            
            if (isProcessing) {
                instructions.textContent = t.processing;
            } else if (isRecording) {
                instructions.textContent = t.listening;
            } else {
                instructions.textContent = t.askMe;
            }
            
            dialogTitle.textContent = t.dialogTitle;
            dialogInput.placeholder = t.placeholder;
            btnSend.textContent = t.send;
            btnCancel.textContent = t.cancel;
            langText.textContent = currentLanguage.toUpperCase();
            
            // Update button disabled state
            btnSend.disabled = isProcessing;
        }

        // Microphone button
        btnMic.addEventListener('click', () => {
            if (isRecording) {
                // Stop recording
                if (recognition) {
                    recognition.stop();
                }
                isRecording = false;
                btnMic.classList.remove('recording');
                updateTexts();
                return;
            }

            // Check if speech recognition is supported
            if (!recognition) {
                showToast(translations[currentLanguage].errorNoSupport);
                return;
            }

            // Start recording
            try {
                recognition.lang = currentLanguage === 'pl' ? 'pl-PL' : 'en-US';
                recognition.start();
                isRecording = true;
                btnMic.classList.add('recording');
                updateTexts();
            } catch (error) {
                console.error('Error starting speech recognition:', error);
                showToast(translations[currentLanguage].errorMic);
            }
        });

        // Language button
        btnLang.addEventListener('click', () => {
            currentLanguage = currentLanguage === 'pl' ? 'en' : 'pl';
            updateTexts();
            responseBox.classList.remove('visible');
        });

        // Message button
        btnMsg.addEventListener('click', () => {
            dialogOverlay.classList.add('open');
            dialogInput.focus();
        });

        // Dialog cancel
        btnCancel.addEventListener('click', () => {
            dialogOverlay.classList.remove('open');
            dialogInput.value = '';
        });

        // Dialog send
        btnSend.addEventListener('click', sendMessage);
        
        dialogInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !isProcessing) {
                sendMessage();
            }
        });

        async function sendMessage() {
            const message = dialogInput.value.trim();
            if (message && !isProcessing) {
                dialogOverlay.classList.remove('open');
                dialogInput.value = '';
                await sendMessageToBackend(message);
            }
        }

        // Close dialog on overlay click
        dialogOverlay.addEventListener('click', (e) => {
            if (e.target === dialogOverlay) {
                dialogOverlay.classList.remove('open');
                dialogInput.value = '';
            }
        });

        // mruganie oczu co 3 sekundy
        setInterval(() => {
            const eyes = document.querySelectorAll('.eye');
            eyes.forEach(eye => {
                eye.classList.add('blinking');
                setTimeout(() => {
                    eye.classList.remove('blinking');
                }, 150);
            });
        }, 3000);

        // Initialize
        initSpeechRecognition();
        updateTexts();

        // Log startup info
        console.log('%c Interactive Kids Character App', 'font-size: 20px; color: #3B82F6;');
        console.log(`%cAPI URL: ${API_BASE_URL}`, 'color: #10B981;');
        console.log('%cSpeech Recognition:', recognition ? ' Supported' : ' Not supported', recognition ? 'color: #10B981;' : 'color: #EF4444;');
        console.log('%cReady to use!', 'color: #8B5CF6; font-weight: bold;');
