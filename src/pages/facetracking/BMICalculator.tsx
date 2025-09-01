
import React, { useState, useEffect, useMemo } from 'react';


export interface BMIInfo {
    age: string;
    height: string;
    weight: string;
    bmi: string;
    classification: string;
}

interface BMICalculatorProps {
    onBmiChange: (info: BMIInfo) => void;
}

const BMICalculator: React.FC<BMICalculatorProps> = ({ onBmiChange }) => {
    const [age, setAge] = useState('');
    const [height, setHeight] = useState('');
    const [weight, setWeight] = useState('');

    const { bmi, classification } = useMemo(() => {
        const h = parseFloat(height);
        const w = parseFloat(weight);
        if (h > 0 && w > 0) {
            const heightInMeters = h / 100;
            const calculatedBmi = w / (heightInMeters * heightInMeters);
            let classText = '';
            if (calculatedBmi < 18.5) classText = 'Thiếu cân';
            else if (calculatedBmi < 25) classText = 'Bình thường';
            else if (calculatedBmi < 30) classText = 'Thừa cân';
            else classText = 'Béo phì';
            return { bmi: calculatedBmi.toFixed(2), classification: classText };
        }
        return { bmi: '', classification: '' };
    }, [height, weight]);

    useEffect(() => {
        onBmiChange({ age, height, weight, bmi, classification });
    }, [age, height, weight, bmi, classification, onBmiChange]);

    return (
        <div className="w-full max-w-5xl flex flex-col roboto-700 mt-6 p-4 bg-white rounded-lg shadow-md">
            <label className="text-xl font-semibold mb-2 text-purple-700">Chỉ số BMI</label>
            <p className='text-gray-600 font-normal text-sm  flex items-center gap-2'><strong>BMI &lt; 16</strong>: Gầy cấp độ III</p>
            <p className='text-gray-600 font-normal text-sm  flex items-center gap-2'><strong>16 &le; BMI &le; 17</strong>: Gầy cấp độ II</p>
            <p className='text-gray-600 font-normal text-sm  flex items-center gap-2'><strong>17 &lt; BMI &le; 18.5</strong>: Gầy cấp độ I</p>
            <p className='text-gray-600 font-normal text-sm  flex items-center gap-2'><strong>18.5 &lt; BMI &le; 25</strong>: Bình thường</p>
            <p className='text-gray-600 font-normal text-sm  flex items-center gap-2'><strong>25 &lt; BMI &le; 30</strong>: Thừa cân</p>
            <p className='text-gray-600 font-normal text-sm  flex items-center gap-2'><strong>30 &lt; BMI &le; 35</strong>: Béo phì cấp độ I</p>
            <p className='text-gray-600 font-normal text-sm  flex items-center gap-2'><strong>35 &lt; BMI &le; 40</strong>: Béo phì cấp độ II</p>
            <p className='text-gray-600 font-normal text-sm  flex items-center gap-2'><strong>BMI &gt; 40</strong>: Béo phì cấp độ III</p>
            <p className='text-gray-400 italic text-md font-normal mt-2'>Chỉ số BMI chỉ mang tính chất tham khảo và có thể không chính xác với mọi đối tượng.</p>
            <p className='text-gray-400 italic font-normal text-md'>Để có kết quả chính xác, vui lòng tham khảo ý kiến chuyên gia y tế.</p>
            <div className="flex items-center md:justify-between flex-col md:flex-row w-full gap-2">
                <div className="flex items-center mt-4 gap-2">
                    <label htmlFor="age">Tuổi</label>
                    <input type="number" id="age" value={age} onChange={e => setAge(e.target.value)} className="border border-gray-300 rounded-md p-2 w-32 text-center focus:outline-none" placeholder="20" />
                </div>
                <div className="flex items-center mt-6 gap-2">
                    <label htmlFor="height">Chiều cao (cm)</label>
                    <input type="number" id="height" value={height} onChange={e => setHeight(e.target.value)} className="border border-gray-300 rounded-md p-2 w-32 text-center focus:outline-none" placeholder="170" />
                </div>
                <div className="flex items-center mt-4 gap-2">
                    <label htmlFor="weight">Cân nặng (kg)</label>
                    <input type="number" id="weight" value={weight} onChange={e => setWeight(e.target.value)} className="border border-gray-300 rounded-md p-2 w-32 text-center focus:outline-none" placeholder="65" />
                </div>
                <div className="flex items-center mt-4 gap-2">
                    <label htmlFor="bmi">BMI</label>
                    <input type="text" id="bmi" value={bmi ? `${bmi} (${classification})` : ''} className="border border-gray-300 rounded-md p-2 w-48 text-center focus:outline-none bg-gray-100" placeholder="BMI" disabled />
                </div>
            </div>
        </div>
    );
};

export default BMICalculator;