import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';

// Legal / Documentation Views (named safely to prevent adblock heuristic interference)
import AppPrivacyDoc from './views/docs/AppPrivacyDoc';
import AppTermsDoc from './views/docs/AppTermsDoc';
const Login = lazy(() => import('./views/auth/Login'));
const TVLoginApprovePage = lazy(() => import('./views/auth/TVLoginApprovePage'));

// Media Discovery & Streaming
const Home = lazy(() => import('./views/home/Home'));
const MoviesPage = lazy(() => import('./views/movies/MoviesPage'));
const MovieDetails = lazy(() => import('./views/movies/MovieDetails'));
const SeriesPage = lazy(() => import('./views/series/SeriesPage'));
const SeriesDetails = lazy(() => import('./views/series/SeriesDetails'));
const ViewAllPage = lazy(() => import('./views/blast/ViewAllPage'));

// iStreamFlare
const IStreamHome = lazy(() => import('./views/istream/IStreamHome'));
const IStreamMovieDetails = lazy(() => import('./views/istream/IStreamMovieDetails'));
const IStreamSeriesDetails = lazy(() => import('./views/istream/IStreamSeriesDetails'));
const IStreamViewAll = lazy(() => import('./views/istream/IStreamViewAll'));

// Seedr Cloud Files
const FilesPage = lazy(() => import('./views/files/FilesPage'));
const OpenFolderPage = lazy(() => import('./views/files/OpenFolderPage'));
const PlayerPage = lazy(() => import('./views/files/PlayerPage'));

// Live TV, Search & Scrapers
const LiveTVPage = lazy(() => import('./views/livetv/LiveTVPage'));
const SearchPage = lazy(() => import('./views/search/SearchPage'));
const TorrentSearchPage = lazy(() => import('./views/torrents/TorrentSearchPage'));
const MovierulzPage = lazy(() => import('./views/movierulz/MovierulzPage'));
const MovierulzDetail = lazy(() => import('./views/movierulz/MovierulzDetail'));
const MovierulzSpecialPage = lazy(() => import('./views/movierulz/MovierulzSpecialPage'));
const TamilmvPage = lazy(() => import('./views/tamilmv/TamilmvPage'));
const TamilmvDetail = lazy(() => import('./views/tamilmv/TamilmvDetail'));
const AllMoviesPage = lazy(() => import('./views/allmovies/AllMoviesPage'));
const AllMoviesDetail = lazy(() => import('./views/allmovies/AllMoviesDetail'));
const IBommaPage = lazy(() => import('./views/ibomma/IBommaPage'));
const IBommaDetail = lazy(() => import('./views/ibomma/IBommaDetail'));

// Utilities & Admin
const YoutubeDownloader = lazy(() => import('./views/youtube/YoutubeDownloader'));
const YtMateDownloader = lazy(() => import('./views/youtube/YtMateDownloader'));
const ContactPage = lazy(() => import('./views/contact/ContactPage'));
const AdminDashboard = lazy(() => import('./views/admin/AdminDashboard'));
const PageNotFound = lazy(() => import('./views/PageNotFound'));

