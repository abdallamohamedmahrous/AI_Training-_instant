from flask import Flask, render_template, request, jsonify
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, pipeline
import textwrap
import docx
import PyPDF2
import os

app = Flask(__name__)

# تحميل موديل BART للتلخيص
bart_name = "facebook/bart-large-cnn"
bart_tokenizer = AutoTokenizer.from_pretrained(bart_name)
bart_model = AutoModelForSeq2SeqLM.from_pretrained(bart_name)

# تحميل موديل BERT للسؤال والجواب
qa_pipeline = pipeline("question-answering", model="deepset/bert-base-cased-squad2")

def read_file(file_path):
    if file_path.lower().endswith(".txt"):
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    elif file_path.lower().endswith(".docx"):
        doc = docx.Document(file_path)
        return "\n".join([p.text for p in doc.paragraphs if p.text.strip() != ""])
    elif file_path.lower().endswith(".pdf"):
        text = ""
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
        return text
    return ""

def answer_question_over_chunks(question, context, chunk_size=500):
    chunks = textwrap.wrap(context, chunk_size)
    best_answer = {"score": 0, "answer": ""}
    for chunk in chunks:
        try:
            ans = qa_pipeline(question=question, context=chunk)
            if ans["score"] > best_answer["score"]:
                best_answer = ans
        except:
            continue
    return best_answer

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/summarize", methods=["POST"])
def summarize():
    try:
        text_content = ""
        if "text_input" in request.form and request.form["text_input"].strip():
            text_content = request.form["text_input"].strip()
        if "file" in request.files:
            file = request.files["file"]
            if file.filename != "":
                file_path = f"./temp_{file.filename}"
                file.save(file_path)
                try:
                    text_content = read_file(file_path).strip()
                finally:
                    os.remove(file_path)

        if not text_content:
            return jsonify({"summary": "", "text_content": "", "error": "No text or file provided."})

        # تلخيص النص
        inputs = bart_tokenizer(text_content, return_tensors="pt", max_length=1024, truncation=True)
        summary_ids = bart_model.generate(
            inputs["input_ids"],
            max_length=150,
            min_length=40,
            length_penalty=2.0,
            num_beams=4,
            early_stopping=True
        )
        summary = bart_tokenizer.decode(summary_ids[0], skip_special_tokens=True)

        return jsonify({"summary": summary, "text_content": text_content})

    except Exception as e:
        print("Error in summarize:", e)
        return jsonify({"summary": "", "text_content": "", "error": str(e)})

@app.route("/ask", methods=["POST"])
def ask():
    try:
        data = request.get_json()
        question = data.get("question", "").strip()
        text_content = data.get("text", "")
        summary = data.get("summary", "")

        if not question:
            return jsonify({"answer": "", "score": 0, "source": "Error", "error": "No question provided."})

        # الإجابة من summary
        ans_summary = qa_pipeline(question=question, context=summary) if summary else {"score":0,"answer":""}
        # الإجابة من النص الكامل
        ans_full = answer_question_over_chunks(question, text_content) if text_content else {"score":0,"answer":""}

        # اختيار أفضل إجابة
        if ans_summary["score"] > ans_full["score"]:
            best_ans = ans_summary
            source = "📄 from summary"
        else:
            best_ans = ans_full
            source = "📚 from full text"

        return jsonify({"answer": best_ans["answer"], "score": best_ans["score"], "source": source})

    except Exception as e:
        print("Error in ask:", e)
        return jsonify({"answer": "", "score": 0, "source": "Error", "error": str(e)})

if __name__ == "__main__":
    app.run(debug=True)
