-- migrate:up
create table ucpd_track_channels (
  channel_id text not null,
  primary key (channel_id)
);

-- migrate:down
drop table if exists ucpd_track_channels;
