
import React, { useRef, useEffect, useState, type CSSProperties } from 'react';
import * as faceapi from 'face-api.js';
import { ArrowDown, CameraOff, Heart, Activity, LoaderCircle } from 'lucide-react';
import Chart from 'chart.js/auto';
import FFT from 'fft.js';

const VIDEO_WIDTH = 520;
const VIDEO_HEIGHT = 400;
const MODEL_URL = '/models';
const DETECTION_INTERVAL = 100;
const HEART_RATE_BUFFER_SIZE = 256;
const SAMPLING_INTERVAL_MS = 50;

// ===================================================================
// THAY THẾ HOÀN TOÀN: Hàm tính BPM bằng thuật toán FFT
// ===================================================================
const calculateBPM_FFT = (data: number[], sampleRate: number): number | null => {
    if (data.length < HEART_RATE_BUFFER_SIZE) {
        return null;
    }

    // Dữ liệu đầu vào của FFT cần được xử lý một chút
    // 1. Loại bỏ thành phần DC (giá trị trung bình) để tín hiệu dao động quanh 0
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const acSignal = data.map(val => val - mean);

    // 2. Khởi tạo FFT
    const f = new FFT(HEART_RATE_BUFFER_SIZE);
    const out = f.createComplexArray();
    f.realTransform(out, acSignal);

    // 3. Tìm tần số có năng lượng cao nhất trong khoảng hợp lệ của nhịp tim
    let maxMagnitude = 0;
    let dominantFrequencyIndex = -1;

    // Khoảng tần số hợp lệ cho nhịp tim người (45 bpm -> 160 bpm)
    // Chuyển đổi sang Hz: (45/60) -> (160/60) Hz  ~= 0.75 Hz -> 2.67 Hz
    const minFreqHz = 0.75;
    const maxFreqHz = 2.67;

    for (let i = 1; i < HEART_RATE_BUFFER_SIZE / 2; i++) {
        const real = out[i * 2];
        const imag = out[i * 2 + 1];
        const magnitude = Math.sqrt(real * real + imag * imag);

        // Tính tần số (Hz) tương ứng với chỉ số i
        const frequency = (i * sampleRate) / HEART_RATE_BUFFER_SIZE;

        // Chỉ xét các tần số trong khoảng hợp lệ
        if (frequency >= minFreqHz && frequency <= maxFreqHz) {
            if (magnitude > maxMagnitude) {
                maxMagnitude = magnitude;
                dominantFrequencyIndex = i;
            }
        }
    }

    if (dominantFrequencyIndex === -1) {
        return null;
    }

    // 4. Chuyển đổi tần số trội sang BPM
    const dominantFrequency = (dominantFrequencyIndex * sampleRate) / HEART_RATE_BUFFER_SIZE;
    const bpm = dominantFrequency * 60;

    return Math.round(bpm);
};


