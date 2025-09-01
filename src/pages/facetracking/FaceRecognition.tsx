
import React, { useState, useCallback } from 'react';
import axios from 'axios';
import type { BMIInfo } from './BMICalculator';
import HeartRateChart from './HeartRateChart';
import HealthDashboard from './HealthDashboard';
import CameraView from './CameraView';
import BMICalculator from './BMICalculator';

// Sử dụng biến môi trường từ Vite
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
const modelAI = import.meta.env.VITE_MODEL_AI || "google/gemini-pro"; // Mặc định dùng Gemini Pro

const FaceRecognition: React.FC = () => {
    // Trạng thái chung được quản lý bởi component cha
    const [heartRate, setHeartRate] = useState<number | null>(null);
    const [emotion, setEmotion] = useState<string>('Đang phân tích...');
    const [bmiInfo, setBmiInfo] = useState<BMIInfo | null>(null);
    const [healthNotes, setHealthNotes] = useState<string>('');
    const [heartRateBuffer, setHeartRateBuffer] = useState<number[]>([]); // NEW: Trạng thái cho buffer tín hiệu nhịp tim

    const [diagnosis, setDiagnosis] = useState<string>('');
    const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState<boolean>(false);

    // Callback để nhận dữ liệu BMI từ BMICalculator
    const handleBmiChange = useCallback((info: BMIInfo) => {
        setBmiInfo(info);
    }, []);

    // Hàm tạo prompt và gọi API OpenRouter để chuẩn đoán
    const handleDiagnose = async () => {
        if (!heartRate || !bmiInfo?.bmi) {
            alert('Vui lòng đợi có đủ dữ liệu nhịp tim và điền thông tin BMI trước khi chuẩn đoán.');
            return;
        }

        setIsLoadingDiagnosis(true);
        setDiagnosis(''); // Xóa kết quả chẩn đoán cũ

        if (!apiKey) {
            setDiagnosis("Lỗi: Không tìm thấy OpenRouter API Key. Vui lòng kiểm tra lại file .env.local và đảm bảo biến có tiền tố VITE_.");
            setIsLoadingDiagnosis(false);
            return;
        }

        // Xây dựng Prompt chi tiết cho AI
        const prompt = `
            Bạn là một trợ lý sức khỏe AI. Dựa trên các thông tin dưới đây, hãy đưa ra một phân tích và nhận định sơ bộ về tình trạng sức khỏe bằng tiếng Việt.
            LƯU Ý QUAN TRỌNG: Luôn kết thúc câu trả lời bằng lời khuyến cáo rằng "Thông tin này chỉ mang tính tham khảo, không thay thế cho chẩn đoán y tế chuyên nghiệp. Hãy tham khảo ý kiến bác sĩ để có lời khuyên chính xác nhất."

            Dữ liệu bệnh nhân:
            - Tuổi: ${bmiInfo.age || 'Không rõ'}
            - Chỉ số BMI: ${bmiInfo.bmi} (${bmiInfo.classification})
            - Nhịp tim (đo lường tại thời điểm hiện tại): ${heartRate} bpm
            - Cảm xúc (phát hiện qua biểu cảm khuôn mặt): ${emotion}
            - Ghi chú thêm của người dùng: ${healthNotes || 'Không có'}

            Yêu cầu:
            1. Phân tích từng chỉ số (BMI, Nhịp tim) so với mức tiêu chuẩn.
            2. Liên kết các chỉ số với nhau (ví dụ: cảm xúc căng thẳng có thể ảnh hưởng nhịp tim).
            3. Đưa ra một vài gợi ý chung về lối sống (ví dụ: chế độ ăn, vận động) dựa trên dữ liệu.
            4. KHÔNG ĐƯỢC đưa ra chẩn đoán bệnh cụ thể. Chỉ đưa ra nhận định chung.
            5. Nếu thông tin không đủ để đưa ra nhận định, hãy nêu rõ.
        `;

        try {
            // Gọi API OpenRouter trực tiếp từ frontend
            const response = await axios.post(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    model: modelAI, // Sử dụng model đã cấu hình
                    messages: [{ role: "user", content: prompt }],
                },
                {
                    headers: {
                        "Authorization": `Bearer ${apiKey}`, // API Key từ biến môi trường
                        "Content-Type": "application/json",
                    }
                }
            );

            const aiMessage = response.data.choices[0].message.content;
            setDiagnosis(aiMessage);

        } catch (error) {
            console.error("Lỗi khi gọi API OpenRouter:", error);
            setDiagnosis("Đã có lỗi xảy ra trong quá trình phân tích. Vui lòng kiểm tra console để biết thêm chi tiết.");
        } finally {
            setIsLoadingDiagnosis(false);
        }
    };

    return (
        <div className="flex mt-[-5rem] flex-col items-center p-4 rounded-lg bg-gradient-to-tl from-purple-600 via-white to-yellow-600 min-h-screen ">
            <h2 className="md:text-5xl mt-40 bg-clip-text bg-gradient-to-br from-purple-600 to-yellow-600 text-transparent text-2xl font-bold mb-4 roboto-900">AI Phân tích Sức Khỏe Toàn Diện</h2>
            <p className='text-lg font-bold text-gray-400'>Thông số chuẩn đoán AI chỉ mang tính tham khảo, không thay thế cho chản đoán y tế chuyên nghiệp.</p>
            <p className='text-lg mb-10 font-bold text-gray-400'>Hãy tham khảo ý kiến bác sĩ để có lời khuyên chính xác nhất.</p>
            {/* Phần trên cùng: Camera (trái) và Biểu đồ + Kết quả phân tích (phải) */}
            <div className="relative flex flex-col md:flex-row items-start md:justify-center w-full max-w-7xl gap-4 mb-4">
                {/* Cột Trái: Camera View */}
                <CameraView
                    onHeartRateUpdate={setHeartRate}
                    onEmotionUpdate={setEmotion}
                    onHeartRateBufferUpdate={setHeartRateBuffer} // Gửi hàm set buffer xuống CameraView
                    currentHeartRateBuffer={heartRateBuffer} // Gửi buffer hiện tại xuống CameraView
                />



            </div>
            <HeartRateChart heartRateBuffer={heartRateBuffer} />

            {/* Phần "Thông tin cơ bản" */}
            <div className="w-full max-w-5xl mt-4 p-4 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-2 text-purple-700">Thông tin cơ bản</h2>
                <p className="text-gray-400 italic text-md">Vui lòng điền đầy đủ bên dưới để có một chuẩn đoán tương đối nhất</p>
            </div>

            <BMICalculator onBmiChange={handleBmiChange} />

            {/* Phần "Tình trạng sức khỏe" */}
            <div className="w-full max-w-5xl mt-4 p-4 bg-white rounded-lg shadow-md">
                <label htmlFor="healthNotes" className="text-xl font-semibold mb-2 text-purple-700">Tình trạng sức khỏe</label>
                <div className="text-gray-600 text-md mt-2 leading-7">
                    <p>Điền đầy đủ thông tin về thói quen sinh hoạt như: </p>
                    <p>(1) Thói quen sinh hoạt</p>
                    <p>(2) Các bệnh nền</p>
                    <p>(3) Triệu chứng gần đây (nếu có)</p>
                    <p className='italic text-red-400'> Cung cấp càng nhiều thông tin thì kết quả sẽ chính xác hơn.</p>
                </div>

                <textarea
                    id="healthNotes"
                    className="w-full mt-5 border border-gray-300 rounded-md p-2 focus:outline-none"
                    rows={3}
                    placeholder="Ghi chú về các bệnh nền, triệu chứng gần đây hoặc thói quen sinh hoạt..."
                    value={healthNotes}
                    onChange={(e) => setHealthNotes(e.target.value)}
                ></textarea>
            </div>

            {/* Nút Chuẩn đoán */}
            <div className="w-full max-w-5xl mt-6">
                <button
                    onClick={handleDiagnose}
                    disabled={isLoadingDiagnosis || !heartRate || !bmiInfo?.bmi}
                    className="w-full py-3 px-6 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    {isLoadingDiagnosis ? 'Đang Phân Tích...' : 'Thực Hiện Chuẩn Đoán Sức Khỏe'}
                </button>
            </div>

            {/* Cột Phải: Biểu đồ tín hiệu nhịp tim và Bảng điều khiển sức khỏe */}
            <div className="flex flex-col mt-10 items-center md:w-full max-w-5xl gap-4">

                <HealthDashboard
                    heartRate={heartRate}
                    emotion={emotion}
                    diagnosis={diagnosis}
                    isLoadingDiagnosis={isLoadingDiagnosis}
                />
            </div>
        </div>
    );
};

export default FaceRecognition;