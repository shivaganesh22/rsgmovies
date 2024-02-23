import { Routes, Route } from "react-router-dom";
import { PageNotFound } from "./404";
import Movierulz from "./home/Movierulz";
import MovierulzMovie from "./home/MovierulzMovie";
import IBomma from "./ibomma/IBomma";


export const AllRoutes = () => {
 
  return (
    <div className="dark:bg-darkbg">
        <Routes>
            <Route path="" element={<Movierulz />} />
            <Route path="movierulz/movie" element={<MovierulzMovie />} />
            <Route path="files" element={<MovierulzMovie />} />
            <Route path="ibomma" element={<IBomma />} />
            <Route path="*" element={<PageNotFound />} />
           
        </Routes>
    </div>
  )
}
