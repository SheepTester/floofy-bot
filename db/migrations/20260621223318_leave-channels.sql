-- migrate:up
create table leave_channels (
  guild_id text not null,
  channel_id text not null,
  primary key (guild_id)
);

-- migrate:down
drop table if exists leave_channels;
