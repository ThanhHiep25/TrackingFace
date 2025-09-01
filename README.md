# TrackingFace

Ứng dụng nhận diện và theo dõi khuôn mặt sử dụng React, Vite và các mô hình AI.

## Tính năng chính
- Nhận diện khuôn mặt từ camera
- Dự đoán tuổi, giới tính, biểu cảm khuôn mặt
- Theo dõi các điểm đặc trưng trên khuôn mặt
- Hiển thị dashboard sức khỏe: BMI, nhịp tim, tin tức sức khỏe

## Cấu trúc thư mục
```
public/models/         # Chứa các mô hình AI (face, age, gender, expression, landmark, v.v.)
src/components/        # Các component giao diện (menu, footer, ...)
src/pages/facetracking # Các trang nhận diện, dashboard, BMI, nhịp tim
src/routes/            # Định tuyến ứng dụng
```

## Cài đặt
```bash
npm install
```

## Chạy ứng dụng
```bash
npm run dev
```
Truy cập [http://localhost:5173](http://localhost:5173) để sử dụng ứng dụng.

## Yêu cầu
- Node.js >= 16
- Trình duyệt hỗ trợ WebRTC

## Tài nguyên
- Các mô hình AI được lưu trong `public/models/`
- Ảnh và gif demo trong `public/`

## Liên hệ
- Trang liên hệ: `/contact`
- Trang giới thiệu: `/about`

## License
MIT
