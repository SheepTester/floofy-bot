CREATE TABLE IF NOT EXISTS "schema_migrations" (version varchar(128) primary key);
CREATE TABLE emoji_usage (
  guild_id text not null,
  emoji_id text not null,
  count integer not null,
  primary key (guild_id, emoji_id)
);
CREATE TABLE minecraft_track_channels (
  channel_id text not null,
  host text not null,
  port integer not null,
  start_time integer not null,
  primary key (channel_id)
);
CREATE TABLE poll_reactions_channels (
  channel_id text not null,
  primary key (channel_id)
);
CREATE TABLE mentions (
  channel_id text not null,
  -- ID of mentioned user/role, or `everyone`
  mentioned text not null,
  author text not null,
  content text not null,
  message_url text not null,
  is_role boolean not null,
  primary key (channel_id, mentioned)
);
CREATE TABLE ucpd_track_channels (
  channel_id text not null,
  primary key (channel_id)
);
CREATE TABLE ucpd_seen (
  file_name text not null,
  primary key (file_name)
);
CREATE TABLE wise_guy (
  guild_id text not null,
  last_time integer not null default 0,
  -- nullable
  last_channel_id text,
  last_message text not null default '',
  -- JSON array because I'm lazy
  replies text not null default '[]',
  -- nullable
  guild_frequency real,
  primary key (guild_id)
);
CREATE TABLE vote_lockdown_categories (
  guild_id text not null,
  category_id text not null,
  primary key (guild_id)
);
CREATE TABLE vote_lockdown_votes (
  guild_id text not null,
  user_id text not null,
  vote_time number not null,
  primary key (guild_id, user_id)
);
CREATE TABLE welcome_channels (
  guild_id text not null,
  channel_id text not null,
  message_content text not null,
  primary key (guild_id)
);
CREATE TABLE welcome_message_sent (
  guild_id text not null,
  user_id text not null,
  primary key (guild_id, user_id)
);
-- Dbmate schema migrations
INSERT INTO "schema_migrations" (version) VALUES
  ('20260617061831'),
  ('20260617062925'),
  ('20260617063210'),
  ('20260617063358'),
  ('20260617063613'),
  ('20260617063650'),
  ('20260617063802'),
  ('20260618064923'),
  ('20260618065034'),
  ('20260618065200'),
  ('20260618065416');
