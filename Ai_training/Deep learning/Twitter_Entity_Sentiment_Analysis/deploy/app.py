from flask import Flask, render_template, request, jsonify
import pickle
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.sequence import pad_sequences

app = Flask(__name__)

# ---------------- تحميل الموديل والتوكنيزر ----------------
model = load_model("sentiment_analysis_model.h5")
with open("tokenizer.pkl", "rb") as f:
    tokenizer = pickle.load(f)

max_len = 80  # تأكد أنه نفس الطول المستخدم أثناء التدريب

# ترتيب التسميات حسب الموديل الفعلي (تحقق من التدريب)
sentiment_labels = ["negative","positive","neutral"]

# ---------------- صفحة رئيسية ----------------
@app.route("/")
def index():
    return render_template("index.html")

# ---------------- API لتحليل المشاعر ----------------
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    text = data.get("text", "")
    if not text:
        return jsonify({"error": "No text provided"}), 400

    # تحويل النص إلى تسلسل
    seq = tokenizer.texts_to_sequences([text])
    padded = pad_sequences(seq, maxlen=max_len, padding='post')

    # التنبؤ
    pred = model.predict(padded)[0]  # softmax output
    print("Raw prediction:", pred)   # Debug: اطبع القيم الحقيقية

    # بناء dictionary بالاحتمالات لكل فئة
    confidence = {label: float(pred[i]) for i, label in enumerate(sentiment_labels)}

    # اختيار الفئة الأعلى
    sentiment = max(confidence, key=confidence.get)

    # طباعة النتائج للـ debug
    print(f"Text: {text}")
    print(f"Predicted sentiment: {sentiment}")
    print(f"Confidence: {confidence}")

    return jsonify({
        "sentiment": sentiment,
        "confidence": confidence
    })

# ---------------- اختبار endpoint ----------------
@app.route("/test")
def test():
    return jsonify({"status": "ok", "message": "Test endpoint working"})

# ---------------- تشغيل السيرفر ----------------
if __name__ == "__main__":
    app.run(debug=True)
