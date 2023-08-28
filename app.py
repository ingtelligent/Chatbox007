from flask import Flask, render_template, request, jsonify
import os
import openai
import uuid
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer

def open_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as infile:
        return infile.read()

app = Flask(__name__, static_folder="static")

openai.api_key = open_file("openapikey2.txt")

sessions = {}

expertise_classifier = joblib.load('expertise_classifier.pkl')
vectorizer = joblib.load('vectorizer.pkl')

experts = {
    "Design Expert": {
        'role': 'Chuyên gia về thiết kế bài giảng Microlearning',
        'avatar': 'static/expert1.jpg',
        'personas': 'Chuyên gia với kinh nghiệm lâu năm trong lĩnh vực giáo dục, chuyên về phương pháp học Microlearning. Tôi hiểu rõ về cách tạo nội dung hấp dẫn, ngắn gọn, dễ hiểu và dễ nhớ cho học viên.',
        'tasks': ['Thiết kế mục tiêu học tập', 'Tạo ra câu hỏi kiểm tra', 'Phân loại nội dung theo mức độ khó'],
        'prompts': [
            {
                'display': 'Mục tiêu hiệu suất', 
                'full': 'Sau khi hoàn thành khóa học này, {Ai sẽ tham gia chương trình học này?} sẽ có thể {Sau khi hoàn thành chương trình, người học sẽ có thể làm gì? Hãy mô tả cụ thể hành động hoặc kết quả mà bạn kỳ vọng.}. Để đạt được những kết quả này, họ cần phải học và hiểu {Những kỹ năng hoặc kiến thức nào cần được học để đạt được hành động hoặc kết quả mà bạn kỳ vọng?}. Vui lòng xác định mục tiêu hiệu suất theo mức độ của Bloom Taxonomy bao gồm: Người học, Mục tiêu cuối cùng, và Các mục tiêu hỗ trợ. Đồng thời, hãy đặt ra các chỉ số đo lường hiệu suất để đánh giá sự tiến bộ của người học.'
            },
            {
                'display': 'Dàn ý nội dung', 
                'full': 'Dàn ý nội dung bài Microlearning về {Tên chủ đề:}, khóa học được sử dụng {Sử dụng trước/ sau/ độc lập/ hỗ trợ}. Các nội dung này {Nội dung chưa có/ có sẵn} ở hình thức {Hình thức Text/ Infographic/ Video}. Dựa vào mục tiêu hiệu suất đã xác định {Mục tiêu hiệu suất là gì?}. Bạn hãy xác định khóa học này gồm bao nhiêu bài Microlearning và hãy tạo một Dàn ý nội dung gồm: tên bài, mục tiêu, nội dung chính, hoạt động tương tác, đánh giá, tài liệu tham khảo và thời gian phân bổ phù hợp. Ngoài ra, đừng quên xác định các phương pháp và công cụ sẽ được sử dụng để giao tiếp và tương tác với người học.'              
            },
            {
                'display': 'Tạo nội dung cho mỗi chủ đề', 
                'full': 'Tôi cần tạo nội dung microlearning cho chủ đề {Chủ đề}. Nội dung liên quan đến {Nội dung}. Mục tiêu học tập là {Mục tiêu học tập}. Hãy thực hiện các nhiệm vụ sau và sử dụng dấu đầu dòng và in đậm các thuật ngữ quan trọng: : 1. Cung cấp một mô tả ngắn gọn về khóa học từ nội dung. 2. Viết lại mục tiêu bài học theo phương pháp Bloom. 3. Tạo một phương pháp ghi nhớ (mnemonic) liên quan nội dung. Hãy cung cấp một ví dụ cụ thể về mnemonic, và đánh dấu các điểm quan trọng bằng chữ in đậm, dấu đầu dòng. 4. Tạo một kịch bản cho một video dựa trên chủ đề. Kịch bản cần mô tả chi tiết từng cảnh của video, bao gồm hình ảnh, hành động, và lời thoại. Video sẽ có tiêu đề video {Kịch bản video: Tiêu đề}, thời lượng là: {Thời lượng video} và lời kêu gọi hành động {Lời kêu gọi hành động: Có/Không}. 5. Viết một câu chuyện dựa trên nội dung và chủ đề của microlearning. 6. Xây dựng một tình huống dựa trên các tham số sau: Nhân vật chính trong câu chuyện này {Mô tả nhân vật} và bối cảnh diễn ra tình huống {Bối cảnh tình huống}. Mô tả tình huống cụ thể mà nhân vật chính đang đối mặt, và tạo ra một cuộc đối thoại giữa các nhân vật để giải quyết tình huống. Cung cấp 4 lựa chọn cho hành động của nhân vật chính, và phân tích lựa chọn tốt nhất và lý do vì sao nó là lựa chọn tốt nhất. 7. Tạo ra 1 bài đánh giá nhiều lựa chọn để đánh giá mục tiêu học tập của nội dung ở trên, tuân theo các yếu tố sau: câu hỏi, đáp án đúng, 3 đáp án sai, giải thích lý do cho đáp án đúng và sai. 8. Tạo ra 1 bài đánh giá kéo thả để đánh giá mục tiêu học tập của nội dung ở trên. 9. Tạo ra 1 bài đánh giá Đúng hoặc Sai để đánh giá mục tiêu học tập của nội dung ở trên. 10. Tổng kết lại nội dung học tập ở trên'
            },
            {
                'display': 'Khác', 
                'full': 'Đang Phát triển'
            },
        ]
    },
    "Evaluation Expert": {
        'role': 'Chuyên gia về đánh giá bài học Microlearning',
        'avatar': 'static/expert2.jpg',
        'personas': 'Chuyên gia với kinh nghiệm lâu năm trong việc đánh giá và cải thiện chất lượng của bài học Microlearning.',
        'tasks': ['Tạo khảo sát đánh giá bài học', 'Đánh giá chất lượng nội dung bài học', 'Đánh giá hiệu quả của bài học', 'Đề xuất cải thiện bài học'],
        'prompts': [
            {
                'display': 'Khảo sát đánh giá ', 
                'full': 'Tôi muốn tạo ra một khảo sát gửi cho học viên nhằm thu thập phản hồi về hiệu quả của khóa học Microlearning về "{Tên bài học}". Hãy tạo ra khảo sát theo bốn cấp độ Kirkpatrick với {Nội dung khảo sát (Ví dụ: hiệu quả nội dung, ứng dụng thực tế, cấu trúc và độ dài,...)} với số lượng {Số lượng câu hỏi} câu hỏi. Vui lòng đảm bảo rằng các câu hỏi khảo sát tập trung vào cả 4 cấp độ Kirkpatrick: phản hồi của học viên, việc học được kiến thức và kỹ năng mới, việc áp dụng kiến thức và kỹ năng vào thực tế, và những ảnh hưởng lâu dài đối với tổ chức.'
            },
            {
                'display': 'Đánh giá tính đồng nhất nội dung', 
                'full': 'Tôi muốn đánh giá tính đồng nhất bài học Microlearning về {Nội dung cần đánh giá và điều chỉnh}. Hãy cập nhật nội dung tuân theo đồng nhất, trong đó từ đầu tiên của mỗi mục hoặc phần phải là động từ ở quá khứ' 
            },
            {
                'display': 'Kiểm tra lỗi văn bản', 
                'full': 'Tôi muốn cải thiện bài học Microlearning về {Nội dung muốn kiểm tra}. Hãy thực hiện các nhiệm vụ sau: 1. Xác định và làm nổi bật các lỗi ngữ pháp trong nội dung trên. 2. Tìm và sửa tất cả các từ viết sai chính tả và lỗi ngữ pháp. 3. Quét để tìm các từ và cụm từ được lặp lại và diễn đạt lại hoặc thay thế các từ đó để tạo ra một bản văn mượt mà và không bị lặp lại.'
            },
            {
                'display': 'Khác', 
                'full': 'Đang Phát triển'
            },
        ]
    },
    "Communication Expert": {
        'role': 'Chuyên gia về truyền thông',
        'avatar': 'static/expert3.jpg',
        'personas': 'Chuyên gia với kinh nghiệm lâu năm trong việc truyền thông và quảng bá cho các khóa học, đặc biệt là khóa học Microlearning.',
        'tasks': ['Quảng bá bài học Microlearning', 'Tạo ra nội dung quảng cáo hấp dẫn', 'Thực hiện chiến dịch truyền thông hiệu quả'],
        'prompts': [
            {
                'display': 'Tạo bài viết Social Media', 
                'full': 'Tạo một series bài đăng với các định dạng bài đăng (Hình ảnh, Video, Bài viết) trên mạng xã hội về {Chủ Đề} dành cho {Đối Tượng Mục Tiêu}. Bài viết nên có phong cách {Phong cách (Trang trọng, Nhẹ nhàng, Thuyết phục, Chính kiến, Hăng hái, Trang trọng, Hài hước, Cung cấp thông tin, Truyền cảm hứng, Vui vẻ, Đam mê)} và mức độ sáng tạo {Mức Độ Sáng Tạo (Cao, Trung bình, Thấp)}.'
            },
            {
                'display': 'Tạo hình ảnh cho bài học', 
                'full': 'Tôi muốn brainstorm 3 hình ảnh sáng tạo nhất cho hình ảnh minh họa cho bài học Microlearning về {Chủ đề bài học}. Các ý tưởng này nên bao gồm: 1. Đề xuất 3 ý tưởng về hình ảnh để minh họa bài học. 2. Đề xuất các ý tưởng về icon để minh họa các nội dung của bài học. 3. Đề xuất các ý tưởng về hình ảnh liên quan đến bài học'
            },
            {
                'display': 'Xây dựng kế hoạch truyền thông hiệu quả', 
                'full': 'Tôi muốn xây dựng một kế hoạch truyền thông hiệu quả cho bài giảng Microlearning về {Chủ đề bài học}.Hãy tạo ra kế hoạch truyền thông bao gồm 1. Mô tả các bước của hành trình khách hàng (Customer Journey) từ khi nhận biết về khóa học đến khi quyết định tham gia. 2. Kịch bản chi tiết cho việc kể câu chuyện (Storytelling) về lợi ích và giá trị của khóa học. 3. Sử dụng mô hình AIDA (Chú ý, Quan tâm, Mong muốn, Hành động) để xây dựng các thông điệp truyền thông cụ thể.'
            },
            {
                'display': 'Khác', 
                'full': 'Đang Phát triển'
            },
        ]
    },
}


