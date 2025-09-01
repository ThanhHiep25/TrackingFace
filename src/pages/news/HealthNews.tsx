import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Định nghĩa các danh mục tin tức và từ khóa tương ứng
const CATEGORIES = {
    'Sức khỏe tổng quát': 'y tế',
    'Nha khoa': 'nha khoa',
    'Dinh dưỡng': 'dinh dưỡng',
    'Sức khỏe tinh thần': 'sức khỏe tinh thần',
    'Thế giới': 'y tế thế giới',
};

// Định nghĩa kiểu dữ liệu cho một bài viết
interface Article {
    id: string;
    title: string;
    description: string;
    url: string;
    urlToImage: string;
    publishedAt: Date;
}

// Hàm để lấy tin tức từ API dựa trên danh mục đã chọn
const fetchHealthNews = async (category: string): Promise<Article[]> => {
    const API_KEY = import.meta.env.VITE_NEWS_API_KEY;
    const API_URL = `https://newsapi.org/v2/everything?q=${encodeURIComponent(category)}&apiKey=${API_KEY}&language=vi&sortBy=publishedAt`;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        const data = await response.json();
        // Lọc các bài viết không có hình ảnh hoặc tiêu đề
        const filteredArticles = data.articles.filter((item: Article) => item.urlToImage && item.title && item.description);
        return filteredArticles.map((item: Article) => ({
            id: item.url, // Sử dụng URL làm ID để đảm bảo duy nhất
            title: item.title,
            description: item.description,
            url: item.url,
            urlToImage: item.urlToImage,
            publishedAt: new Date(item.publishedAt),
        }));
    } catch (error) {
        console.error("Lỗi khi lấy tin tức:", error);
        return [];
    }
};

const ARTICLES_PER_PAGE = 6; // Số bài viết mỗi trang

const HealthNews: React.FC = () => {
    const [articles, setArticles] = useState<Article[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('Sức khỏe tổng quát');
    const [currentPage, setCurrentPage] = useState<number>(1); // Biến trạng thái mới cho trang hiện tại

    useEffect(() => {
        setIsLoading(true);
        const query = CATEGORIES[selectedCategory as keyof typeof CATEGORIES];
        fetchHealthNews(query).then(data => {
            setArticles(data);
            setIsLoading(false);
            setCurrentPage(1); // Reset về trang 1 khi đổi danh mục
        });
    }, [selectedCategory]);

    // Tính toán các bài viết sẽ hiển thị trên trang hiện tại
    const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
    const currentArticles = articles.slice(startIndex, startIndex + ARTICLES_PER_PAGE);
    const totalPages = Math.ceil(articles.length / ARTICLES_PER_PAGE);

    // Xử lý chuyển trang
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prevPage => prevPage + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prevPage => prevPage - 1);
        }
    };
    
    // Xử lý khi click vào một bài viết
    const handleArticleClick = (url: string) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    // Giao diện hiển thị danh sách bài viết
    return (
        <div className="p-4 bg-white rounded-lg shadow-md mt-6 w-full max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-purple-700 mb-4">Tin Tức Y Tế</h2>
            <p className='text-gray-400 mb-4'>Cung cấp thông tin về tình hình mới nhất cho bạn</p>
            <div className="flex flex-wrap gap-2 mb-4">
                {Object.keys(CATEGORIES).map(category => (
                    <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`px-4 py-2 rounded-full font-medium transition-colors ${selectedCategory === category ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                    >
                        {category}
                    </button>
                ))}
            </div>
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <p className="text-gray-500">Đang tải tin tức...</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentArticles.map(article => (
                            <div
                                key={article.id}
                                className="border border-gray-200 rounded-lg overflow-hidden transition-transform duration-300 hover:scale-105 cursor-pointer"
                                onClick={() => handleArticleClick(article.url)} // Thay đổi tại đây
                            >
                                <img src={article.urlToImage} alt={article.title} className="w-full h-48 object-cover" />
                                <div className="p-4">
                                    <h3 className="text-lg font-semibold text-purple-600 line-clamp-2">{article.title}</h3>
                                    <p className="text-sm text-gray-600 mt-2">
                                        {article.publishedAt.toLocaleDateString('vi-VN')}
                                    </p>
                                    <p className="text-sm text-gray-600 mt-2 line-clamp-3">{article.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Thêm phần điều khiển phân trang */}
                    {totalPages > 1 && (
                        <div className="flex justify-center items-center gap-4 mt-8">
                            <button
                                onClick={handlePreviousPage}
                                disabled={currentPage === 1}
                                className={`p-2 rounded-full transition-colors ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-500 text-white hover:bg-purple-600'}`}
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <p className="text-lg font-semibold text-gray-700">Trang {currentPage} trên {totalPages}</p>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className={`p-2 rounded-full transition-colors ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-purple-500 text-white hover:bg-purple-600'}`}
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default HealthNews;