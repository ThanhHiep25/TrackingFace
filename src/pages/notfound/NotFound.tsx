

const NotFound: React.FC = () => {
    return(
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-purple-500 to-yellow-500 text-white p-4">
           <img src="/error.png" alt="Error" />
            <p className="text-lg md:text-xl mb-8 text-center max-w-md">Rất tiếc, trang bạn đang tìm kiếm không tồn tại hoặc đang trong quá trình phát triển.</p>
            <a href="/home" className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg shadow-lg hover:bg-gray-200 transition duration-300">Quay về Trang Chủ</a>
        </div>
    )
}

export default NotFound;