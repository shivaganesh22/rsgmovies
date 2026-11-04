# RSG Movies - Moviebox Microservice

Dedicated standalone Django microservice for **Moviebox** deployed in the India region (`bom1` - Mumbai) on Vercel to unlock regional Indian movie suggestions and dubs (Telugu, Hindi, Tamil).

---

## Architecture & Region Targeting
- **Region**: Mumbai, India (`bom1` configured in `vercel.json`)
- **Domain**: `https://rsgmovies-moviebox.vercel.app`
- **Scope**: Contains only Moviebox API endpoints (`/react/moviebox/*`) and health probes (`/health/*`). All unrelated services (netmirror, ibomma, istream, torrents, TV backend) have been excluded.

---

## Endpoints Provided
| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/react/moviebox/home/` | GET | Fetches homepage curation (Indian suggestions) |
| `/react/moviebox/search/?query={q}` | GET | Searches movies and TV series |
| `/react/moviebox/detail/{id}/` | GET | Retrieves movie or TV show metadata |
| `/react/moviebox/episode/{id}/` | GET | Retrieves seasons and episodes |
| `/react/moviebox/streams/{id}/{s}/{e}/`| GET | Extracts decrypted playback streams & subtitles |
| `/health/live/` | GET | Liveness probe |
| `/health/ready/` | GET | Readiness probe |

---

## Deployment to Vercel
1. In Vercel dashboard or CLI, create a new project pointing to this directory / repository:
   ```bash
   vercel
   ```
2. In Project Settings > General:
   - Ensure Region is set to **Mumbai, India (bom1)** (also specified in `vercel.json`).
3. Set the Environment Variables (copy from `.env.example` or reuse the values from `rsgmovies-backend`):
   - `SECRET_KEY`
   - `DEBUG=False`
   - `ALLOWED_HOSTS=rsgmovies-moviebox.vercel.app,rsgmovies.vercel.app,localhost,127.0.0.1,.vercel.app`
   - `DATABASE_URL` (same Neon PostgreSQL connection string)
   - `CORS_ALLOWED_ORIGINS=https://rsgmovies.vercel.app,https://rsg-movies.vercel.app,http://localhost:3000,http://127.0.0.1:3000`
4. Deploy:
   ```bash
   vercel --prod
   ```
