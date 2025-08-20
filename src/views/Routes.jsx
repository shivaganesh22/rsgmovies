
import { BrowserRouter as Router,Navigate,Routes, Route  } from "react-router-dom";
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
import CodeLogin from "./CodeLogin";
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
import Player1 from "./files/Player1";
import GetShare from "./files/GetShare";
import SharePlayer from "./files/SharePlayer";
export const AllRoutes = () => {
 
  return (
    <div className="dark:bg-darkbg">
        <Routes>
            {/* <Route path="" element={<Navigate to="/allmovies" />} /> */}
            <Route path="" element={<Movierulz />} />
            <Route path="movie/:id" element={<MovierulzMovie />} />
            
            <Route path="movie/:id/:slug" element={<MovierulzMovie />} />
            <Route path="movierulz/special/:id/:slug" element={<Special />} />

            <Route path="allmovies" element={<AllMoviesPage />} />
            <Route path="allmovies/:id" element={<AllMoviesLinks />} />
            <Route path="allmovies/movies/:id" element={<AllMoviesMovie />} />
            <Route path="allmovies/tvshows/:id" element={<TVShows />} />
            <Route path="allmovies/episodes/:id" element={<Episodes />} />

            <Route path="ibomma" element={<IBomma />} />
            <Route path="ibomma/movie/" element={<IBommaMovie />} />

            <Route path="search" element={<Search />} />

            <Route path="tamilmv" element={<Tamilmv />} />
            <Route path="tamilmv/movie/" element={<TamilmvMovie />} />
            <Route path="doodplay" element={<Doodplay />} />

            <Route path="tv" element={<TV />} />
            
            <Route path="youtube" element={<Youtube />} />
            <Route path="login" element={<Login />} />
            <Route path="login/code" element={<CodeLogin />} />

            <Route path="files" element={<Files />} />
            <Route path="files/open/:id" element={<Openfolder />} />

            <Route path="share/:key" element={<GetShare />} />
            <Route path="player/share/:id/:key" element={<SharePlayer />} />

            <Route path="player/:mode/:id" element={<Player />} />
            <Route path="player1/:mode/:id" element={<Player1 />} />
            <Route path="contact" element={<Contact />} />


            <Route path="*" element={<PageNotFound />} />
           
        </Routes>
    </div>
  )
}