const FaceRecognition: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);

    const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
    const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
    const [loadingText, setLoadingText] = useState<string>('Đang tải mô hình...');
    const [emotion, setEmotion] = useState<string>('Đang phân tích...');
    const [heartRate, setHeartRate] = useState<number | null>(null);

    const heartRateBuffer = useRef<number[]>([]);
    const chartRef = useRef<Chart | null>(null);
    const lastHeartRateTimestamp = useRef<number>(Date.now());
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

    // ... useEffect loadModelsAndChart giữ nguyên ...
    useEffect(() => {
        const loadModelsAndChart = async () => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                setLoadingText('Mô hình đã được tải thành công!');

                if (chartCanvasRef.current) {
                    chartRef.current = new Chart(chartCanvasRef.current, {
                        type: 'line', data: { labels: [], datasets: [{ label: 'Tần số (Red Channel)', data: [], borderColor: 'rgb(255, 99, 132)', borderWidth: 1, fill: false, pointRadius: 0 }] },
                        options: { animation: false, scales: { x: { display: false }, y: { display: true } } }

                    });

                }
            } catch (err) { console.error('Lỗi khi tải mô hình:', err); setLoadingText('Không thể tải mô hình. Vui lòng kiểm tra console.'); }
        };
        loadModelsAndChart();
    }, []);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT } })
            .then((stream: MediaStream) => {
                if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setIsCameraOn(true); }
            })
            .catch((err) => { console.error('Lỗi khi truy cập camera: ', err); setLoadingText('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.'); });
    };

    const stopVideo = () => {
        const video = videoRef.current;
        if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            setIsCameraOn(false);
            if (canvasRef.current) { const context = canvasRef.current.getContext('2d'); context?.clearRect(0, 0, video.width, video.height); }
            if (intervalIdRef.current) { clearInterval(intervalIdRef.current); intervalIdRef.current = null; }
            setHeartRate(null); heartRateBuffer.current = [];
        }
    };

    useEffect(() => {
        const processFrame = async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const hiddenCanvas = hiddenCanvasRef.current;

            if (!video || !canvas || !hiddenCanvas || !modelsLoaded || video.paused || video.ended || video.readyState !== 4) { return; }

            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
            const displaySize = { width: video.width, height: video.height };
            faceapi.matchDimensions(canvas, displaySize);
            faceapi.matchDimensions(hiddenCanvas, displaySize);
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            if (resizedDetections.length > 0) {
                const expressions = resizedDetections[0].expressions;
                const emotionKeys = Object.keys(expressions) as Array<keyof typeof expressions>;
                const topEmotion = emotionKeys.reduce((a, b) => expressions[a] > expressions[b] ? a : b);
                setEmotion(topEmotion);

                const now = Date.now();
                if (now - lastHeartRateTimestamp.current >= SAMPLING_INTERVAL_MS) {
                    const faceBox = resizedDetections[0].detection.box;
                    const hiddenContext = hiddenCanvas.getContext('2d', { willReadFrequently: true });
                    if (hiddenContext) {
                        hiddenContext.drawImage(video, 0, 0, displaySize.width, displaySize.height);
                        const imageData = hiddenContext.getImageData(faceBox.x + faceBox.width * 0.4, faceBox.y + faceBox.height * 0.4, faceBox.width * 0.2, faceBox.height * 0.2);
                        let avgRed = 0;
                        for (let i = 0; i < imageData.data.length; i += 4) { avgRed += imageData.data[i]; }
                        avgRed /= (imageData.data.length / 4);
                        heartRateBuffer.current.push(avgRed);
                        if (heartRateBuffer.current.length > HEART_RATE_BUFFER_SIZE) { heartRateBuffer.current.shift(); }

                        // THAY ĐỔI: Gọi hàm FFT khi buffer đầy
                        if (heartRateBuffer.current.length === HEART_RATE_BUFFER_SIZE) {
                            const sampleRate = 1000 / SAMPLING_INTERVAL_MS; // Tần số lấy mẫu (Hz)
                            const bpm = calculateBPM_FFT(heartRateBuffer.current, sampleRate);
                            if (bpm) {
                                setHeartRate(bpm);
                            }
                        }


                        if (chartRef.current && heartRateBuffer.current.length > 1) {
                            chartRef.current.data.labels = heartRateBuffer.current.map((_, i) => i);
                            chartRef.current.data.datasets[0].data = heartRateBuffer.current;
                            chartRef.current.update('none');
                        }
                    }
                    lastHeartRateTimestamp.current = now;
                }
            } else { setEmotion('Không phát hiện khuôn mặt'); }


            const ctx = canvas.getContext('2d');
            if (!ctx) { return; }
            ctx?.clearRect(0, 0, displaySize.width, displaySize.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
            faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        };

        if (isCameraOn && modelsLoaded) { intervalIdRef.current = setInterval(processFrame, DETECTION_INTERVAL); }
        return () => { if (intervalIdRef.current) { clearInterval(intervalIdRef.current); } };
    }, [isCameraOn, modelsLoaded]);

    const videoContainerStyle: CSSProperties = { position: 'relative', width: VIDEO_WIDTH, height: VIDEO_HEIGHT };

    return (
        <div className="flex flex-col items-center p-4 rounded-lg bg-gradient-to-tl from-purple-600 via-white to-yellow-600 min-h-screen ">
            <h2 className="md:text-5xl bg-clip-text bg-gradient-to-br from-purple-600 to-yellow-600 text-transparent text-2xl font-bold mb-4 roboto-900">Phân tích Sức Khỏe</h2>

            <div className="flex md:flex-row flex-col items-center justify-center w-full">

                <div className="w-full max-w-xl mt-4 p-4  rounded-lg flex flex-col items-center">

                    <div className="w-full bg-black overflow-hidden rounded-lg shadow-lg" style={videoContainerStyle}>
                        <video ref={videoRef} className={`w-full h-full object-cover ${isCameraOn ? 'filter blur-none' : 'filter blur-lg'}`} width={VIDEO_WIDTH} height={VIDEO_HEIGHT} autoPlay muted playsInline />
                        <canvas ref={canvasRef} className="absolute top-0 left-0
                    pointer-events-none
                    filter blur-[3px]
                    opacity-0
                    transition-opacity duration-500
                    ease-in-out
                    hover:opacity-100
                    hover:filter-none
                "></canvas>
                        <canvas ref={hiddenCanvasRef} style={{ display: 'none' }}></canvas>
                        {!isCameraOn && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                <div className="text-center text-white">
                                    {!modelsLoaded ? loadingText : (
                                        <>
                                            <CameraOff className="mx-auto mb-2" size={48} />
                                            <p className="text-lg font-semibold">Camera đang tắt</p>
                                            <p className="text-sm mt-2">Nhấn nút bên dưới để bật camera</p>
                                            <ArrowDown className="mx-auto mt-10 animate-bounce" size={24} />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}


                    </div>
                    <button onClick={isCameraOn ? stopVideo : startVideo} type="button" className="mt-4 px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:bg-gray-400" disabled={!modelsLoaded}>
                        {isCameraOn ? 'Tắt camera' : 'Bật camera'}
                    </button>
                </div>

                <div className="flex flex-col items-center md:w-full">
                    {isCameraOn && (
                        <div className="w-full max-w-3xl mt-4 p-4 bg-white rounded-lg shadow-md">
                            <h3 className="text-xl text-purple-700 font-semibold mb-2">Kết quả phân tích</h3>
                            <div className="flex justify-around items-center">
                                <div className="flex items-center">
                                    <Heart className="text-red-500 mr-2" />
                                    <p className="text-lg">Nhịp tim: <strong>{heartRate ?? <LoaderCircle className="animate-spin" size={16} />}</strong> bpm</p>
                                </div>
                                <div className="flex items-center">
                                    <Activity className="text-green-500 mr-2" />
                                    <p className="text-lg">Cảm xúc: <strong>{emotion}</strong></p>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="w-full max-w-3xl mt-4 p-4 bg-white rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-2 text-purple-700">Biểu đồ tín hiệu nhịp tim</h3>
                        <canvas ref={chartCanvasRef}></canvas>
                        <p className='text-sm text-red-300 mt-2 italic'> * Lưu ý kết quả chỉ mang tính tham khảo</p>
                        <p className='text-sm text-gray-400 mt-2 italic'>Nếu bạn có nhu cầu cần dữ liệu chính xác vui lòng đến bệnh viện gần nhất.</p>
                    </div>
                </div>

            </div>

            {/* Thông tin cơ bản - Dành cho chuẩn đoán toàn diện */}
            <div className="w-full max-w-5xl mt-4 p-4 bg-white rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-2 text-purple-700">Thông tin cơ bản</h2>
                <p className="text-gray-400 italic text-md">Vui lòng điền dẩy đủ bên dưới để có một chuẩn đoán tương đối nhất</p>
            </div>


            <div className="w-full max-w-5xl flex flex-col roboto-700  mt-6 p-4 bg-white rounded-lg shadow-md">
                <label htmlFor="" className="text-xl font-semibold mb-2 text-purple-700">Chỉ số BMI</label>
                <div className="flex items-center md:justify-between  flex-col md:flex-row w-full gap-2">

                    <div className="flex items-center  mt-4 gap-2">
                        <label htmlFor="age">Tuổi</label>
                        <input type="number" id="age" name="age" className="border border-gray-300 rounded-md p-2 w-32 text-center focus:outline-none" placeholder="20" />
                    </div>

                    <div className="flex items-center mt-6 gap-2">
                        <label htmlFor="hight">Chiều cao</label>
                        <input type="number" id="hight" name="hight" className="border border-gray-300 rounded-md p-2 w-32 text-center focus:outline-none" placeholder="cm" />
                    </div>

                    <div className="flex items-center mt-4 gap-2">
                        <label htmlFor="weight">Cân nặng</label>
                        <input type="number" id="weight" name="weight" className="border border-gray-300 rounded-md p-2 w-32 text-center focus:outline-none" placeholder="kg" />
                    </div>

                    <div className="flex items-center mt-4 gap-2">
                        <label htmlFor="bmi">BMI</label>
                        <input type="number" id="bmi" name="bmi" className="border border-gray-300 rounded-md p-2 w-32 text-center focus:outline-none bg-gray-100" placeholder="BMI" disabled />
                        </div>
                </div>



            </div>

            <div className="w-full max-w-5xl mt-4 p-4 bg-white rounded-lg shadow-md">
                <label htmlFor="" className="text-xl font-semibold mb-2 text-purple-700">Tình trạng sức khỏe (Nếu có)</label>
                <textarea className="w-full mt-5  border border-gray-300 rounded-md p-2 focus:outline-none" rows={3} placeholder="Ghi chú về tình trạng sức khỏe của bạn..."></textarea>
            </div>
        </div>
    );
};

export default FaceRecognition;