# Define the keywords
keywords = {
    "Design Expert": ["hi", "chào", "giới thiệu", "thiết kế", "cấu trúc", "bài học", "nội dung", "hướng dẫn", "microlearning", "kịch bản", "lời thoại", "video", "bài viết", "cốt chuyện", "mô tả", "mnemonic", "tình huống", "scenario", "case study", "đánh giá", "câu hỏi", "trắc nghiệm"],
    "Evaluation Expert": ["hi", "chào", "giới thiệu", "đánh giá", "xem xét", "phản hồi", "microlearning", 'Kirkpatrick', 'đo lường'],
    "Communication Expert": ["hi", "chào", "giới thiệu", "truyền thông", "quảng cáo", "bài viết", "microlearning", "viết", "marketing", "communication", "thông báo", "email", "nhận thức", "ý tưởng"]
}

# Define the check_keywords function
def check_keywords(expert_id, message):
    return any(keyword in message.lower() for keyword in keywords[expert_id])

# Define the get_filled_in_prompt function
def get_filled_in_prompt(prompt, answers):
    for answer_name, answer_text in answers.items():
        prompt = prompt.replace("{" + answer_name + "}", answer_text)
    return prompt

# Define the classify_expertise function
def classify_expertise(question):
    vectorized_question = vectorizer.transform([question])
    return expertise_classifier.predict(vectorized_question)[0]

