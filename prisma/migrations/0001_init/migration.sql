-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('CONNECTED', 'DISCONNECTED', 'TOKEN_EXPIRED', 'ERROR');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('VIDEO', 'AUDIO', 'IMAGE');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('READY', 'PROCESSING', 'ARCHIVED', 'FAILED', 'DELETED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('DEVOTIONAL', 'MEDITATION', 'HEALING', 'SLEEP', 'STUDY', 'AMBIENT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('DRAFT', 'QUEUED', 'UPLOADING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlaylistType" AS ENUM ('SINGLE_RUN', 'LOOP');

-- CreateEnum
CREATE TYPE "PlaylistStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StreamStatus" AS ENUM ('SCHEDULED', 'STARTING', 'LIVE', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationLevel" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('UNREAD', 'READ', 'DISMISSED');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('NEW', 'UNANSWERED', 'REPLIED', 'APPROVED', 'HIDDEN', 'DELETED', 'SPAM');

-- CreateEnum
CREATE TYPE "SystemLogLevel" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "passwordHash" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "youtubeChannelId" TEXT NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "defaultStreamKey" TEXT,
    "defaultPrivacy" TEXT,
    "defaultCategoryId" TEXT,
    "defaultTags" TEXT[],
    "uploadSettings" JSONB,
    "oauthAccessToken" TEXT,
    "oauthRefreshToken" TEXT,
    "oauthScope" TEXT,
    "oauthTokenExpiresAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "folderId" TEXT,
    "type" "MediaType" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'READY',
    "title" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT,
    "extension" TEXT,
    "sizeBytes" BIGINT NOT NULL,
    "durationSeconds" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "checksumSha256" TEXT,
    "thumbnailPath" TEXT,
    "description" TEXT,
    "tags" TEXT[],
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "channelId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL DEFAULT 'CUSTOM',
    "prompt" TEXT NOT NULL,
    "descriptionStructure" TEXT,
    "ctaText" TEXT,
    "defaultTags" TEXT[],
    "defaultHashtags" TEXT[],
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "youtube_uploads" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "templateId" TEXT,
    "createdById" TEXT,
    "youtubeVideoId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[],
    "hashtags" TEXT[],
    "pinnedComment" TEXT,
    "thumbnailMediaId" TEXT,
    "privacy" TEXT NOT NULL,
    "categoryId" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "status" "UploadStatus" NOT NULL DEFAULT 'DRAFT',
    "failureReason" TEXT,
    "metadataSource" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "youtube_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlists" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "type" "PlaylistType" NOT NULL DEFAULT 'SINGLE_RUN',
    "status" "PlaylistStatus" NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "playlist_items" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "mediaId" TEXT,
    "youtubeUploadId" TEXT,
    "position" INTEGER NOT NULL,
    "startOffsetSec" INTEGER,
    "endOffsetSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "playlist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stream_presets" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "playlistId" TEXT,
    "templateId" TEXT,
    "thumbnailMediaId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "titleTemplate" TEXT,
    "descriptionTemplate" TEXT,
    "startTimeLocal" TEXT,
    "endTimeLocal" TEXT,
    "recurrenceRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stream_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "playlistId" TEXT,
    "presetId" TEXT,
    "createdById" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "youtubeBroadcastId" TEXT,
    "youtubeLiveStreamId" TEXT,
    "streamKeyOverride" TEXT,
    "scheduledStartAt" TIMESTAMP(3) NOT NULL,
    "scheduledEndAt" TIMESTAMP(3),
    "actualStartAt" TIMESTAMP(3),
    "actualEndAt" TIMESTAMP(3),
    "status" "StreamStatus" NOT NULL DEFAULT 'SCHEDULED',
    "ffmpegCommand" TEXT,
    "autoRecoveryEnabled" BOOLEAN NOT NULL DEFAULT true,
    "recurrenceRule" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "currentMediaId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "youtubeUploadId" TEXT,
    "externalCommentId" TEXT NOT NULL,
    "authorChannelId" TEXT,
    "authorDisplayName" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "repliedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "hiddenAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "status" "CommentStatus" NOT NULL DEFAULT 'NEW',
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "channelId" TEXT,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "level" "NotificationLevel" NOT NULL DEFAULT 'INFO',
    "status" "NotificationStatus" NOT NULL DEFAULT 'UNREAD',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "level" "SystemLogLevel" NOT NULL DEFAULT 'INFO',
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ffmpeg_logs" (
    "id" TEXT NOT NULL,
    "streamId" TEXT,
    "mediaId" TEXT,
    "eventType" TEXT NOT NULL,
    "command" TEXT,
    "message" TEXT NOT NULL,
    "errorDetails" TEXT,
    "bitrateKbps" INTEGER,
    "droppedFrames" INTEGER,
    "cpuUsagePercent" DOUBLE PRECISION,
    "memoryUsageMb" DOUBLE PRECISION,
    "uptimeSeconds" INTEGER,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ffmpeg_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "channels_slug_key" ON "channels"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "channels_youtubeChannelId_key" ON "channels"("youtubeChannelId");

-- CreateIndex
CREATE INDEX "channels_status_idx" ON "channels"("status");

-- CreateIndex
CREATE INDEX "folders_channelId_parentId_idx" ON "folders"("channelId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "folders_channelId_path_key" ON "folders"("channelId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "folders_channelId_parentId_slug_key" ON "folders"("channelId", "parentId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_storagePath_key" ON "media"("storagePath");

-- CreateIndex
CREATE INDEX "media_channelId_folderId_idx" ON "media"("channelId", "folderId");

-- CreateIndex
CREATE INDEX "media_type_status_idx" ON "media"("type", "status");

-- CreateIndex
CREATE INDEX "media_title_idx" ON "media"("title");

-- CreateIndex
CREATE INDEX "templates_category_isFavorite_idx" ON "templates"("category", "isFavorite");

-- CreateIndex
CREATE UNIQUE INDEX "templates_channelId_slug_key" ON "templates"("channelId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "youtube_uploads_youtubeVideoId_key" ON "youtube_uploads"("youtubeVideoId");

-- CreateIndex
CREATE INDEX "youtube_uploads_channelId_status_idx" ON "youtube_uploads"("channelId", "status");

-- CreateIndex
CREATE INDEX "youtube_uploads_scheduledFor_idx" ON "youtube_uploads"("scheduledFor");

-- CreateIndex
CREATE INDEX "playlists_channelId_status_idx" ON "playlists"("channelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "playlists_channelId_slug_key" ON "playlists"("channelId", "slug");

-- CreateIndex
CREATE INDEX "playlist_items_mediaId_idx" ON "playlist_items"("mediaId");

-- CreateIndex
CREATE INDEX "playlist_items_youtubeUploadId_idx" ON "playlist_items"("youtubeUploadId");

-- CreateIndex
CREATE UNIQUE INDEX "playlist_items_playlistId_position_key" ON "playlist_items"("playlistId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "stream_presets_channelId_slug_key" ON "stream_presets"("channelId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "streams_youtubeBroadcastId_key" ON "streams"("youtubeBroadcastId");

-- CreateIndex
CREATE UNIQUE INDEX "streams_youtubeLiveStreamId_key" ON "streams"("youtubeLiveStreamId");

-- CreateIndex
CREATE INDEX "streams_channelId_status_scheduledStartAt_idx" ON "streams"("channelId", "status", "scheduledStartAt");

-- CreateIndex
CREATE INDEX "streams_presetId_idx" ON "streams"("presetId");

-- CreateIndex
CREATE UNIQUE INDEX "comments_externalCommentId_key" ON "comments"("externalCommentId");

-- CreateIndex
CREATE INDEX "comments_channelId_status_idx" ON "comments"("channelId", "status");

-- CreateIndex
CREATE INDEX "comments_publishedAt_idx" ON "comments"("publishedAt");

-- CreateIndex
CREATE INDEX "notifications_userId_status_idx" ON "notifications"("userId", "status");

-- CreateIndex
CREATE INDEX "notifications_channelId_level_idx" ON "notifications"("channelId", "level");

-- CreateIndex
CREATE INDEX "system_logs_level_createdAt_idx" ON "system_logs"("level", "createdAt");

-- CreateIndex
CREATE INDEX "system_logs_entityType_entityId_idx" ON "system_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ffmpeg_logs_streamId_loggedAt_idx" ON "ffmpeg_logs"("streamId", "loggedAt");

-- CreateIndex
CREATE INDEX "ffmpeg_logs_eventType_loggedAt_idx" ON "ffmpeg_logs"("eventType", "loggedAt");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_uploads" ADD CONSTRAINT "youtube_uploads_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_uploads" ADD CONSTRAINT "youtube_uploads_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_uploads" ADD CONSTRAINT "youtube_uploads_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_uploads" ADD CONSTRAINT "youtube_uploads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "youtube_uploads" ADD CONSTRAINT "youtube_uploads_thumbnailMediaId_fkey" FOREIGN KEY ("thumbnailMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_youtubeUploadId_fkey" FOREIGN KEY ("youtubeUploadId") REFERENCES "youtube_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_presets" ADD CONSTRAINT "stream_presets_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_presets" ADD CONSTRAINT "stream_presets_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_presets" ADD CONSTRAINT "stream_presets_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stream_presets" ADD CONSTRAINT "stream_presets_thumbnailMediaId_fkey" FOREIGN KEY ("thumbnailMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "playlists"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "stream_presets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "streams" ADD CONSTRAINT "streams_currentMediaId_fkey" FOREIGN KEY ("currentMediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_youtubeUploadId_fkey" FOREIGN KEY ("youtubeUploadId") REFERENCES "youtube_uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_logs" ADD CONSTRAINT "system_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ffmpeg_logs" ADD CONSTRAINT "ffmpeg_logs_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "streams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ffmpeg_logs" ADD CONSTRAINT "ffmpeg_logs_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
