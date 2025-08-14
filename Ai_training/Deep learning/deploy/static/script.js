function fillExample(element) {
    document.getElementById('textInput').value = element.textContent.trim().replace(/"/g, '');
}

function toggleDebug() {
    const debugInfo = document.getElementById('debugInfo');
    debugInfo.style.display = debugInfo.style.display === 'none' ? 'block' : 'none';
}

async function analyzeSentiment() {
    const textInput = document.getElementById('textInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const btnText = document.getElementById('btnText');
    const loadingSpinner = document.getElementById('loadingSpinner');
    const resultSection = document.getElementById('resultSection');
    const debugContent = document.getElementById('debugContent');

    const text = textInput.value.trim();

    if (!text) { alert('الرجاء إدخال نص للتحليل'); return; }

    analyzeBtn.classList.add('loading');
    loadingSpinner.style.display = 'inline-block';
    btnText.textContent = 'جاري التحليل...';
    resultSection.style.display = 'none';

    debugContent.innerHTML = `
        <p><strong>النص المرسل:</strong> "${text}"</p>
        <p><strong>طول النص:</strong> ${text.length} حرف</p>
        <p><strong>وقت الإرسال:</strong> ${new Date().toLocaleString()}</p>
    `;

    try {
        const response = await fetch('/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }

        const result = await response.json();

        debugContent.innerHTML += `<p><strong>الاستجابة:</strong> ${JSON.stringify(result, null, 2)}</p>`;

        displayResult(result);

    } catch (error) {
        alert(`حدث خطأ في التحليل: ${error.message}`);
        debugContent.innerHTML += `<p style="color: red;"><strong>خطأ:</strong> ${error.message}</p>`;
    } finally {
        analyzeBtn.classList.remove('loading');
        loadingSpinner.style.display = 'none';
        btnText.textContent = 'تحليل المشاعر';
    }
}

function displayResult(result) {
    const resultSection = document.getElementById('resultSection');
    const sentimentResult = document.getElementById('sentimentResult');
    const confidenceSection = document.getElementById('confidenceSection');

    const sentimentLabels = { 'positive': 'Positive', 'negative': 'Negative', 'neutral': 'Neutral' };


    sentimentResult.textContent = sentimentLabels[result.sentiment];
    sentimentResult.className = `sentiment-result sentiment-${result.sentiment}`;

    confidenceSection.innerHTML = '';

    const sortedConfidence = Object.entries(result.confidence).sort(([,a], [,b]) => b - a);

    sortedConfidence.forEach(([sentiment, confidence]) => {
        const percentage = Math.round(confidence * 100);
        const confidenceItem = document.createElement('div');
        confidenceItem.className = 'confidence-item';
        confidenceItem.innerHTML = `
            <div class="confidence-label">${sentimentLabels[sentiment]}</div>
            <div class="confidence-bar">
                <div class="confidence-fill confidence-${sentiment}" style="width: 0%"></div>
            </div>
            <div class="confidence-percentage">${percentage}%</div>
        `;
        confidenceSection.appendChild(confidenceItem);

        setTimeout(() => {
            const fillBar = confidenceItem.querySelector('.confidence-fill');
            fillBar.style.width = `${percentage}%`;
        }, 100);
    });

    resultSection.style.display = 'block';
}

document.getElementById('analyzeBtn').addEventListener('click', analyzeSentiment);

document.getElementById('textInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        analyzeSentiment();
    }
});

window.addEventListener('load', async function() {
    try {
        const response = await fetch('/test');
        const testResults = await response.json();
        console.log('Test results:', testResults);
    } catch (error) {
        console.log('Test endpoint not available:', error);
    }
});
