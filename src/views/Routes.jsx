import { Routes, Route } from "react-router-dom";
import { PageNotFound } from "./404";
import Movierulz from "./home/Movierulz";
import MovierulzMovie from "./home/MovierulzMovie";
import IBomma from "./ibomma/IBomma";
import IBommaMovie from "./ibomma/IBommaMovie";
import Doodplay from "./tamilmv/Doodplay";
import Tamilmv from "./tamilmv/Tamilmv";
import TamilmvMovie from "./tamilmv/TamilmvMovie";
import TV from "./tv/TV";


export const AllRoutes = () => {
 
  return (
    <div className="dark:bg-darkbg">
        <Routes>
            <Route path="" element={<Movierulz />} />
            <Route path="movierulz/movie" element={<MovierulzMovie />} />
            <Route path="files" element={<MovierulzMovie />} />
            <Route path="ibomma" element={<IBomma />} />
            <Route path="ibomma/movie" element={<IBommaMovie />} />
            <Route path="tamilmv" element={<Tamilmv />} />
            <Route path="tamilmv/movie" element={<TamilmvMovie />} />
            <Route path="doodplay" element={<Doodplay />} />
            <Route path="tv" element={<TV />} />
            <Route path="*" element={<PageNotFound />} />
           
        </Routes>
    </div>
  )
}
