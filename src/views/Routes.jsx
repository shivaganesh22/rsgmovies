import { Routes, Route } from "react-router-dom";
import { PageNotFound } from "./404";
import Contact from "./Contact";
import Files from "./files/Files";
import Openfolder from "./files/Openfolder";
import Player from "./files/Player";
import Movierulz from "./home/Movierulz";
import MovierulzMovie from "./home/MovierulzMovie";
import Special from "./home/Special";
import IBomma from "./ibomma/IBomma";
import IBommaMovie from "./ibomma/IBommaMovie";
import Login from "./Login";
import Search from "./Search";
import Doodplay from "./tamilmv/Doodplay";
import Tamilmv from "./tamilmv/Tamilmv";
import TamilmvMovie from "./tamilmv/TamilmvMovie";
import TV from "./tv/TV";
import Youtube from "./Youtube";
import Y2Mate from "./y2mate";
import AllMoviesPage from "./allmovies/allMoviesPage";
import AllMoviesLinks from "./allmovies/allMoviesLinks";
import AllMoviesMovie from "./allmovies/allMoviesMovie";
import TVShows from "./allmovies/TVShows";
import Episodes from "./allmovies/Episodes";
export const AllRoutes = () => {
 
  return (
    <div className="dark:bg-darkbg">
        <Routes>
            <Route path="movierulz" element={<Movierulz />} />
            <Route path="movierulz/movie/:id" element={<MovierulzMovie />} />
            <Route path="movierulz/special" element={<Special />} />

            <Route path="" element={<AllMoviesPage />} />
            <Route path="/:id" element={<AllMoviesLinks />} />
            <Route path="/movies/:id" element={<AllMoviesMovie />} />
            <Route path="/tvshows/:id" element={<TVShows />} />
            <Route path="/episodes/:id" element={<Episodes />} />

            <Route path="ibomma" element={<IBomma />} />
            <Route path="ibomma/movie/" element={<IBommaMovie />} />

            <Route path="search" element={<Search />} />

            <Route path="tamilmv" element={<Tamilmv />} />
            <Route path="tamilmv/movie/" element={<TamilmvMovie />} />
            <Route path="doodplay" element={<Doodplay />} />

            <Route path="tv" element={<TV />} />
            
            <Route path="youtube" element={<Youtube />} />
            <Route path="login" element={<Login />} />

            <Route path="files" element={<Files />} />
            <Route path="files/open/:id" element={<Openfolder />} />

            <Route path="player" element={<Player />} />
            <Route path="contact" element={<Contact />} />


            <Route path="*" element={<PageNotFound />} />
           
        </Routes>
    </div>
  )
}
