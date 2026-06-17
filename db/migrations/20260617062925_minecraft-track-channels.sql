-- migrate:up
create table minecraft_track_channels (
  channel_id text not null,
  host text not null,
  port integer not null,
  start_time_ms integer not null,
  primary key (channel_id)
);

-- migrate:down
drop table if exists minecraft_track_channels;
