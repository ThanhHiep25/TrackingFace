// src/components/Contact.tsx
import React, { useRef, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import emailjs from '@emailjs/browser';

const Contact: React.FC = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start end", "end start"],
    });

    const headingY = useTransform(scrollYProgress, [0, 1], ['-50%', '50%']);
    const headingOpacity = useTransform(scrollYProgress, [0, 0.5, 1], [0, 1, 0]);

    // Form input states
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
        date: '', // Thêm trường date
        time: '', // Thêm trường time
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Hàm kiểm tra ngày hợp lệ
    const isDateValid = (selectedDate: string): boolean => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const date = new Date(selectedDate);

        // Ngày không được là quá khứ
        if (date < today) {
            return false;
        }

        // Ngày không được quá 3 tuần
        const threeWeeksFromNow = new Date();
        threeWeeksFromNow.setDate(today.getDate() + 21);
        if (date > threeWeeksFromNow) {
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Kiểm tra ngày hẹn trước khi gửi
        if (!isDateValid(formData.date)) {
            setSubmitMessage("Please select a valid date within the next 3 weeks.");
            return;
        }

        setIsSubmitting(true);
        setSubmitMessage(null);

        const SERVICE_ID = import.meta.env.VITE_SERVICE_ID;
        const TEMPLATE_ID_TO_ME = import.meta.env.VITE_TEMPLATE_ID_TO_ME;
        const TEMPLATE_ID_TO_USER = import.meta.env.VITE_TEMPLATE_ID_TO_USER;
        const PUBLIC_KEY = import.meta.env.VITE_PUBLIC_KEY;

        // Dữ liệu sẽ gửi cho EmailJS
        const templateParams = {
            from_name: formData.name,
            from_email: formData.email,
            subject: formData.subject,
            message: `Message: ${formData.message}\n\nAppointment Date: ${formData.date}\nAppointment Time: ${formData.time}`, // Thêm thông tin hẹn
            appointment_date: formData.date, // Thêm cho template riêng
            appointment_time: formData.time, // Thêm cho template riêng
        };

        try {
            await emailjs.send(SERVICE_ID, TEMPLATE_ID_TO_ME, templateParams, PUBLIC_KEY);
            console.log('Email to owner sent successfully!');

            await emailjs.send(SERVICE_ID, TEMPLATE_ID_TO_USER, templateParams, PUBLIC_KEY);
            console.log('Thank you email to user sent successfully!');

            setSubmitMessage("Thank you for your message! I will get back to you soon.");
            setFormData({ name: '', email: '', subject: '', message: '', date: '', time: '' });
        } catch (error) {
            console.error('Failed to send email:', error);
            setSubmitMessage("Failed to send message. Please try again later.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Animation variants (giữ nguyên)
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
    };

    const buttonVariants = {
        hover: { scale: 1.05, boxShadow: "0px 0px 12px rgba(255, 255, 255, 0.5)" },
        tap: { scale: 0.95 },
    };

    return (
        <div ref={containerRef} className="relative min-h-screen bg-gradient-to-br from-purple-500 to-black overflow-hidden text-white">
            <div className="absolute inset-0 z-0 opacity-20">
                <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1510519138101-570d1dca3d6b?q=80&w=2938&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D")' }}></div>
                <div className="absolute inset-0 bg-black/50"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center p-4 min-h-screen">
                <motion.div
                    className="text-center mb-16 relative z-20"
                    initial="hidden"
                    animate="visible"
                    variants={containerVariants}
                >
                    <motion.h1
                        className="text-5xl md:text-6xl mt-5 font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-pink-400 to-purple-500 drop-shadow-lg"
                        style={{ y: headingY, opacity: headingOpacity }}
                    >
                        Liên hệ và Đặt lịch hẹn ngay hôm nay
                    </motion.h1>
                    <motion.p
                        className="mt-4 text-lg md:text-xl text-gray-300 max-w-2xl mx-auto"
                        variants={itemVariants}
                    >
                        Liên hệ với chúng tôi để thảo luận về tình trạng bệnh hoặc có thể sử dụng dịch vụ. Tôi rất mong được nghe từ bạn!
                    </motion.p>
                </motion.div>

                <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 bg-gray-800/70 backdrop-blur-md rounded-xl p-8 md:p-12 shadow-2xl relative z-20 border border-gray-700 mb-40">
                    <motion.div
                        className="lg:pr-8"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                        variants={containerVariants}
                    >
                        <motion.h2 className="text-xl md:text-2xl font-bold mb-8 text-white bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-teal-400">
                            Gửi thông tin lịch hẹn
                        </motion.h2>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <motion.div variants={itemVariants}>
                                <label htmlFor="name" className="block text-gray-300 text-sm font-semibold mb-2">Tên liên hệ</label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="John Doe"
                                    required
                                />
                            </motion.div>
                            <motion.div variants={itemVariants}>
                                <label htmlFor="email" className="block text-gray-300 text-sm font-semibold mb-2">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="your@example.com"
                                    required
                                />
                            </motion.div>
                            <motion.div variants={itemVariants}>
                                <label htmlFor="subject" className="block text-gray-300 text-sm font-semibold mb-2">Tiêu đề liên hệ hoặc bệnh lý cần giải đáp</label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="Đặt lịch hẹn khám bệnh"
                                />
                            </motion.div>
                            {/* Thêm trường chọn ngày và giờ */}
                            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="date" className="block text-gray-300 text-sm font-semibold mb-2">Ngày liên hệ</label>
                                    <input
                                        type="date"
                                        id="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        required
                                    />
                                </div>
                                <div>
                                    <label htmlFor="time" className="block text-gray-300 text-sm font-semibold mb-2">Giờ liên hệ</label>
                                    <input
                                        type="time"
                                        id="time"
                                        name="time"
                                        value={formData.time || window.navigator.language === 'en-US' ? formData.time : formData.time} 
                                        onChange={handleChange}
                                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        required
                                    />
                                </div>
                            </motion.div>
                            <motion.div variants={itemVariants}>
                                <label htmlFor="message" className="block text-gray-300 text-sm font-semibold mb-2">Thông tin chi tiết về lịch hẹn</label>

                                <p className='text-gray-400 text-sm'>Hãy cung cấp cho chúng tôi các thông tin sau nếu bạn có thể nhé :</p>
                                <div className="leading-7 m-2">
                                    <p className='text-gray-400 text-sm'>(1) Giờ giấc và thói quen của bạn.</p>
                                    <p className='text-gray-400 text-sm'>(2) Tình trạng bệnh lý của bạn hiện tại.</p>
                                    <p className='text-gray-400 text-sm'>(3) Các triệu chứng bạn đang gặp phải.</p>
                                    <p className='text-gray-400 text-sm'>(4) Mục tiêu sức khỏe bạn muốn đạt được.</p>
                                    <p className='text-gray-400 text-sm'>(5) Các bài giải pháp bệnh lý cần giải đáp.</p>
                                </div>

                                <p className='text-orange-500 text-sm mb-4'>Các hồ sơ & hình ảnh về thăm khám về tình trạng bệnh vui lòng bổ sung thêm với chúng tôi qua Email hoặc Zalo.</p>
                                <textarea
                                    id="message"
                                    name="message"
                                    rows={5}
                                    value={formData.message}
                                    onChange={handleChange}
                                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y transition-all"
                                    placeholder="Tình trạng bệnh lý, triệu chứng, thói quen sinh hoạt, mục tiêu sức khỏe..."
                                    required
                                ></textarea>
                            </motion.div>
                            {submitMessage && (
                                <motion.p
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`text-center font-semibold text-lg ${submitMessage.includes("Thank you") ? "text-green-400" : "text-red-400"}`}
                                >
                                    {submitMessage}
                                </motion.p>
                            )}
                            <motion.button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md text-lg shadow-xl flex items-center justify-center gap-2
                                         transform transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                                variants={buttonVariants}
                                whileHover="hover"
                                whileTap="tap"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-xl">🚀</span> Send Message
                                    </>
                                )}
                            </motion.button>
                        </form>
                    </motion.div>

                    {/* Right Side: Contact Info & Unique Element */}
                    <motion.div
                        className="lg:pl-8 flex flex-col justify-between"
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                        variants={containerVariants}
                    >
                        <motion.h2 className="text-lg md:text-2xl font-bold mb-8 text-white bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-red-500">
                            Tiếp cận trực tiếp với chúng tôi.
                        </motion.h2>

                        <div className="space-y-6 text-lg text-gray-300">
                            <motion.div variants={itemVariants} className="flex items-center gap-4">
                                <span className="text-blue-400 text-xl">📧</span>
                                <div>
                                    <p className="font-semibold text-white">Email:</p>
                                    <a href="mailto:hiepnh2002gmail.com" className="hover:text-blue-300 transition-colors">healthyface@sq.com</a>
                                </div>
                            </motion.div>
                            <motion.div variants={itemVariants} className="flex items-center gap-4">
                                <span className="text-purple-400 text-xl">📞</span>
                                <div>
                                    <p className="font-semibold text-white">Phone:</p>
                                    <a href="tel:+84123456789" className="hover:text-purple-300 transition-colors">+84 123 456 789</a>
                                </div>
                            </motion.div>
                            <motion.div variants={itemVariants} className="flex items-center gap-4">

                                <div className="w-full">

                                    <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d29793.98045414335!2d105.81632115628487!3d21.022778414123437!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab9bd9861ca1%3A0xe7887f7b72ca17a9!2zSMOgIE7hu5lpLCBWaeG7h3QgTmFt!5e0!3m2!1svi!2s!4v1756731780805!5m2!1svi!2s"
                                        className='w-full h-[300px] rounded-lg border-2 border-gray-600' allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                                    >

                                    </iframe>
                                </div>
                            </motion.div>
                        </div>

                        <motion.div
                            className="mt-12 p-8 bg-gray-700/60 rounded-lg text-center shadow-lg border border-gray-600 relative overflow-hidden"
                            variants={itemVariants}
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/5 animate-pulse-slow"></div>
                            <h3 className="text-2xl font-bold text-yellow-300 mb-4 relative z-10">
                                The Digital Echo
                            </h3>
                            <p className="text-gray-300 relative z-10">
                                Your message doesn't just go to an inbox; it resonates through the digital cosmos,
                                leaving a unique echo. Let's create something that truly stands out.
                            </p>
                            <motion.div
                                className="absolute -bottom-8 -right-8 text-8xl opacity-10 rotate-45"
                                animate={{ rotate: [0, 10, 0], scale: [1, 1.05, 1] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                            >
                                🌌
                            </motion.div>
                        </motion.div>

                        <motion.div
                            className="mt-12 text-center"
                            initial="hidden"
                            whileInView="visible"
                            variants={containerVariants}
                            viewport={{ once: true, amount: 0.2 }}
                        >
                            <h3 className="md:text-xl text-lg font-bold text-white mb-6">Trực tiếp trên mạng xã hội</h3>
                            <div className="flex justify-center space-x-8">
                                <motion.a
                                    href="https://linkedin.com/in/yourprofile" target="_blank" rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-blue-500 transition-colors"
                                    variants={itemVariants}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-linkedin"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>
                                </motion.a>
                                <motion.a
                                    href="https://zalo.com/yourprofile" target="_blank" rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-purple-500 transition-colors relative"
                                    variants={itemVariants}
                                >
                                    <div className="h-14 w-14 bg-white rounded-2xl">
                                        <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-bold text-blue-800">Zalo</p>
                                    </div>

                                </motion.a>
                                <motion.a
                                    href="https://facebook.com/yourprofile" target="_blank" rel="noopener noreferrer"
                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                    variants={itemVariants}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-facebook"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                                </motion.a>
                            </div>
                        </motion.div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default Contact;