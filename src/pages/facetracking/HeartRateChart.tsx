
import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

interface HeartRateChartProps {
    heartRateBuffer: number[];
}

const HeartRateChart: React.FC<HeartRateChartProps> = ({ heartRateBuffer }) => {
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);

    // Khởi tạo biểu đồ khi component mount
    useEffect(() => {
        if (chartCanvasRef.current) {
            // Đảm bảo chỉ có một instance Chart.js
            if (chartRef.current) {
                chartRef.current.destroy();
            }
            chartRef.current = new Chart(chartCanvasRef.current, {
                type: 'line',
                data: {
                    labels: heartRateBuffer.map((_, i) => i), // Khởi tạo labels ban đầu
                    datasets: [{
                        label: 'Tín hiệu (Kênh đỏ)',
                        data: heartRateBuffer, // Dữ liệu ban đầu
                        borderColor: 'rgb(255, 99, 132)',
                        borderWidth: 1,
                        fill: false,
                        pointRadius: 0
                    }]
                },
                options: {
                    animation: false, // Tắt animation để cập nhật mượt mà hơn
                    scales: {
                        x: { display: false }, // Không hiển thị trục x
                        y: { display: true, beginAtZero: false } // Hiển thị trục y
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                boxWidth: 6, // Kích thước của legend box
                                padding: 10,
                            }
                        },
                    },
                    responsive: true,
                    maintainAspectRatio: false, // Cho phép biểu đồ thay đổi kích thước theo container
                }
            });
        }

        // Cleanup function: Hủy biểu đồ khi component unmount
        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
                chartRef.current = null;
            }
        };
    }, []); // Chạy một lần khi mount và khi unmount

    // Cập nhật dữ liệu biểu đồ mỗi khi heartRateBuffer thay đổi
    useEffect(() => {
        if (chartRef.current) {
            chartRef.current.data.labels = heartRateBuffer.map((_, i) => i);
            chartRef.current.data.datasets[0].data = heartRateBuffer;
            chartRef.current.update('none'); 
        }
    }, [heartRateBuffer]); // Chạy lại khi heartRateBuffer thay đổi

    return (
        <div className="w-full max-w-5xl p-4 bg-white rounded-lg shadow-md "> {/* Đặt chiều cao cố định cho container biểu đồ */}
            <h3 className="text-xl font-semibold mb-2 text-purple-700">Biểu đồ tín hiệu nhịp tim</h3>
            <div className="relative h-48 md:h-64"> {/* div bên trong để canvas tự điều chỉnh kích thước */}
                <canvas ref={chartCanvasRef}></canvas>
            </div>
            <p className='text-sm text-red-400 mt-2 italic'>* Lưu ý: Kết quả chỉ mang tính tham khảo và có thể không chính xác.</p>
            <p className='text-sm text-gray-500 mt-1 italic'>Để có dữ liệu chính xác, vui lòng sử dụng thiết bị y tế chuyên dụng.</p>
        </div>
    );
};

export default HeartRateChart;