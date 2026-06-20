-- migrate:up
create table emoji_usage (
  guild_id text not null,
  emoji_id text not null,
  count integer not null,
  primary key (guild_id, emoji_id)
);

-- migrate:down
drop table if exists emoji_usage;
