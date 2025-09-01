import { BrowserRouter, Route, Routes as RouterRoutes } from "react-router-dom"
import FaceRecognition from "../pages/facetracking/FaceRecognition"
import Menu from "../components/menu/Menu"
import Footer from "../components/footer/Footer"
import HealthNews from "../pages/news/HealthNews"
import Contact from "../pages/contact/Contact"
import NotFound from "../pages/notfound/NotFound"


const AppRoutes: React.FC = () => {
    return (
        <BrowserRouter>
        <Menu />
            <RouterRoutes>
                <Route path="/" element={<FaceRecognition />} />
                <Route path="" element={<div>About</div>} />
                <Route path="/ai-chuan-doan" element={<FaceRecognition />} />
                <Route path="/news-health-facial" element={<HealthNews />} />
                <Route path="/contact-shuelder" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
            </RouterRoutes>

            <Footer />
        </BrowserRouter>
    )
}
export default AppRoutes