// Route Suspense Fallback Loader
const PageLoader = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Standalone Route without Header/Layout */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<PageLoader />}>
            <Login />
          </Suspense>
        }
      />

      {/* Main App Layout Route (Persistently mounts Navbar, Footer & Layout across all internal routes) */}
      <Route element={<Layout />}>
        {/* Public & Legal Pages */}
        <Route
          path="/tv-login"
          element={
            <Suspense fallback={<PageLoader />}>
              <TVLoginApprovePage />
            </Suspense>
          }
        />
        <Route path="/privacy" element={<AppPrivacyDoc />} />
        <Route path="/privacy-policy" element={<AppPrivacyDoc />} />
        <Route path="/legal/privacy" element={<AppPrivacyDoc />} />
        <Route path="/terms" element={<AppTermsDoc />} />
        <Route path="/terms-and-conditions" element={<AppTermsDoc />} />
        <Route path="/legal/terms" element={<AppTermsDoc />} />

        {/* Protected Application Routes */}
        <Route element={<ProtectedRoute />}>
          <Route
            path="/"
            element={
              <Suspense fallback={<PageLoader />}>
                <Home />
              </Suspense>
            }
          />
          <Route
            path="/movies"
            element={
              <Suspense fallback={<PageLoader />}>
                <MoviesPage />
              </Suspense>
            }
          />
          <Route
            path="/movies/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <MovieDetails />
              </Suspense>
            }
          />
          <Route
            path="/series"
            element={
              <Suspense fallback={<PageLoader />}>
                <SeriesPage />
              </Suspense>
            }
          />
          <Route
            path="/series/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <SeriesDetails />
              </Suspense>
            }
          />
          <Route
            path="/blast/viewall/:category"
            element={
              <Suspense fallback={<PageLoader />}>
                <ViewAllPage />
              </Suspense>
            }
          />

          {/* iStreamFlare Routes */}
          <Route
            path="/istream"
            element={
              <Suspense fallback={<PageLoader />}>
                <IStreamHome />
              </Suspense>
            }
          />
          <Route
            path="/istream/movie/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <IStreamMovieDetails />
              </Suspense>
            }
          />
          <Route
            path="/istream/series/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <IStreamSeriesDetails />
              </Suspense>
            }
          />
          <Route
            path="/istream/viewall/:category"
            element={
              <Suspense fallback={<PageLoader />}>
                <IStreamViewAll />
              </Suspense>
            }
          />
          <Route
            path="/istream/network/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <IStreamViewAll />
              </Suspense>
            }
          />
          <Route
            path="/istream/genre/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <IStreamViewAll />
              </Suspense>
            }
          />

          {/* Seedr Cloud Storage */}
          <Route
            path="/files"
            element={
              <Suspense fallback={<PageLoader />}>
                <FilesPage />
              </Suspense>
            }
          />
          <Route
            path="/files/open/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <OpenFolderPage />
              </Suspense>
            }
          />
          <Route
            path="/player/:mode/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <PlayerPage />
              </Suspense>
            }
          />

          {/* Unified Search */}
          <Route
            path="/search"
            element={
              <Suspense fallback={<PageLoader />}>
                <SearchPage />
              </Suspense>
            }
          />

          {/* Live TV Channels */}
          <Route
            path="/livetv"
            element={
              <Suspense fallback={<PageLoader />}>
                <LiveTVPage />
              </Suspense>
            }
          />

          {/* Third-Party Stream Scrapers & Torrent Search */}
          <Route
            path="/torrents"
            element={
              <Suspense fallback={<PageLoader />}>
                <TorrentSearchPage />
              </Suspense>
            }
          />
          <Route
            path="/movierulz"
            element={
              <Suspense fallback={<PageLoader />}>
                <MovierulzPage />
              </Suspense>
            }
          />
          <Route
            path="/movierulz/movie/:slug"
            element={
              <Suspense fallback={<PageLoader />}>
                <MovierulzDetail />
              </Suspense>
            }
          />
          <Route
            path="/movierulz/movie/:id/:slug"
            element={
              <Suspense fallback={<PageLoader />}>
                <MovierulzDetail />
              </Suspense>
            }
          />
          <Route
            path="/movierulz/movie/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <MovierulzDetail />
              </Suspense>
            }
          />
          <Route
            path="/movierulz/movie"
            element={
              <Suspense fallback={<PageLoader />}>
                <MovierulzDetail />
              </Suspense>
            }
          />
          <Route
            path="/movierulz/special/*"
            element={
              <Suspense fallback={<PageLoader />}>
                <MovierulzSpecialPage />
              </Suspense>
            }
          />
          <Route
            path="/movierulz/special"
            element={
              <Suspense fallback={<PageLoader />}>
                <MovierulzSpecialPage />
              </Suspense>
            }
          />

          <Route
            path="/tamilmv"
            element={
              <Suspense fallback={<PageLoader />}>
                <TamilmvPage />
              </Suspense>
            }
          />
          <Route
            path="/tamilmv/movie"
            element={
              <Suspense fallback={<PageLoader />}>
                <TamilmvDetail />
              </Suspense>
            }
          />

          <Route
            path="/allmovies"
            element={
              <Suspense fallback={<PageLoader />}>
                <AllMoviesPage />
              </Suspense>
            }
          />
          <Route
            path="/allmovies/movies/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <AllMoviesDetail />
              </Suspense>
            }
          />
          <Route
            path="/allmovies/tvshows/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <AllMoviesDetail />
              </Suspense>
            }
          />
          <Route
            path="/allmovies/episodes/:id"
            element={
              <Suspense fallback={<PageLoader />}>
                <AllMoviesDetail />
              </Suspense>
            }
          />

          <Route
            path="/ibomma"
            element={
              <Suspense fallback={<PageLoader />}>
                <IBommaPage />
              </Suspense>
            }
          />
          <Route
            path="/ibomma/movie"
            element={
              <Suspense fallback={<PageLoader />}>
                <IBommaDetail />
              </Suspense>
            }
          />

          {/* Downloader & Contact */}
          <Route
            path="/youtube"
            element={
              <Suspense fallback={<PageLoader />}>
                <YoutubeDownloader />
              </Suspense>
            }
          />
          <Route
            path="/ytmate"
            element={
              <Suspense fallback={<PageLoader />}>
                <YtMateDownloader />
              </Suspense>
            }
          />
          <Route
            path="/contact"
            element={
              <Suspense fallback={<PageLoader />}>
                <ContactPage />
              </Suspense>
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin={true}>
                <Suspense fallback={<PageLoader />}>
                  <AdminDashboard />
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* 404 Catch-All within Layout */}
        <Route
          path="*"
          element={
            <Suspense fallback={<PageLoader />}>
              <PageNotFound />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
