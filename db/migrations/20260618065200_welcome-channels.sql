-- migrate:up
create table welcome_channels (
  guild_id text not null,
  channel_id text not null,
  message_content text not null,
  primary key (guild_id)
);

-- migrate:down
drop table if exists welcome_channels;
