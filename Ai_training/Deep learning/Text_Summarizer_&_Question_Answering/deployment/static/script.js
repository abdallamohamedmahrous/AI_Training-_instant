let currentText = '';
let currentSummary = '';

// --- تحديث currentText مباشرة عند الكتابة في textarea ---
document.addEventListener('DOMContentLoaded', () => {
    const textArea = document.getElementById('textInput');
    if (textArea) {
        textArea.addEventListener('input', (e) => {
            currentText = e.target.value;
        });
    }
});

// --- تبديل التبويبات ---
function switchTab(tabName, event) {
    // إزالة الكلاس "active" من جميع المحتويات
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // إزالة الكلاس "active" من جميع أزرار التبويب
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => btn.classList.remove('active'));

    // تفعيل التبويب المختار وزرّه
    document.getElementById(tabName + '-tab').classList.add('active');
    event.currentTarget.classList.add('active');
}

// --- التعامل مع رفع الملفات ---
function handleFile(event) {
    const file = event.target.files[0];
    if (file) {
        const fileInfo = document.getElementById('fileInfo');
        document.getElementById('fileName').textContent = file.name;
        document.getElementById('fileSize').textContent = formatFileSize(file.size);
        fileInfo.classList.add('active');

        if (file.name.endsWith('.txt')) {
            const reader = new FileReader();
            reader.onload = function(e) { currentText = e.target.result; };
            reader.readAsText(file);
        } else {
            currentText = ''; // PDF/DOCX سيتم رفعه للـ Flask
        }
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes)/Math.log(k));
    return parseFloat((bytes/Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i];
}

// --- توليد التلخيص من Flask ---
function generateSummary() {
    const textInput = currentText.trim();
    const fileInput = document.getElementById('fileInput').files[0];
    const formData = new FormData();

    if (fileInput) {
        formData.append('file', fileInput);
    } else if (textInput) {
        formData.append('text_input', textInput);
    } else {
        return alert('Please provide text or upload a file.');
    }

    document.getElementById('loading').style.display = 'block';
    document.getElementById('summaryResult').classList.remove('active');

    fetch('/summarize', { method: 'POST', body: formData })
    .then(res => res.json())
    .then(data => {
        if (data.error) return alert('Error: ' + data.error);
        currentSummary = data.summary || "";
        if (data.text_content) currentText = data.text_content;
        document.getElementById('summaryContent').textContent = currentSummary || "No summary generated.";
        document.getElementById('summaryResult').classList.add('active');
        document.getElementById('loading').style.display = 'none';
    })
    .catch(err => {
        console.error(err);
        alert('Error generating summary.');
        document.getElementById('loading').style.display = 'none';
    });
}

// --- طرح السؤال للـ Flask ---
function askQuestion() {
    const question = document.getElementById('questionInput').value.trim();
    if (!question) return alert('Please enter a question');
    if (!currentText) return alert('Please provide text first.');

    fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question, text: currentText, summary: currentSummary })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) alert('Error: ' + data.error);
        else displayQA(question, data);
        document.getElementById('questionInput').value = '';
    })
    .catch(err => { console.error(err); alert('Error getting answer.'); });
}

// --- عرض السؤال والإجابة ---
function displayQA(question, answerObj) {
    const qaHistory = document.getElementById('qaHistory');
    const qaItem = document.createElement('div');
    qaItem.className = 'qa-item';
    qaItem.style.animation = 'slideInRight 0.6s ease';
    qaItem.innerHTML = `
        <div class="question">❓ ${question}</div>
        <div class="answer">💬 ${answerObj.answer}</div>
        <div class="score">📊 Confidence: ${(answerObj.score*100).toFixed(1)}% - ${answerObj.source}</div>
    `;
    qaHistory.insertBefore(qaItem, qaHistory.firstChild);
}

// --- مسح كل البيانات ---
function clearAll() {
    currentText = '';
    currentSummary = '';
    document.getElementById('textInput').value = '';
    document.getElementById('fileInput').value = '';
    document.getElementById('fileInfo').classList.remove('active');
    document.getElementById('summaryResult').classList.remove('active');
    document.getElementById('qaHistory').innerHTML = '';
    document.getElementById('questionInput').value = '';
}

// --- التعامل مع ضغط Enter في مربع السؤال ---
function handleEnter(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        askQuestion();
    }
}
