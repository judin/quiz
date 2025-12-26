// QuizMaster AI - Main Application with OpenAI Integration

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            document.getElementById('audio-unlock').style.display = 'none';
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    play(type) {
        if (!this.initialized || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        const now = this.audioContext.currentTime;

        switch (type) {
            case 'correct':
                oscillator.frequency.setValueAtTime(523.25, now);
                oscillator.frequency.setValueAtTime(659.25, now + 0.1);
                oscillator.frequency.setValueAtTime(783.99, now + 0.2);
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
                oscillator.start(now);
                oscillator.stop(now + 0.4);
                break;

            case 'wrong':
                oscillator.frequency.setValueAtTime(200, now);
                oscillator.frequency.setValueAtTime(150, now + 0.15);
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;

            case 'tick':
                oscillator.frequency.setValueAtTime(800, now);
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                oscillator.start(now);
                oscillator.stop(now + 0.05);
                break;

            case 'beep':
                oscillator.frequency.setValueAtTime(880, now);
                oscillator.type = 'square';
                gainNode.gain.setValueAtTime(0.2, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
                oscillator.start(now);
                oscillator.stop(now + 0.15);
                break;

            case 'timeout':
                oscillator.frequency.setValueAtTime(300, now);
                oscillator.frequency.linearRampToValueAtTime(100, now + 0.5);
                oscillator.type = 'sawtooth';
                gainNode.gain.setValueAtTime(0.3, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                oscillator.start(now);
                oscillator.stop(now + 0.5);
                break;

            case 'click':
                oscillator.frequency.setValueAtTime(600, now);
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.15, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
                oscillator.start(now);
                oscillator.stop(now + 0.05);
                break;

            case 'success':
                [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
                    const osc = this.audioContext.createOscillator();
                    const gain = this.audioContext.createGain();
                    osc.connect(gain);
                    gain.connect(this.audioContext.destination);
                    osc.frequency.setValueAtTime(freq, now + i * 0.1);
                    gain.gain.setValueAtTime(0.2, now + i * 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
                    osc.start(now + i * 0.1);
                    osc.stop(now + i * 0.1 + 0.2);
                });
                break;
        }
    }

    vibrate(pattern) {
        if ('vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
}

class OpenAIService {
    constructor() {
        this.apiKey = localStorage.getItem('quizmaster_openai_key') || '';
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('quizmaster_openai_key', key);
    }

    hasApiKey() {
        return this.apiKey && this.apiKey.length > 0;
    }

    async generateTopics(subject) {
        const prompt = `Given the subject "${subject}", suggest exactly 3 specific quiz topics.
Return a JSON array with exactly 3 objects, each having "name" and "desc" properties.
The "name" should be a specific topic (2-4 words), and "desc" should be a brief description (5-10 words).
Only return the JSON array, no other text.

Example format:
[{"name": "Topic Name", "desc": "Brief description of the topic"}]`;

        const response = await this.callOpenAI(prompt);
        try {
            const parsed = JSON.parse(response);
            return parsed;
        } catch (e) {
            console.error('Failed to parse topics:', e);
            return [
                { name: subject + ' Basics', desc: 'Fundamental concepts and ideas' },
                { name: subject + ' History', desc: 'Historical facts and events' },
                { name: subject + ' Fun Facts', desc: 'Interesting trivia and discoveries' }
            ];
        }
    }

    async generateQuestions(topic, difficulty) {
        const difficultyDesc = {
            easy: 'straightforward questions suitable for beginners',
            medium: 'moderately challenging questions for general knowledge',
            hard: 'difficult questions that test deep knowledge'
        };

        const prompt = `Create exactly 10 ${difficultyDesc[difficulty]} about "${topic}".

Return a JSON array with exactly 10 question objects. Each object must have:
- "question": the question text (clear and concise)
- "options": array of exactly 3 possible answers
- "correct": the correct answer (must match one of the options exactly)

Make sure:
1. Questions are factually accurate
2. Each question has exactly 3 options
3. Only one option is correct
4. Options are plausible but distinguishable
5. Questions cover different aspects of the topic

Only return the JSON array, no other text.`;

        const response = await this.callOpenAI(prompt);
        try {
            const parsed = JSON.parse(response);
            // Validate and shuffle options
            return parsed.map(q => ({
                question: q.question,
                options: q.options.sort(() => Math.random() - 0.5),
                correct: q.correct
            }));
        } catch (e) {
            console.error('Failed to parse questions:', e);
            throw new Error('Failed to generate questions. Please try again.');
        }
    }

    async callOpenAI(prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a quiz question generator. Always respond with valid JSON only, no markdown or extra text.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            const error = await response.json();
            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your OpenAI API key.');
            }
            throw new Error(error.error?.message || 'API request failed');
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }
}

class QuizApp {
    constructor() {
        this.sound = new SoundManager();
        this.openai = new OpenAIService();
        this.currentScreen = 'apikey-screen';
        this.selectedTopic = null;
        this.selectedDifficulty = 'medium';
        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.correctAnswers = 0;
        this.totalTime = 0;
        this.questionTimes = [];
        this.timer = null;
        this.timeLeft = 15;
        this.highScore = parseInt(localStorage.getItem('quizmaster_highscore')) || 0;
        this.lastSubject = '';

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateHighScoreDisplay();
        this.checkAudioContext();

        // Check if API key exists
        if (this.openai.hasApiKey()) {
            this.showScreen('splash-screen');
        }

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(reg => console.log('Service Worker registered'))
                .catch(err => console.warn('Service Worker registration failed:', err));
        }
    }

    checkAudioContext() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        if (isIOS) {
            document.getElementById('audio-unlock').style.display = 'block';
        }
    }

    bindEvents() {
        // Audio unlock
        document.getElementById('unlock-audio-btn')?.addEventListener('click', () => {
            this.sound.init();
        });

        // API Key screen
        document.getElementById('save-apikey-btn').addEventListener('click', () => {
            this.saveApiKey();
        });

        document.getElementById('apikey-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveApiKey();
            }
        });

        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.sound.play('click');
            document.getElementById('apikey-input').value = '';
            this.showScreen('apikey-screen');
        });

        // Splash screen
        document.getElementById('start-btn').addEventListener('click', () => {
            this.sound.init();
            this.sound.play('click');
            this.showScreen('subject-screen');
        });

        // Subject screen
        document.getElementById('back-to-splash').addEventListener('click', () => {
            this.sound.play('click');
            this.showScreen('splash-screen');
        });

        document.getElementById('generate-topics-btn').addEventListener('click', () => {
            this.generateTopics();
        });

        document.getElementById('subject-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.generateTopics();
            }
        });

        document.getElementById('refresh-topics-btn').addEventListener('click', () => {
            this.generateTopics();
        });

        // Difficulty buttons
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.sound.play('click');
                document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedDifficulty = btn.dataset.difficulty;
            });
        });

        // Results screen
        document.getElementById('play-again-btn').addEventListener('click', () => {
            this.sound.play('click');
            this.startQuiz(this.selectedTopic);
        });

        document.getElementById('new-topic-btn').addEventListener('click', () => {
            this.sound.play('click');
            this.showScreen('subject-screen');
        });

        document.getElementById('share-btn').addEventListener('click', () => {
            this.shareScore();
        });

        // Touch events for body to init audio
        document.body.addEventListener('touchstart', () => {
            this.sound.init();
        }, { once: true });
    }

    saveApiKey() {
        const input = document.getElementById('apikey-input');
        const key = input.value.trim();

        if (!key) {
            alert('Please enter your OpenAI API key');
            return;
        }

        if (!key.startsWith('sk-')) {
            alert('Invalid API key format. OpenAI keys start with "sk-"');
            return;
        }

        this.openai.setApiKey(key);
        this.sound.init();
        this.sound.play('click');
        this.showScreen('splash-screen');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }

    async generateTopics() {
        const input = document.getElementById('subject-input').value.trim();
        if (!input) {
            alert('Please enter a subject to generate topics');
            return;
        }

        this.lastSubject = input;
        this.sound.play('click');

        const refreshBtn = document.getElementById('refresh-topics-btn');
        const generateBtn = document.getElementById('generate-topics-btn');
        refreshBtn.classList.add('spinning');
        generateBtn.disabled = true;

        const container = document.getElementById('topics-container');
        container.innerHTML = '<div class="topic-placeholder"><p>Generating topics with AI...</p></div>';

        try {
            const topics = await this.openai.generateTopics(input);
            this.showTopics(topics);
        } catch (error) {
            console.error('Error generating topics:', error);
            container.innerHTML = `<div class="topic-placeholder"><p>Error: ${error.message}</p></div>`;

            if (error.message.includes('API key')) {
                setTimeout(() => this.showScreen('apikey-screen'), 2000);
            }
        } finally {
            refreshBtn.classList.remove('spinning');
            generateBtn.disabled = false;
        }
    }

    showTopics(topics) {
        const container = document.getElementById('topics-container');
        container.innerHTML = topics.map((topic, index) => `
            <div class="topic-card" data-topic="${topic.name}" data-index="${index}">
                <h4>${topic.name}</h4>
                <p>${topic.desc}</p>
            </div>
        `).join('');

        container.querySelectorAll('.topic-card').forEach(card => {
            card.addEventListener('click', () => {
                this.sound.play('click');
                container.querySelectorAll('.topic-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                setTimeout(() => {
                    this.startQuiz(card.dataset.topic);
                }, 300);
            });
        });
    }

    async startQuiz(topic) {
        this.selectedTopic = topic;
        this.showScreen('loading-screen');
        document.getElementById('loading-topic').textContent = topic;

        // Reset state
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.streak = 0;
        this.bestStreak = 0;
        this.correctAnswers = 0;
        this.questionTimes = [];

        try {
            this.questions = await this.openai.generateQuestions(topic, this.selectedDifficulty);
            this.showScreen('quiz-screen');
            this.displayQuestion();
        } catch (error) {
            console.error('Error fetching questions:', error);
            alert(error.message || 'Failed to load questions. Please try again.');
            this.showScreen('subject-screen');
        }
    }

    displayQuestion() {
        const question = this.questions[this.currentQuestionIndex];

        document.getElementById('current-question').textContent = this.currentQuestionIndex + 1;
        document.getElementById('progress-fill').style.width = `${((this.currentQuestionIndex + 1) / 10) * 100}%`;
        document.getElementById('current-score').textContent = this.score;
        document.getElementById('question-text').textContent = question.question;

        const optionsContainer = document.getElementById('options-container');
        const letters = ['A', 'B', 'C'];

        optionsContainer.innerHTML = question.options.map((option, index) => `
            <button class="option-btn" data-option="${option}">
                <span class="option-letter">${letters[index]}</span>
                <span class="option-text">${option}</span>
            </button>
        `).join('');

        optionsContainer.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => this.selectAnswer(btn));
        });

        this.updateStreakIndicator();
        this.startTimer();
    }

    startTimer() {
        this.timeLeft = 15;
        this.questionStartTime = Date.now();
        this.updateTimerDisplay();

        const circumference = 2 * Math.PI * 45;
        const timerProgress = document.getElementById('timer-progress');
        timerProgress.style.strokeDasharray = circumference;
        timerProgress.style.strokeDashoffset = 0;
        timerProgress.classList.remove('warning', 'danger');

        clearInterval(this.timer);
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();

            const offset = circumference * (1 - this.timeLeft / 15);
            timerProgress.style.strokeDashoffset = offset;

            if (this.timeLeft <= 5) {
                timerProgress.classList.add('warning');
            }

            if (this.timeLeft <= 3) {
                timerProgress.classList.remove('warning');
                timerProgress.classList.add('danger');
                this.sound.play('beep');
                document.getElementById('timer-text').classList.add('shake');
                setTimeout(() => {
                    document.getElementById('timer-text').classList.remove('shake');
                }, 200);
            }

            if (this.timeLeft <= 0) {
                this.timeUp();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        document.getElementById('timer-text').textContent = this.timeLeft;
    }

    selectAnswer(selectedBtn) {
        clearInterval(this.timer);

        const timeTaken = (Date.now() - this.questionStartTime) / 1000;
        this.questionTimes.push(timeTaken);

        const question = this.questions[this.currentQuestionIndex];
        const selectedAnswer = selectedBtn.dataset.option;
        const isCorrect = selectedAnswer === question.correct;

        // Disable all buttons
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
        });

        if (isCorrect) {
            selectedBtn.classList.add('correct');
            this.sound.play('correct');
            this.sound.vibrate(50);

            // Calculate points (more points for faster answers)
            const timeBonus = Math.floor(this.timeLeft * 5);
            const streakBonus = this.streak * 10;
            const basePoints = 50;
            const pointsEarned = basePoints + timeBonus + streakBonus;

            this.score += pointsEarned;
            this.correctAnswers++;
            this.streak++;
            this.bestStreak = Math.max(this.bestStreak, this.streak);

            this.animateScore(pointsEarned);
        } else {
            selectedBtn.classList.add('wrong');
            this.sound.play('wrong');
            this.sound.vibrate([100, 50, 100]);
            this.streak = 0;

            // Show correct answer
            document.querySelectorAll('.option-btn').forEach(btn => {
                if (btn.dataset.option === question.correct) {
                    btn.classList.add('reveal-correct');
                }
            });
        }

        this.updateStreakIndicator();

        setTimeout(() => {
            this.nextQuestion();
        }, 1500);
    }

    timeUp() {
        clearInterval(this.timer);
        this.sound.play('timeout');
        this.sound.vibrate([200, 100, 200]);

        const question = this.questions[this.currentQuestionIndex];
        this.questionTimes.push(15);
        this.streak = 0;

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.option === question.correct) {
                btn.classList.add('reveal-correct');
            }
        });

        this.updateStreakIndicator();

        setTimeout(() => {
            this.nextQuestion();
        }, 1500);
    }

    animateScore(points) {
        const scoreEl = document.getElementById('current-score');
        scoreEl.style.transform = 'scale(1.3)';
        scoreEl.textContent = this.score;

        setTimeout(() => {
            scoreEl.style.transform = 'scale(1)';
        }, 200);
    }

    updateStreakIndicator() {
        const indicator = document.getElementById('streak-indicator');
        const count = document.getElementById('streak-count');

        if (this.streak >= 2) {
            count.textContent = this.streak;
            indicator.classList.add('visible');
        } else {
            indicator.classList.remove('visible');
        }
    }

    nextQuestion() {
        this.currentQuestionIndex++;

        if (this.currentQuestionIndex >= 10) {
            this.endQuiz();
        } else {
            this.displayQuestion();
        }
    }

    endQuiz() {
        clearInterval(this.timer);

        // Check for high score
        const isNewHighScore = this.score > this.highScore;
        if (isNewHighScore) {
            this.highScore = this.score;
            localStorage.setItem('quizmaster_highscore', this.highScore);
        }

        // Calculate stats
        const accuracy = Math.round((this.correctAnswers / 10) * 100);
        const avgTime = (this.questionTimes.reduce((a, b) => a + b, 0) / this.questionTimes.length).toFixed(1);

        // Determine result emoji and message
        let emoji, message;
        if (accuracy >= 90) {
            emoji = '🏆';
            message = 'Outstanding!';
        } else if (accuracy >= 70) {
            emoji = '🎉';
            message = 'Great Job!';
        } else if (accuracy >= 50) {
            emoji = '👍';
            message = 'Good Effort!';
        } else {
            emoji = '💪';
            message = 'Keep Practicing!';
        }

        // Update UI
        document.getElementById('results-emoji').textContent = emoji;
        document.getElementById('results-title').textContent = message;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('correct-count').textContent = `${this.correctAnswers}/10`;
        document.getElementById('accuracy-percent').textContent = `${accuracy}%`;
        document.getElementById('best-streak').textContent = this.bestStreak;
        document.getElementById('avg-time').textContent = `${avgTime}s`;

        if (isNewHighScore) {
            document.getElementById('new-high-score').style.display = 'block';
            this.sound.play('success');
        } else {
            document.getElementById('new-high-score').style.display = 'none';
        }

        this.updateHighScoreDisplay();
        this.showScreen('results-screen');

        if (accuracy >= 70) {
            this.createConfetti();
        }
    }

    createConfetti() {
        const container = document.getElementById('confetti-container');
        container.innerHTML = '';

        const colors = ['#667eea', '#764ba2', '#48bb78', '#ed8936', '#f56565', '#ffd700'];

        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
            container.appendChild(confetti);
        }
    }

    updateHighScoreDisplay() {
        document.getElementById('high-score').textContent = this.highScore;
    }

    async shareScore() {
        const shareData = {
            title: 'QuizMaster AI',
            text: `I scored ${this.score} points on "${this.selectedTopic}" in QuizMaster AI! 🧠 Can you beat my score?`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.text + ' ' + shareData.url);
                alert('Score copied to clipboard!');
            }
            this.sound.play('click');
        } catch (err) {
            console.log('Share failed:', err);
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.quizApp = new QuizApp();
});