@app.route('/')
def home():
    return render_template('index.html', experts=experts)

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    user_message = data['message']
    session_id = data.get('session_id')
    expert_id = data.get('expert_id')

    # Kiểm tra xem chuyên gia đã được chọn hay chưa
    if not expert_id:
        return jsonify(error="Vui lòng chọn một chuyên gia trước khi gửi tin nhắn."), 400

    # Kiểm tra nếu câu hỏi không phù hợp với chuyên môn của chuyên gia
    if not check_keywords(expert_id, user_message):
        return jsonify({'message': 'Xin lỗi, tôi không có chuyên môn để trả lời câu hỏi này.'}), 400

    if (session_id, expert_id) not in sessions:
        session_id = str(uuid.uuid4())
        expert_info = experts.get(expert_id, {})
        expert_introduction = f"You are now chatting with {expert_id}, a {expert_info.get('role', '')}. {expert_info.get('personas', '')}"
        sessions[(session_id, expert_id)] = [
            {"role": "system", "content": expert_introduction}
        ]

    if user_message:
        sessions[(session_id, expert_id)].append({"role": "user", "content": user_message})

    try:
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=sessions[(session_id, expert_id)] 
        )
        chatbot_message = response['choices'][0]['message']['content']

        sessions[(session_id, expert_id)].append({"role": "assistant", "content": chatbot_message})

        return jsonify({'message': chatbot_message, 'session_id': session_id})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/prompts/<expert_id>', methods=['GET'])
def get_prompts(expert_id):
    return jsonify({'prompts': experts.get(expert_id, {}).get('prompts', [])})

@app.route('/api/select_prompt/<expert_id>', methods=['POST'])
def select_prompt(expert_id):
    data = request.get_json()
    prompt = data.get('prompt')
    answers = data.get('answers')

    if prompt is None or answers is None:
        return jsonify({'error': 'Missing prompt or answers'}), 400
    
    expert_info = experts.get(expert_id)
    if expert_info is None:
        return jsonify({'error': 'Invalid expert_id'}), 400
    
    filled_in_prompt = get_filled_in_prompt(prompt, answers)
    return jsonify({'filled_in_prompt': filled_in_prompt})

if __name__ == "__main__":
    app.run(port=8000, debug=True)