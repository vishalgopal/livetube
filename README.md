# LiveTube

LiveTube is a Next.js dashboard for managing YouTube uploads, comments, playlists, and FFmpeg-backed livestreams.

## Production Shape

For Coolify, deploy this repo as a Docker Compose stack using `docker-compose.coolify.yml`.

Use two containers from the same image:

- `web`: runs the Next.js app and applies Prisma migrations on startup
- `worker`: polls the database and owns FFmpeg stream execution

Both services must share the same `/app/storage` volume because:

- uploads are written by `web`
- playlists and FFmpeg temp files are consumed by `worker`
- stream logs are stored in the same local storage tree

## Coolify Deployment

1. Create a new Docker Compose application in Coolify.
2. Point it at this repository.
3. Set the compose file to `docker-compose.coolify.yml`.
4. Configure a persistent volume for the shared `app_storage` volume.
5. Set all required environment variables in Coolify.
6. Expose the `web` service through Coolify's proxy on port `3000`.
7. Leave the `worker` service internal only.

## Required Environment Variables

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `NEXT_PUBLIC_AUTH_URL`
- `BETTER_AUTH_TRUSTED_ORIGINS`
- `APP_ENCRYPTION_KEY`
- `ALLOW_PUBLIC_SIGNUP`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `YOUTUBE_OAUTH_REDIRECT_URI`
- `YOUTUBE_OAUTH_SCOPES`
- `STREAM_EXECUTION_MODE`
- `STREAM_RTMP_BASE_URL`
- `FFMPEG_PATH`

Optional:

- `OPENAI_API_KEY`
- `OPENROUTER_API_KEY`
- `OPENROUTER_BASE_URL`
- `OPENROUTER_MODEL`
- `STREAM_WORKER_POLL_MS`
- `STREAM_HEARTBEAT_STALE_MS`
- `STREAM_CLAIM_TIMEOUT_MS`

## Recommended Coolify Topology

- Use managed Postgres from Coolify or an external Postgres instance.
- Keep `ALLOW_PUBLIC_SIGNUP=false`.
- Run exactly one `worker` replica unless you intentionally add stronger distributed locking.
- Mount enough disk for `/app/storage` to hold uploads, playlists, and logs.

## Deployment Notes

- `web` runs `npx prisma migrate deploy` automatically when `RUN_MIGRATIONS=true`.
- `worker` does not serve HTTP traffic.
- FFmpeg and FFprobe are installed in the Docker image.
- Local filesystem storage works only if `web` and `worker` share the same Docker volume.
