import { Routes, Route } from "react-router-dom";
import { PageNotFound } from "./404";
import Files from "./files/Files";
import Player from "./files/Player";
import Movierulz from "./home/Movierulz";
import MovierulzMovie from "./home/MovierulzMovie";
import IBomma from "./ibomma/IBomma";
import IBommaMovie from "./ibomma/IBommaMovie";
import Login from "./Login";
import Search from "./Search";
import Doodplay from "./tamilmv/Doodplay";
import Tamilmv from "./tamilmv/Tamilmv";
import TamilmvMovie from "./tamilmv/TamilmvMovie";
import TV from "./tv/TV";
import TVPlayer from "./tv/TVPlayer";
import Youtube from "./Youtube";


export const AllRoutes = () => {
 
  return (
    <div className="dark:bg-darkbg">
        <Routes>
            <Route path="" element={<Movierulz />} />
            <Route path="movierulz/movie" element={<MovierulzMovie />} />
            
            <Route path="ibomma" element={<IBomma />} />
            <Route path="ibomma/movie" element={<IBommaMovie />} />
            <Route path="search" element={<Search />} />
            <Route path="tamilmv" element={<Tamilmv />} />
            <Route path="tamilmv/movie" element={<TamilmvMovie />} />
            <Route path="doodplay" element={<Doodplay />} />
            <Route path="tv" element={<TV />} />
            <Route path="tv/player" element={<TVPlayer />} />
            <Route path="youtube" element={<Youtube />} />
            <Route path="login" element={<Login />} />

            <Route path="files" element={<Files />} />

            <Route path="player" element={<Player />} />


            <Route path="*" element={<PageNotFound />} />
           
        </Routes>
    </div>
  )
}
