
import React, { useRef, useEffect, useState, type CSSProperties } from 'react';
import * as faceapi from 'face-api.js';
import { ArrowDown, Camera, CameraOff, LoaderCircle } from 'lucide-react';
// ===================================================================
// Các hằng số cấu hình
// ===================================================================
const VIDEO_WIDTH = 520;
const VIDEO_HEIGHT = 400;
const MODEL_URL = '/models'; // Đảm bảo thư mục models được phục vụ tĩnh
const DETECTION_INTERVAL = 100; // Xử lý 10 khung hình/giây
const HEART_RATE_BUFFER_SIZE = 256; // Kích thước buffer cho FFT, cần là lũy thừa của 2
const SAMPLING_INTERVAL_MS = 50; // Lấy mẫu 20 lần/giây (1000ms / 50ms)

// ===================================================================
// Hàm tính BPM bằng thuật toán FFT (có thể để ở đây hoặc chuyển ra file utils riêng)
// ===================================================================
// Import FFT ở đây nếu bạn muốn nó là internal của CameraView và không cần dùng ở ngoài
import FFT from 'fft.js'; 

const calculateBPM_FFT = (data: number[], sampleRate: number): number | null => {
    if (data.length < HEART_RATE_BUFFER_SIZE) {
        return null;
    }
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const acSignal = data.map(val => val - mean);

    const f = new FFT(HEART_RATE_BUFFER_SIZE);
    const out = f.createComplexArray();
    f.realTransform(out, acSignal);

    let maxMagnitude = 0;
    let dominantFrequencyIndex = -1;
    // Khoảng tần số hợp lệ cho nhịp tim người (45 bpm -> 160 bpm)
    const minFreqHz = 0.75; // 45 BPM / 60s
    const maxFreqHz = 2.67; // 160 BPM / 60s

    for (let i = 1; i < HEART_RATE_BUFFER_SIZE / 2; i++) {
        const real = out[i * 2];
        const imag = out[i * 2 + 1];
        const magnitude = Math.sqrt(real * real + imag * imag);
        const frequency = (i * sampleRate) / HEART_RATE_BUFFER_SIZE;

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

    const dominantFrequency = (dominantFrequencyIndex * sampleRate) / HEART_RATE_BUFFER_SIZE;
    const bpm = dominantFrequency * 60;

    return Math.round(bpm);
};

// ===================================================================
// Props Interface: Định nghĩa các hàm callback để giao tiếp với component cha
// ===================================================================
interface CameraViewProps {
    onHeartRateUpdate: (rate: number | null) => void;
    onEmotionUpdate: (emotion: string) => void;
    onHeartRateBufferUpdate: (buffer: number[]) => void; // Gửi buffer tín hiệu lên cha
    currentHeartRateBuffer: number[]; // Nhận buffer hiện tại từ cha để cập nhật
}

// ===================================================================
// Component CameraView
// ===================================================================
const CameraView: React.FC<CameraViewProps> = ({ onHeartRateUpdate, onEmotionUpdate, onHeartRateBufferUpdate, currentHeartRateBuffer }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hiddenCanvasRef = useRef<HTMLCanvasElement>(null); // Dùng để đọc pixel ẩn

    const [modelsLoaded, setModelsLoaded] = useState<boolean>(false);
    const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
    const [loadingText, setLoadingText] = useState<string>('Đang tải mô hình...');

    const lastHeartRateTimestamp = useRef<number>(Date.now());
    const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

    // Tải mô hình khi component được mount
    useEffect(() => {
        const loadModels = async () => {
            try {
                setLoadingText('Đang tải mô hình nhận diện...');
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
                ]);
                setModelsLoaded(true);
                setLoadingText('Mô hình đã tải xong!');
            } catch (err) {
                console.error('Lỗi khi tải mô hình face-api:', err);
                setLoadingText('Không thể tải mô hình. Vui lòng kiểm tra console.');
            }
        };
        loadModels();
    }, []);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: { width: VIDEO_WIDTH, height: VIDEO_HEIGHT } })
            .then((stream: MediaStream) => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                    setIsCameraOn(true);
                    // Reset trạng thái khi bật camera
                    onHeartRateUpdate(null);
                    onEmotionUpdate('Đang phân tích...');
                    onHeartRateBufferUpdate([]); // Xóa buffer cũ
                }
            })
            .catch((err) => {
                console.error('Lỗi khi truy cập camera: ', err);
                setLoadingText('Không thể truy cập camera. Vui lòng cấp quyền.');
            });
    };

    const stopVideo = () => {
        const video = videoRef.current;
        if (video && video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            video.srcObject = null;
            setIsCameraOn(false);
            if (canvasRef.current) {
                const context = canvasRef.current.getContext('2d');
                context?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = null;
            }
            // Reset dữ liệu khi tắt camera
            onHeartRateUpdate(null);
            onEmotionUpdate('Đang phân tích...');
            onHeartRateBufferUpdate([]);
        }
    };

    // Vòng lặp chính để xử lý khung hình
    useEffect(() => {
        const processFrame = async () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const hiddenCanvas = hiddenCanvasRef.current;

            if (!video || !canvas || !hiddenCanvas || !modelsLoaded || video.paused || video.ended || video.readyState < 4) {
                return;
            }

            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
            const displaySize = { width: video.width, height: video.height };
            faceapi.matchDimensions(canvas, displaySize);
            faceapi.matchDimensions(hiddenCanvas, displaySize);
            const resizedDetections = faceapi.resizeResults(detections, displaySize);

            if (resizedDetections.length > 0) {
                const expressions = resizedDetections[0].expressions;
                const emotionKeys = Object.keys(expressions) as Array<keyof typeof expressions>;
                const topEmotion = emotionKeys.reduce((a, b) => expressions[a] > expressions[b] ? a : b);
                onEmotionUpdate(topEmotion); // <-- GỬI DỮ LIỆU CẢM XÚC LÊN CHA

                const now = Date.now();
                if (now - lastHeartRateTimestamp.current >= SAMPLING_INTERVAL_MS) {
                    const faceBox = resizedDetections[0].detection.box;
                    // Lấy vùng trán để đọc tín hiệu màu đỏ
                    const forehead = {
                        x: faceBox.x + faceBox.width * 0.3,
                        y: faceBox.y + faceBox.height * 0.1,
                        width: faceBox.width * 0.4,
                        height: faceBox.height * 0.2
                    };
                    
                    const hiddenContext = hiddenCanvas.getContext('2d', { willReadFrequently: true });
                    if (hiddenContext) {
                        hiddenContext.drawImage(video, 0, 0, displaySize.width, displaySize.height);
                        const imageData = hiddenContext.getImageData(forehead.x, forehead.y, forehead.width, forehead.height);
                        
                        let avgRed = 0;
                        for (let i = 0; i < imageData.data.length; i += 4) {
                            avgRed += imageData.data[i]; // Kênh màu đỏ
                        }
                        avgRed /= (imageData.data.length / 4);

                        const newBuffer = [...currentHeartRateBuffer, avgRed];
                        if (newBuffer.length > HEART_RATE_BUFFER_SIZE) {
                            newBuffer.shift(); // Giữ kích thước buffer cố định
                        }
                        onHeartRateBufferUpdate(newBuffer); // <-- GỬI BUFFER MỚI LÊN CHA

                        if (newBuffer.length === HEART_RATE_BUFFER_SIZE) {
                            const sampleRate = 1000 / SAMPLING_INTERVAL_MS; // Tần số lấy mẫu (Hz)
                            const bpm = calculateBPM_FFT(newBuffer, sampleRate);
                            if (bpm) {
                                onHeartRateUpdate(bpm); // <-- GỬI BPM LÊN CHA
                            }
                        }
                    }
                    lastHeartRateTimestamp.current = now;
                }
            } else {
                onEmotionUpdate('Không phát hiện khuôn mặt'); // <-- CẬP NHẬT TRẠNG THÁI LÊN CHA
            }

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, displaySize.width, displaySize.height);
                faceapi.draw.drawDetections(canvas, resizedDetections);
                // Bạn có thể bỏ comment các dòng dưới nếu muốn vẽ thêm landmarks, expressions lên canvas
                // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                // faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
            }
        };

        if (isCameraOn && modelsLoaded) {
            intervalIdRef.current = setInterval(processFrame, DETECTION_INTERVAL);
        }
        return () => {
            if (intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
            }
        };
    }, [isCameraOn, modelsLoaded, onEmotionUpdate, onHeartRateUpdate, onHeartRateBufferUpdate, currentHeartRateBuffer]);

    const videoContainerStyle: CSSProperties = { position: 'relative', width: VIDEO_WIDTH, height: VIDEO_HEIGHT };

    return (
        <div className="relative w-full max-w-5xl p-4 rounded-lg flex flex-col items-center bg-black">
            <div className="w-full bg-black overflow-hidden rounded-lg shadow-lg" style={videoContainerStyle}>
                <video ref={videoRef} className="w-full h-full object-cover" width={VIDEO_WIDTH} height={VIDEO_HEIGHT} autoPlay muted playsInline />
                <canvas ref={canvasRef} className="absolute top-0 left-0"></canvas>
                <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} width={VIDEO_WIDTH} height={VIDEO_HEIGHT}></canvas>
                
                {!isCameraOn && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60">
                        <div className="text-center text-white p-4">
                            {!modelsLoaded ? (
                                <>
                                    <LoaderCircle className="mx-auto mb-4 animate-spin" size={48} />
                                    <p className="text-lg font-semibold">{loadingText}</p>
                                </>
                            ) : (
                                <>
                                    <CameraOff className="mx-auto mb-2" size={48} />
                                    <p className="text-lg font-semibold">Camera đang tắt</p>
                                    <p className="text-sm mt-2">Nhấn nút bên dưới để bắt đầu phân tích</p>
                                    <ArrowDown className="mx-auto mt-10 animate-bounce" size={24} />
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            <button
                onClick={isCameraOn ? stopVideo : startVideo}
                type="button"
                className="absolute bottom-6 right-1/2 cursor-pointer transform translate-x-1/2 px-6 py-3  text-white rounded-lg font-medium hover:bg-blue-600 transition disabled:bg-gray-400"
                disabled={!modelsLoaded}
            >
                {isCameraOn ? <CameraOff className="inline-block" size={40} /> : <Camera className="inline-block" size={40} /> }
            </button>
        </div>
    );
};

export default CameraView;