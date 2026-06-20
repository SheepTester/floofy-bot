-- migrate:up
create table wise_guy (
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

-- migrate:down
drop table if exists wise_guy;
