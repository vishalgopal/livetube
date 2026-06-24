# YouTube Content & Streaming Management Platform

## Product Requirements Document (PRD)

### Version 2.0

## Project Overview

Build a private VPS-hosted web application for managing multiple YouTube channels from a single dashboard.

Primary users are non-technical operators who should be able to upload content, manage playlists, schedule livestreams, generate metadata using AI, moderate comments, and monitor stream health without interacting with YouTube Studio, FFmpeg, terminals, or APIs.

The system will initially support two channels:

### Channel 1

Bhakti devotional content:

* Bhajans
* Mantras
* Naam Jaap
* Chalisa
* Live devotional streams

### Channel 2

RaagaX:

* Healing ragas
* Meditation music
* Sleep music
* Study music
* Ambient audio

The architecture must support unlimited channels in future.

---

# Core Product Goals

1. Centralized management of multiple YouTube channels.
2. Upload media directly to VPS storage.
3. Build reusable playlists.
4. Schedule livestreams.
5. Create stream presets.
6. Generate YouTube metadata using AI.
7. Moderate comments.
8. Monitor VPS and stream health.
9. Minimize operator effort.
10. Mobile and tablet friendly UI.

---

# Technology Stack

## Backend

- Next.js Route Handlers
- Server Actions

## Frontend

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui

## Infrastructure

* Ubuntu VPS
* Nginx
* SSL
* Redis
* MySQL
* FFmpeg

## Database:
- PostgreSQL 17
- Prisma ORM

## Storage:
- VPS Local Storage

## Streaming:
- FFmpeg

## Authentication:
- Better Auth

## AI:
- OpenAI API or openrouter

## Background Jobs:
- Trigger.dev

## Deployment:
- Ubuntu VPS
- Docker
- Nginx
---

# Main Modules

## Module 1: Channel Management

### Features

Add Channel

Store:

* Channel Name
* Channel ID
* Google OAuth Tokens
* Default Stream Key
* Default Upload Settings

Support:

* Connect Channel
* Disconnect Channel
* Reconnect Channel
* Token Refresh

### Acceptance Criteria

Operator can manage multiple channels from one dashboard.

---

# Module 2: Media Library

This is the heart of the application.

All files must be uploaded to VPS storage first.

Videos are NOT uploaded directly to YouTube.

### Supported Files

Video:

* mp4
* mov
* mkv

Images:

* jpg
* jpeg
* png
* webp

Audio:

* mp3
* wav
* flac

### Metadata

Store:

* Title
* Description
* Duration
* Size
* Resolution
* Thumbnail
* Tags
* Upload Date

### Folder Structure

Example:

Bhakti
├─ Vishnu
├─ Shiva
├─ Hanuman
├─ Radha Krishna

RaagaX
├─ Sleep
├─ Meditation
├─ Healing
├─ Study

### Features

* Upload
* Delete
* Rename
* Move Folder
* Search
* Filter
* Preview

### Acceptance Criteria

User can find any uploaded asset within seconds.

---

# Module 3: AI Template Library

Templates must be reusable and searchable.

### Template Fields

* Name
* Category
* Prompt
* Default Tags
* Default Hashtags
* CTA Text
* Description Structure

Examples:

Vishnu Mahamantra

Hanuman Chalisa

Shiv Naam Jaap

Healing Raga

Meditation Music

Sleep Music

### AI Generation Workflow

Input:

Topic:
"1008 Vishnu Mahamantra"

Template:
"Vishnu Mahamantra"

Generate:

* YouTube Title
* Description
* Tags
* Hashtags
* Pinned Comment

### Features

* Save Template
* Duplicate Template
* Search Template
* Favorite Template

Unlimited Templates

---

# Module 4: Video Publishing

### Upload to YouTube

Select:

* Channel
* Video
* Thumbnail
* Metadata

Publish Options:

* Publish Now
* Schedule
* Draft

### Fields

* Title
* Description
* Tags
* Category
* Privacy
* Thumbnail

### Statuses

* Draft
* Uploading
* Processing
* Published
* Failed

---

# Module 5: Playlist Management

### Features

Create Playlist

Add Videos

Reorder Videos

Duplicate Playlist

Archive Playlist

Search Playlist

### Playlist Types

Single Run

Loop

### Example

Morning Vishnu Playlist

Evening Hanuman Playlist

Night Shiv Playlist

Healing Sleep Playlist

---

# Module 6: Stream Presets

This replaces generic loop streaming.

### Preset Examples

Monday Morning

Monday Evening

Tuesday Night

Ekadashi Special

Sankashti Special

Mahashivratri

Janmashtami

Guru Purnima

### Preset Fields

* Name
* Channel
* Playlist
* Thumbnail
* Description Template
* Title Template
* Start Time
* End Time

### Workflow

Create Stream

Select Preset

Save

Done

---

# Module 7: Stream Scheduling

### Features

Schedule Stream

Edit Stream

Cancel Stream

Duplicate Stream

Recurring Stream

### Stream Status

* Scheduled
* Starting
* Live
* Completed
* Failed
* Cancelled

### Calendar Views

* Month
* Week
* Day

---

# Module 8: FFmpeg Streaming Engine

### Requirements

Run streams from VPS files.

Support:

* Single Video
* Playlist
* Scheduled Playlist

### Features

Start Stream

Stop Stream

Restart Stream

Auto Recovery

### Logging

Store:

* Start Time
* Stop Time
* Error Logs
* Bitrate
* Uptime

---

# Module 9: YouTube Comment Moderation

### Features

View Comments

Reply

Hide User

Delete Comment

Approve Comment

Filter:

* New
* Unanswered
* Spam

### Dashboard Metrics

Comments Today

Pending Replies

Hidden Users

---

# Module 10: Stream Health Dashboard

### Show

CPU Usage

RAM Usage

Disk Usage

Bandwidth Usage

Active FFmpeg Jobs

Bitrate

Dropped Frames

Current Video

Current Playlist

Uptime

### Alerts

Show dashboard notifications only.

No email.

No WhatsApp.

Version 1.

---

# Module 11: Content Reuse Assistant

When creating content:

System searches similar videos.

Example:

1008 Vishnu Mahamantra

Matches:

* Vishnu Mahamantra
* Vishnu Jaap Live
* Vishnu Mantra 2 Hours

Offer:

Use Existing Template

Use Existing Tags

Use Existing Description

---

# Database Entities

channels

media

folders

templates

youtube_uploads

playlists

playlist_items

stream_presets

streams

comments

notifications

system_logs

ffmpeg_logs

users

---

# User Roles

## Admin

Full Access

## Operator

No system settings

Can:

* Upload
* Schedule
* Stream
* Moderate Comments

---

# Dashboard Home

Show:

Upcoming Streams

Live Streams

Recent Uploads

Recent Comments

Server Health

Quick Actions

Channel Switcher

---

# Security

Encrypted OAuth Tokens

CSRF Protection

Role Based Access

Audit Logs

Secure File Upload Validation

Rate Limiting

---

# Phase 2 Features

YouTube Analytics

Revenue Dashboard

Subscriber Growth

Top Videos

AI Thumbnail Generation

Community Post Generation

Auto Publish Workflows

Multi-language Metadata Generation

Advanced Analytics

---

# Success Criteria

A non-technical user should be able to:

1. Upload media.
2. Generate metadata with AI.
3. Create playlists.
4. Schedule streams.
5. Publish videos.
6. Moderate comments.
7. Monitor stream health.

without opening YouTube Studio, SSH, FFmpeg, or terminal.
